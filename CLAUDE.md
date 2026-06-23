# CLAUDE.md — 100均アプリ ブログサイト

このファイルはClaude Code向けのプロジェクトメモです。作業を再開する際はまずこのファイルと `設計書.md` を参照してください。

最終更新: 2026-06-23

---

## 1. プロジェクト概要

ブランド名「100均アプリ」。自作の小さなWebアプリ（PCスマホ連動メモ、糖尿人のカウンター 等）を紹介・販売するブログ風サイト。
詳細な設計方針は `設計書.md` を参照（フォルダ構成・画面設計・技術スタック選定理由・大量アクセス対策などを記載）。

---

## 2. 現在のファイル構成

```
100kin-blog/
├── CLAUDE.md           ← 本ファイル
├── 設計書.md            ← 実装計画書（原本）
├── 開発者ガイド.md       ← 次作アプリ登録手順
├── index.html           ← ホーム画面（実装済み・本番）
├── app-detail.html      ← アプリ詳細ページ（実装済み・本番）
├── login.html           ← ゲスト／購入ログイン選択（実装済み・本番）
├── save.bat             ← git add/commit/push を自動実行するスクリプト
├── admin/
│   ├── dashboard.html   ← 管理ダッシュボード（実装済み・静的モック）
│   ├── inquiries.html   ← 問い合わせ一覧＋レビュー管理（実装済み・静的モック）
│   └── mail-send.html   ← 一斉メール送信フォーム（実装済み・静的モック、送信は未接続）
└── src/                 ← 旧版（6/13時点のバックアップ。本番は使っていない）
```

`index.html` / `app-detail.html` / `login.html` がルート直下にあるものが現行の本番ファイル。`src/` 配下は初期バックアップで更新が止まっている。

---

## 3. これまでの作業状況

- **Phase 1（HTML/CSS）**: ほぼ完了
  - `index.html`: 3カラムレイアウトのホーム画面、アプリサムネイル切替スライダー
  - `app-detail.html`: Amazon商品ページ風の詳細レイアウト、スクリーンショット切替、レビュー表示
  - `login.html`: ゲスト／購入の選択画面（ゲスト制限の説明文付き）
  - 購入ボタンはStripe決済リンク（テストモード）に直接リンク。ゲストボタンは外部の `howto-v2`（GitHub Pages）に `?guest=true` 付きで直接リンク
- **管理者ページ追加（2026-06-22）**:
  - `admin/dashboard.html`: 購入者数・ゲスト数・未読問い合わせ数・公開アプリ数のサマリー、クイックリンク
  - `admin/inquiries.html`: 問い合わせ一覧（未読フィルタ、mailto返信）＋ レビュー管理機能
    - 星1〜2のレビューに「要確認」バッジを自動表示
    - 「非表示にする」（復元可能）／「削除する」（confirm確認・復元不可）
  - `admin/mail-send.html`: 送信先選択・件名・本文フォーム（送信ボタンは現状モック、実送信は未接続）
  - いずれもダミーデータのみ。Firebase/Firestore連携はまだ無し
- **管理者ボタン追加（2026-06-22）**:
  - `index.html` と `app-detail.html` のフッターに小さく目立たない「管理者」ボタンを設置
  - クリックで `prompt()` パスワード入力 → 正しければ `admin/dashboard.html` へ遷移、誤りなら「パスワードが違います」
  - パスワードは `siro100kin`（クライアントJSにハードコード。本格的な認証ではなく簡易的な目隠し）

---

## 4. 技術スタック（予定／設計書より）

| 要素 | 選択肢 | 状態 |
|------|--------|------|
| ホスティング | Firebase Hosting | 未設定（現状はローカルHTML＋GitHub） |
| 認証 | Firebase Auth（匿名＋メール/Google） | 未実装 |
| DB | Firestore | 未実装（現状は全ページ静的ダミーデータ） |
| 決済 | Stripe Payment Links | テストリンクのみ設置済み（本番リンク未発行） |
| メール送信 | Firebase Functions + Resend/SendGrid | 未実装（mail-send.htmlはUIのみ） |
| 専用メールアドレス | apps100kin@gmail.com | 各ページのmailtoリンクに設定済み |

リポジトリ: GitHub `kimijimasan-lgtm/100kin-blog`（mainブランチ、`save.bat` で手動push）

**Firebaseプロジェクト（2026-06-23作成済み）**:
- Project ID: `apps100kin`（Firebase CLIでログイン・作成。ログインアカウント: kimijimasan@gmail.com）
- Web App登録済み。SDK設定は `firebase-config.js`（ルート直下）に記載、`login.html` から `<script type="module">` で読み込み確認済み
- Authentication: 匿名／メール・パスワード／Google の3プロバイダーを有効化済み
- Firestore: `(default)` データベースをasia-northeast1に作成済み。`firestore.rules` は現状 `allow read, write: if false`（全拒否）のデフォルト安全設定のままデプロイ済み（スキーマ未設計のため）
- `.firebaserc` / `firebase.json` / `firestore.indexes.json` を追加済み
- howto-v2側のFirebaseプロジェクト（`torisetu-234c3`）とは別プロジェクト。統合方針（ゲストボタンの遷移先・UID連携方法）は未決定

---

## 5. 次回やること

優先度の高いものから:

1. **ゲストボタンとFirebase匿名認証の接続**（認証基盤は構築済み、接続のみ未実装）
   - `login.html` の「ゲストで試してみる」ボタン押下時に `signInAnonymously()` を呼ぶ
   - 匿名サインイン後の遷移先（howto-v2へのリダイレクトか、100kin-blog側で制限管理するか）を要検討・要決定
2. **Firestore設計・接続**
   - `apps` コレクションを作成し、`index.html` / `app-detail.html` の表示をハードコードからFirestore読み込みに変更
   - 管理者ページ（dashboard / inquiries / mail-send）もFirestoreの実データに接続
3. **ゲスト制限の実装**（パネル3枚・カード10枚）— 現状はlogin.html上の説明文のみで、実際の制限ロジックは未実装
4. **Stripe本番リンクの発行**（現在はtestモードリンク）
5. **一斉メール送信の実送信機能**（Firebase Functions + Resend/SendGridの実装）
6. **管理者認証の強化**（現状はクライアントJSの平文パスワード比較のみ。Firebase Authの管理者ロール判定等への置き換えを検討）
7. **大量アクセス対策**（設計書6章）— Cloudflare導入、ウェイティングリスト等は紹介前に着手

---

## 6. 注意事項・既知の制約

- `admin/` 配下は認証なしで誰でもURLを直接開けば見える状態（パスワードボタンはあくまで一般ユーザー向けの目隠し）。Firebase Auth導入時に管理者ロールでアクセス制限する必要あり。
- `src/` 配下のファイルは古いバックアップなので、編集対象は常にルート直下のファイルにすること。
- `save.bat` はユーザーがダブルクリックで `git add . && commit "auto save <日時>" && push` を実行する。Claude側で別メッセージでコミットしようとしても、既にauto saveで取り込まれて差分が無いことがある（コミット前に `git status` で確認すること）。
