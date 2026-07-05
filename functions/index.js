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
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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
