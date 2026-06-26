# CLAUDE.md — 100均アプリ ブログサイト

このファイルはClaude Code向けのプロジェクトメモです。作業を再開する際はまずこのファイルと `設計書.md` を参照してください。

最終更新: 2026-06-26（index.html・app-detail.html UI大幅改修）

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

### UI改修（2026-06-26）

**index.html**
- トップバー直下の煽り文（`.sub-tagline`）を `font-weight: 700`（太文字）に変更

**app-detail.html**（大幅改修）
- **ヘッダー**: ホームアイコンボタン（`<a class="back">`）を削除。「100均アプリ」タイトル（`<h1>`）を `<a class="logo-link" href="index.html">` に変更し、クリックでホームへ戻るリンクに
- **ヘッダー**: キャッチコピー（黄色テキスト）を削除。タイトルのみのシンプルなヘッダーに
- **「このアプリでできること」セクション**: テンプレートHTML・CSS・JS（features populate処理）を完全削除
- **活用例サムネイルグリッドセクション**: `usecases-section`・`DUMMY_USE_CASES`・`renderUseCases()`関数を完全削除
- **レイアウト再設計（2ページ構成）**:
  - Page 1（`height: calc(100dvh - 52px)`）: スクリーンショットビューワー（flex: 2）＋解説文エリア（flex: 1）が1画面に収まる構成。スクロールヒントアニメーション付き
  - 区切り: ダークグリーン（`--primary`色）のフルワイド帯「詳 細 ・ 購 入」
  - Page 2: アプリ名・星評価 → 購入ボックス（¥・購入/ゲストボタン）→ カスタマーレビュー
  - グリッドレイアウト（`440px 1fr`）は廃止し、`viewer-section` / `detail-section` の縦並び構成に変更
- **スクリーンショットビューワー最終形**:
  - `viewer-section { background: #16280f }` — ダークグリーン背景（スクショ＋解説エリアのコントラスト）
  - `viewer-area { max-width: 360px }` — 矢印の外出し配置のため幅拡張
  - `.viewer-wrap { display: flex; justify-content: center; position: relative }` — スクショを中央配置、矢印の基準要素
  - `.screenshot-main { height: 100%; width: auto; aspect-ratio: 9/19.5 }` — 親の高さを充填してアスペクト比から幅を自動計算
  - **矢印を外側配置**: `position: absolute; left: 0 / right: 0` で viewer-wrap の左右端に固定。スクショは viewer-wrap 内で中央配置されるため、スクショ幅より外側に自然に配置（viewer-area 360px に対しスクショ幅は ~220px程度）。サイズ 48×48px、フォント 24px
  - **解説文エリア** (`[data-role="slideLabel"]`): スクショ下に独立配置（オーバーレイ廃止）。flex: 1 でスクショの半分の高さ。背景白（`var(--surface)`）。フォントサイズ 17px
  - **フリック対応**: `.screenshot-main` にポインターイベントでスワイプ検知 → `goTo()` 呼び出し
  - **解説文ダミーテキスト**: `DUMMY_SLIDE_DESCRIPTIONS` 配列（6項目）を定義。Firestoreの `slides[i].description` が追加されれば自動で優先表示（`??` フォールバック構造）



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
- **管理者ボタン追加（2026-06-22）→ Firebase Authに置き換え（2026-06-23）**:
  - `index.html` と `app-detail.html` のフッターに小さく目立たない「管理者」リンクを設置（`admin/login.html` へ直接遷移、旧 `prompt()` パスワードは削除済み）
  - `admin/login.html` を新規作成: Firebase Auth（メール/パスワード）でログイン。管理者メールは `kimijimasan@gmail.com` のみ許可（`auth.currentUser.email` チェック）
  - `admin/dashboard.html` / `admin/inquiries.html` / `admin/mail-send.html` の3ページすべてに `onAuthStateChanged` ガードを追加。未ログイン or 管理者メール以外は自動で `login.html` にリダイレクト。各ページのnavに「ログアウト」リンクを追加（`signOut()`）
  - **アカウント作成はFirebase Console側でユーザー本人が実施**（Authentication > Users、`kimijimasan@gmail.com`）。Claude側はパスワードを扱っていない

---

## 4. 技術スタック（予定／設計書より）

| 要素 | 選択肢 | 状態 |
|------|--------|------|
| ホスティング | Firebase Hosting | デプロイ済み（https://apps100kin.web.app） |
| 認証 | Firebase Auth（匿名＋メール/Google） | ゲスト匿名認証・管理者メール/パスワード認証は実装済み。Google連携は未使用 |
| DB | Firestore | `index.html`/`app-detail.html` は接続済み（管理者ページ3つは未接続、ダミーデータのまま） |
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
- Firebase Hosting: `firebase deploy --only hosting` でデプロイ済み（2026-06-23）。公開URL `https://apps100kin.web.app`。`firebase.json` の `public: "."` 設定により `index.html`/`app-detail.html`/`login.html`/`admin/` がそのまま公開される（`src/`・`*.md`・`save.bat` は ignore 設定で除外済み）

---

## 5. 次回やること

優先度の高いものから:

1. ~~**ゲストボタンとFirebase匿名認証の接続**~~ → **完了（2026-06-23）**
   - `login.html` の「ゲストで試してみる」ボタン押下時に `signInAnonymously()` を呼び、成功後は従来通り `howto-v2`（`?guest=true`）へ遷移するよう実装済み
   - 失敗時はボタン下にエラーメッセージを表示
   - 遷移先の最終方針（howto-v2継続 or 100kin-blog側で制限管理）はユーザー判断で「今回は匿名認証のみ接続し保留」。制限ロジック設計（3番）は引き続き未決定のまま
2. ~~**Firestore設計・接続（基本部分）**~~ → **完了（2026-06-23）**
   - `apps` コレクション（doc id: `memo-sync`）＋ `apps/{id}/reviews` サブコレクションを設計・作成済み
   - `index.html`: `published==true` でクエリし `order` 順に複数アプリをカード表示できるよう改修（テンプレート化、2作目以降にも対応）
   - `app-detail.html`: URLクエリ `?app=<id>`（省略時は `memo-sync`）でFirestoreから当該アプリのドキュメント＋公開レビュー（`hidden==false`）を取得して表示
   - `firestore.rules`: `apps/{appId}` は `published==true` のときのみ公開read許可、`reviews` は `hidden==false` のときのみ公開read許可。write はクライアントから常に拒否（管理データ追加・編集は今後Firebase Console or Admin SDK経由）
   - `firestore.indexes.json`: `apps` コレクションに `published ASC, order ASC` の複合インデックスを追加済み
   - 残課題: 新しいレビュー投稿・問い合わせ送信のフォーム自体は未実装（現状投稿経路がないため、Firestoreへの`create`は常に拒否したまま。データ追加は今後Firebase Console等の手動投入が必要）
3. ~~**管理者ページのFirestore接続**~~ → **完了（2026-06-23）**
   - `inquiries` コレクション（top-level）を新設。`admin/dashboard.html`（未読数・公開アプリ数の集計、最近の問い合わせ表）、`admin/inquiries.html`（問い合わせ一覧・レビュー一覧）をFirestore接続
   - レビュー管理の「非表示にする」「復元する」「削除する」ボタンは実際に `apps/{appId}/reviews/{reviewId}` を `updateDoc`/`deleteDoc` する形で接続済み（即時反映を確認済み）
   - ~~admin認証は `prompt()` の平文パスワード比較のみ~~ → **2026-06-23、Firebase Authに置き換え完了**（詳細は次項）
   - `collectionGroup('reviews')` クエリ（admin一覧で全アプリのレビューを横断取得）には、`match /apps/{appId}/reviews/{reviewId}` の入れ子ルールとは別に `match /{path=**}/reviews/{reviewId}` というワイルドカードルールが必要だった（Firestoreの仕様。ハマりポイントとして記録）
   - `admin/mail-send.html` は接続せず据え置き：購入者数・送信先件数のデータソース（Stripe購入記録）がまだ存在しないため、Firestoreに繋ぐ実体がない。画面上に「未接続」の注記を追加
   - `admin/dashboard.html` の購入者数・ゲスト利用数も同様の理由で `—` 表示＋注記に変更（ダミーの「42」「318」は削除）
   - シード時に動作確認用として `apps/diabetes-counter`（`published: false` の未公開アプリ）を追加。公開サイトには出ないが、レビュー管理一覧の動作確認に使っている
3. ~~**管理者認証の強化**~~ → **完了（2026-06-23）**
   - `admin/login.html` 新規作成、Firebase Auth（メール/パスワード）でログイン。許可メールは `kimijimasan@gmail.com` のみ（`firestore.rules` の `isAdmin()` 関数でも同じメールをチェック）
   - `admin/dashboard.html` / `inquiries.html` / `mail-send.html` に `onAuthStateChanged` ガード＋ログアウトリンクを追加
   - `firestore.rules` を全面更新: `apps`/`reviews`/`inquiries` の管理者向け読み書きは `isAdmin()` 必須に。公開サイト向けの `published==true`／`hidden==false` 条件は維持（ORで両立）
   - 残課題: Googleログイン等の追加プロバイダーは未設定。管理者が複数人になる場合はメール1件のハードコードをFirestore側の `admins` コレクション等に変更する必要あり
4. **ゲスト制限の実装**（パネル3枚・カード10枚）— 現状はlogin.html上の説明文のみで、実際の制限ロジックは未実装
5. **Stripe本番リンクの発行**（現在はtestモードリンク）
6. **一斉メール送信の実送信機能**（Firebase Functions + Resend/SendGridの実装）
7. **大量アクセス対策**（設計書6章）— Cloudflare導入、ウェイティングリスト等は紹介前に着手

---

## 6. 注意事項・既知の制約

- ~~`admin/` 配下は認証なしで誰でもURLを直接開けば見える状態~~ → 2026-06-23、Firebase Auth導入により解消。`onAuthStateChanged` ガードで未ログイン/非管理者は `login.html` にリダイレクトされる。
- `src/` 配下のファイルは古いバックアップなので、編集対象は常にルート直下のファイルにすること。
- `save.bat` はユーザーがダブルクリックで `git add . && commit "auto save <日時>" && push` を実行する。Claude側で別メッセージでコミットしようとしても、既にauto saveで取り込まれて差分が無いことがある（コミット前に `git status` で確認すること）。
