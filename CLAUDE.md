# CLAUDE.md — 100均アプリ ブログサイト

このファイルはClaude Code向けのプロジェクトメモです。作業を再開する際はまずこのファイルと `設計書.md` を参照してください。

最終更新: 2026-07-01（ヒーローカルーセルのフリック根本修正・Pointer Events統一化）

---

## 0. ヒーローカルーセル フリック根本修正（2026-07-01）

**症状:** 左フリック1回で次画像に進むが、その後左右どちらもフリックが一切効かなくなる。修正してもすぐ再発していた。

**根本原因（再発の理由）:**
1. **入力系統の二重登録** — `initHeroCarousel` に Pointer Events と Touch Events の2系統が同じ `dragging`/`dragX`/`index` 状態を共有して登録されていた。実タッチ端末では両方が発火し、`setPointerCapture` を使うポインタ経路とタッチ経路が競合。パッチを当てても別経路で壊れる構造だった。
2. **リスナーを「動く要素」に付けていた** — リスナーが `.hero-carousel-track` に付いていたが、track は `translateX` で1ページ分左へ移動する。1回スワイプ後は track 自身のボックスが画面外へ出るため、以降のジェスチャーのイベント配送が不安定になる（＝「1回だけ動いて固まる」の正体）。

**修正内容（index.html）:**
- Touch Events を全廃し、**単一の Pointer Events 実装**で mouse/pen/touch を統一処理。
- リスナーを**動かない `.hero-carousel-viewport`** に付け替え（`setPointerCapture` も viewport に対して実行）。
- 1本目のポインタのみ追跡（`activeId` ガード）、横スワイプ確定後にキャプチャ、`pointerup`/`pointercancel` で確実に解放・リセット。
- 縦横の意図を6px閾値で判定し、縦方向は縦スクロールに委ねる。
- CSS: `touch-action: pan-y` を viewport にも付与。

**検証:** Playwright（Chromium）で「左→左→右→左→右→右」を TOUCH（CDPでtouch+pointer両発火）／MOUSE（setPointerCapture経路）の両方で実行し全PASS。ローカル→本番デプロイ後も本番URLで再検証しALL PASS。
- ⚠️ 注意: Chromiumエミュレーションでは旧コードのタッチ経路も座標が正しければPASSしてしまい、実iOS Safari特有の固まりは自動テストで完全再現できない。上記は「アーキテクチャ上の脆弱性を除去した」もので、最終確認は実機iPhoneでの手動テスト推奨。
- ⚠️ テスト注意: Playwright の `page.mouse` はページが `setPointerCapture` を呼ぶと `mouse.up()` が stall する。マウス経路テストは CDP `Input.dispatchMouseEvent` を使うこと（scratchpad の verify.mjs 参照）。

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

### ヒーローレイアウト調整・UI修正（2026-06-30 後半）

**index.html ヒーローセクション:**
- ヒーローの高さを `100dvh` に合わせる実装（JS で `height: calc(100dvh - 52px - <subTaglineHeight>px)` をインラインスタイルとして設定。sub-tagline の実測値を引くことで画面ぴったりに収まる）
- `margin-top: auto` を `.hero-ctas` に追加し、「ゲストで試す」「購入する」ボタンをヒーロー最下部に固定
- デスクトップ（860px以上）では `margin-top: 0` でリセット
- `padding-bottom: 60px`（`scroll-hint` との重なり回避のため36px→60pxに変更）

**app-detail.html トップバー:**
- `<span class="back-hint">←トップページに戻るには</span>` を「100均アプリ」ボタンの右側に追加
- スタイル: `color: #FFD700; font-weight: 700; font-size: 13px; margin-left: 14px; white-space: nowrap;`
- 「←」はテキスト文字としてそのまま表示（アイコン素材は使用していない）

**左矢印アイコン完全削除（CSS/HTML/JS 計8箇所）:**

| # | ファイル | 種別 | 削除内容 |
|---|---------|------|---------|
| 1 | index.html | CSS | `.hero-carousel .arrow.left { left: -14px; }` |
| 2 | index.html | HTML | `<div class="arrow left" data-role="heroPrev">&#8249;</div>` |
| 3 | index.html | JS | `querySelector('[data-role="heroPrev"]').addEventListener(...)` |
| 4 | app-detail.html | CSS | `.arrow.left { left: 10px; }` |
| 5 | app-detail.html | HTML | `<div class="arrow left" id="prev" style="display:none">&#8249;</div>` |
| 6 | app-detail.html | JS | `const prevBtn = document.getElementById('prev');` |
| 7 | app-detail.html | JS | `prevBtn.style.display = cur === 0 ? 'none' : 'flex';` |
| 8 | app-detail.html | JS | `prevBtn.addEventListener('click', () => goTo(cur - 1));` |

- カルーセルは6枚の画像を右矢印（`›`）のみでループする仕様のため、左矢印は不要と確認済み

---

### app-detail.html ゼロからリライト（2026-06-30）

**経緯:** スクロール位置が「3ページ目から始まる」と思われる症状を調査。試みた対策は以下の通り（すべて不要・削除済み）：
- `history.scrollRestoration='manual'`（直接URL入力時には効かない仕様）
- `window.location.replace(?t=タイムスタンプ)` 自己リダイレクト
- `Cache-Control: no-cache/no-store` メタタグ
- `overflow-anchor: none`
- `onload="window.scrollTo(0,0)"`
- `setTimeout` / `pageshow` によるスクロールリセット
- `scroll-snap-type: y mandatory`
- 1px ダミー要素

**真の原因（最終判明）:** バグではなく正常動作だった。`index.html` の1・2ページと合わせた通し番号での誤解。`app-detail.html` を直接開けばスクリーンショットビューワーが最初に表示される。

**実際に修正した本物のバグ:**
- `window.scrollTo(0,0)` がFirebaseコンテンツ挿入前に実行されていた。Firebase非同期ロード後に `layout.innerHTML` が更新されるとSafariがスクロール位置を復元し、`scrollTo(0,0)` が無意味になっていた。**修正：`scrollTo(0,0)` と `requestAnimationFrame(() => scrollTo(0,0))` をtryブロック末尾（全DOM操作完了後）に移動**

**リライト内容（`<template>` 廃止 → `innerHTML` 直接生成に変更）:**
- 555行 → 429行に削減
- `<template>` タグ廃止、`loadApp()` 内で `layout.innerHTML` にすべて直接生成
- scroll-snap・スクロールハック類はすべて削除
- `firebase.json` に `app-detail.html` の `Cache-Control: no-store` ヘッダー追加（サーバー側設定として残存）

**index.html の修正（同日）:**
- `scroll-hint`（「特徴を見る」↓ボタン）の `href="#features"` → `href="javascript:void(0)"` + JS `scrollIntoView()` に変更（URLハッシュ汚染の防止）
- `app-detail.html` 内の `href="#"` リンク3箇所 → `href="javascript:void(0)"` に変更

### UI改修（2026-06-26〜2026-06-29）

**app-detail.html**（詳細ページ）— 完了
- 左矢印（前へ）ボタンを非表示に変更
- 解説ボックスのデザイン変更:
  - 背景色: 青（`#1e40af`）
  - 枠線: 白・太め（`3px solid #ffffff`）
  - 文字色: 純黄色（`#FFFF00`）
  - フォント: 太文字（`font-weight: 900`）
  - ドロップシャドウ強化
- スマホ画像横幅拡大（`width: 92%`、`max-width: 400px`）
- 解説ボックスをスマホ画像内下部に`position: absolute`で配置

**index.html**（トップページ）— 調整中
- トップバー直下の煽り文（`.sub-tagline`）を `font-weight: 700`（太文字）に変更
- 緑テキストエリアの上下padding縮小（`36px 20px 56px` → `18px 20px 28px`）
- タイトル・キャッチボックスのmargin縮小
- 2ページ目の表題を「開発の動機」に変更、黄色マーカー風デコレーション追加
- 2ページ目のボタン文言を「もっと詳しく見ましょう →」に変更



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
4. ~~**index.htmlのUI調整**~~ → **完了（2026-06-29〜2026-06-30）**
   - 緑テキストエリアpadding縮小・タイトル/キャッチboxマージン調整済み
   - 2ページ目「開発の動機」黄色マーカーデコレーション・ボタン文言変更済み
   - `scroll-hint`のhref="#features"をJS scrollIntoViewに変更（URLハッシュ汚染防止）
5. **カルーセル1枚目の画像差し替え**（画像ファイルの準備が必要）
6. **PWAホーム画面追加の案内モーダル実装**（index.htmlへの実装はまだ未着手）
7. **ゲスト制限の実装**（パネル3枚・カード10枚）— 現状はlogin.html上の説明文のみで、実際の制限ロジックは未実装
8. **Stripe本番リンクの発行**（現在はtestモードリンク）
9. **一斉メール送信の実送信機能**（Firebase Functions + Resend/SendGridの実装）
10. **大量アクセス対策**（設計書6章）— Cloudflare導入、ウェイティングリスト等は紹介前に着手

---

## 6. 注意事項・既知の制約

- ~~`admin/` 配下は認証なしで誰でもURLを直接開けば見える状態~~ → 2026-06-23、Firebase Auth導入により解消。`onAuthStateChanged` ガードで未ログイン/非管理者は `login.html` にリダイレクトされる。
- `src/` 配下のファイルは古いバックアップなので、編集対象は常にルート直下のファイルにすること。
- `save.bat` はユーザーがダブルクリックで `git add . && commit "auto save <日時>" && push` を実行する。Claude側で別メッセージでコミットしようとしても、既にauto saveで取り込まれて差分が無いことがある（コミット前に `git status` で確認すること）。
