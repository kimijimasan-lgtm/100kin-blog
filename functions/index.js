// 100均アプリ — 一斉メール送信 Cloud Function
//
// 管理画面(admin/mail-send.html)から Callable で呼び出され、SendGrid 経由で送信する。
//
// 宛先：
//   - test=true  … 管理者自身のみ（動作確認用）
//   - test=false … waitlist コレクションの全登録者（重複除去）
//
// 送信元 kimijimasan@gmail.com は SendGrid の Single Sender Verification で認証済み。
// APIキーは Secret Manager (SENDGRID_API_KEY) で管理し、コードには含めない。
//
// テスト送信の宛先は管理者個人ではなく専用窓口 apps100kin@gmail.com（TEST_RECIPIENT_EMAIL）。
// 管理者ログイン認可（ADMIN_EMAIL）とは別軸なので変更時は混同しないこと。

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const sgMail = require("@sendgrid/mail");

const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

// SendGrid の Single Sender で認証した送信元（＝管理者アドレス）
const FROM_EMAIL = "kimijimasan@gmail.com";
const FROM_NAME = "100均アプリ";
// この関数を実行できる唯一の管理者（Firestoreルールの isAdmin と同一）
const ADMIN_EMAIL = "kimijimasan@gmail.com";
// テスト送信（test=true）の宛先
const TEST_RECIPIENT_EMAIL = "apps100kin@gmail.com";

initializeApp();
const db = getFirestore();

// ── crossmemo（howto-v2 / torisetu-234c3）横断集計用のセカンダリApp ──
// このFunctionsの実行サービスアカウント(...-compute@developer.gserviceaccount.com)に、
// torisetu-234c3側でFirebase Authentication閲覧者・Realtime Database閲覧者・
// Service Usage Consumerの3つのIAMロールを付与済み（ユーザー側でConsole操作済み、
// 2026-07-09）。credentialを明示することで、後段のREST直接呼び出し
// （countPremiumUsers）でも同じApplication Default Credentialsのトークンを
// 使い回せるようにしている。
const CROSSMEMO_DB_URL =
  "https://torisetu-234c3-default-rtdb.asia-southeast1.firebasedatabase.app";
const crossmemoApp = initializeApp(
  {
    credential: applicationDefault(),
    projectId: "torisetu-234c3",
    databaseURL: CROSSMEMO_DB_URL,
  },
  "crossmemo"
);

// 配列を size 件ずつに分割
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

exports.sendBulkMail = onCall(
  {
    secrets: [SENDGRID_API_KEY],
    region: "asia-northeast1", // 東京リージョン
    maxInstances: 2, // 大量アクセス対策：管理者専用・低頻度のためスケールを制限
  },
  async (request) => {
    // ── 認可：管理者のみ実行可（Firestoreルールに加えた多層防御）──
    if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
      throw new HttpsError("permission-denied", "管理者のみ実行できます。");
    }

    // ── 入力検証 ──
    const subject = String(request.data?.subject || "").trim();
    const body = String(request.data?.body || "").trim();
    const test = request.data?.test === true;
    if (!subject || !body) {
      throw new HttpsError("invalid-argument", "件名と本文は必須です。");
    }

    // ── 宛先の決定 ──
    let recipients;
    if (test) {
      // テスト送信：専用窓口アドレスのみ
      recipients = [TEST_RECIPIENT_EMAIL];
    } else {
      // ウェイティングリスト全員（重複除去・小文字化）
      const snap = await db.collection("waitlist").get();
      recipients = [
        ...new Set(
          snap.docs
            .map((d) => String(d.data().email || "").trim().toLowerCase())
            .filter((e) => e)
        ),
      ];
      if (recipients.length === 0) {
        throw new HttpsError(
          "failed-precondition",
          "ウェイティングリストに登録者がいません。"
        );
      }
    }

    // ── SendGrid 送信（500件ずつ分割）──
    // .trim() で Secret に混入しうる末尾の改行・空白を除去（認証エラー防止）
    // 注意: SendGrid無料枠は 100通/日。登録者がこれを超える場合は上位プラン検討が必要。
    sgMail.setApiKey(SENDGRID_API_KEY.value().trim());
    try {
      for (const batch of chunk(recipients, 500)) {
        await sgMail.send({
          to: batch,
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          text: body,
          isMultiple: true, // 宛先ごとに個別送信（受信者間でアドレスが見えない）
        });
      }
    } catch (err) {
      logger.error("SendGrid送信エラー", err?.response?.body || String(err));
      throw new HttpsError("internal", "メール送信に失敗しました。");
    }

    // ── 監査ログ（mailLogs）──
    await db.collection("mailLogs").add({
      subject,
      recipientCount: recipients.length,
      test,
      sentBy: request.auth.token.email,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info(
      `一斉メール送信 完了: ${recipients.length}件 (test=${test}) / 件名「${subject}」`
    );
    return { ok: true, sent: recipients.length, test };
  }
);

// crossmemo（howto-v2）のAuthenticationを全ページ走査し、匿名認証
// （providerDataが空）のユーザー数を数える
async function countAnonymousUsers() {
  const auth = getAuth(crossmemoApp);
  let count = 0;
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    for (const u of result.users) {
      if (!u.providerData || u.providerData.length === 0) count++;
    }
    pageToken = result.pageToken;
  } while (pageToken);
  return count;
}

// crossmemoのRealtime Databaseから isPremium === true のユーザー数を数える。
// Stripe決済の実在検証は行っていない（isPremium付与は全てクライアント
// サイド）ため、実際の購入者数とは一致しない可能性がある近似値。
//
// 通常の orderByChild().equalTo() クエリは、一致したユーザーの
// サブツリー全体（カテゴリ・カード本文・base64画像を含む）を丸ごと
// 転送してしまい、実際にCloud Functionsのメモリ上限（256MiB）を
// 超えて失敗した（2026-07-09に実機で確認）。また RTDB REST API の
// shallow=true はクエリ（orderBy/equalTo）と併用できずHTTP 400になる
// ことも判明したため、①shallow=trueで全uid一覧のみ取得→②各uidの
// isPremiumフィールドだけを個別に軽量取得、の2段階で本文データを
// 一切転送せずに件数を数える。
async function countPremiumUsers() {
  const { access_token: accessToken } = await crossmemoApp.options.credential.getAccessToken();

  // ① 全ユーザーのuid一覧をshallowで取得（値はtrue固定で本文は含まれない）
  const listRes = await fetch(
    `${CROSSMEMO_DB_URL}/users.json?shallow=true&access_token=${accessToken}`
  );
  if (!listRes.ok) {
    throw new Error(`RTDB shallow一覧取得が失敗しました: HTTP ${listRes.status}`);
  }
  const listData = await listRes.json();
  const uids = listData ? Object.keys(listData) : [];

  // ② 各uidの isPremium フィールドだけを個別取得（本文データは取得しない）。
  // 同時接続数を上げすぎるとRTDB側でTLS接続がリセットされる事象を確認した
  // ため、並列数を抑えつつ一時的な失敗は1回だけリトライする。
  const CONCURRENCY = 5;
  let count = 0;
  for (let i = 0; i < uids.length; i += CONCURRENCY) {
    const batch = uids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((uid) => fetchIsPremium(uid, accessToken)));
    count += results.filter(Boolean).length;
  }
  return count;
}

async function fetchIsPremium(uid, accessToken, retriesLeft = 1) {
  try {
    const res = await fetch(
      `${CROSSMEMO_DB_URL}/users/${uid}/isPremium.json?access_token=${accessToken}`
    );
    return res.ok && (await res.json()) === true;
  } catch (err) {
    if (retriesLeft > 0) return fetchIsPremium(uid, accessToken, retriesLeft - 1);
    logger.warn(`isPremium取得に失敗（uid=${uid}）`, String(err));
    return false;
  }
}

// 管理ダッシュボード（100kin-blog admin/dashboard.html）向け：
// 別プロジェクト(torisetu-234c3)のゲスト利用数・購入者数（近似値）を横断集計
exports.getCrossmemoStats = onCall(
  { region: "asia-northeast1", maxInstances: 2 }, // 大量アクセス対策：管理者専用・低頻度のためスケールを制限
  async (request) => {
    if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
      throw new HttpsError("permission-denied", "管理者のみ実行できます。");
    }

    try {
      const [guestCount, premiumCount] = await Promise.all([
        countAnonymousUsers(),
        countPremiumUsers(),
      ]);
      return { guestCount, premiumCount };
    } catch (err) {
      logger.error("crossmemo統計の取得に失敗しました", err);
      throw new HttpsError("internal", "統計の取得に失敗しました。");
    }
  }
);
