// Firebase SDK 初期化（apps100kin プロジェクト）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKywWBCyCig6unFK3aNjL81hg8p4yEqTk",
  authDomain: "apps100kin.firebaseapp.com",
  projectId: "apps100kin",
  storageBucket: "apps100kin.firebasestorage.app",
  messagingSenderId: "579269645791",
  appId: "1:579269645791:web:31535dfe2d537d6527e06a"
};

export const app = initializeApp(firebaseConfig);

// ── Firebase App Check（現在はモニタリングモード、enforcementはまだ有効化しない）──
// Firebase Console > App Check で reCAPTCHA v3 を登録したら、発行されたサイトキーを
// 下の定数に貼り付けて再デプロイする。空文字列の間は初期化をスキップし、従来通り動作する。
const APP_CHECK_SITE_KEY = "6LfPVU0tAAAAADsLwz1521_uxYN3ePj6Gzj2nwW0";

// ローカル開発・自動テスト時はデバッグトークンを使う（初回アクセス時にコンソールへ
// 出力されるトークンを Firebase Console > App Check > アプリ > デバッグトークンに
// 登録すると、そのブラウザからのアクセスが有効なトークン扱いになる）。
// この指定は initializeAppCheck より前に行う必要がある。
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

export const appCheck = APP_CHECK_SITE_KEY
  ? initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true, // トークン期限切れ前に自動更新（Callable呼び出しの失敗防止）
    })
  : null;

export const auth = getAuth(app);
export const db = getFirestore(app);
