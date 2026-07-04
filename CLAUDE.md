# CLAUDE.md — 100均アプリ ブログサイト

このファイルはClaude Code向けのプロジェクトメモです。作業を再開する際はまずこのファイルと `設計書.md` を参照してください。

最終更新: 2026-07-04（2軸スナップ化: app-detail.html の内容を index.html に統合し、「縦=紹介→詳細 / 横=作品切替」の2軸スクロールスナップ構成に。詳細は「0. トップページ横ページャ化」「0-2. 2軸スナップ統合」参照）

---

## 0-2. 2軸スナップ統合（2026-07-04 後半）

app-detail.html（旧451行）の内容を index.html に統合し、1アプリ＝「紹介（ヒーロー＋悩みごと＋CTA）→詳細（ビューワー＋購入＋レビュー）」の縦1本に。横方向の作品切替（ページャ）はそのまま。

**構造:**
```
#pager（横 x mandatory）
└ .app-page（縦 y mandatory ＋ overscroll-behavior-y: contain）
   ├ .hero（1画面・snap start）
   ├ .intro-scroll（悩みごと＋¥100 CTA を1スナップ領域に。※下記ハマり参照）
   ├ .viewer-section（詳細1画面目・snap start）… 旧app-detailのスクショビューワー
   ├ .section-divider＋.detail-section（購入ボックス＋レビュー）
   └ footer
```

**主な変更:**
- 詳細ビューワーもCSSスクロールスナップ化（**無限ループ廃止**・端で止まる／ドット追従・解説文はscroll連動で切替）。旧Pointer Events実装は全削除。これでサイト内のスワイプUIはすべてスクロールスナップに統一
- 「もっと詳しく見ましょう→」は `<a>` → `<button>` に変更し、`viewer-section.scrollIntoView({smooth})` の縦スナップ移動に
- Firestore取得: アプリ一覧＋**全アプリのレビューを `Promise.all` で並列取得**（アプリ数が増えたら遅延ロード化を検討）
- スライドを `apps/{id}.slides: [{image, description}]` で管理する設計に（`topImages` と同様）。未設定時は `MEMO_SYNC_FALLBACK_SLIDES`（コード内・crossmemo用6枚）を使用
- **URLはハッシュ方式**: `index.html#<appId>` / `#<appId>/detail`。閲覧中は `history.replaceState` で追従（近日公開ページは `#coming-soon`）。読み込み時にハッシュを解釈して横・縦位置を復元
- **app-detail.html は転送用スタブ化**（`?app=xxx` → `index.html#xxx/detail` へ `location.replace`）。既存の共有URLは切れない。`firebase.json` の no-store ヘッダーはそのまま有効
- `login.html` の「← 詳細に戻る」を `index.html#memo-sync/detail` に変更

**縦スナップのハマりポイント（重要）:**
- 悩みごとセクションとビューワーの間にある「¥100＋CTAボタン」が、当初スナップ吸着点の狭間にあり**スクロール停止位置として安定しなかった**（mandatoryが手前/奥の吸着点へ引っ張る）
- 解決: 悩みごと＋CTAを `.intro-scroll` という1つのスナップ領域（snap-align: start）で包む。**スナップ領域が1画面より大きい場合、領域内は自由スクロールになり、領域の上端・下端が吸着点になる**（CSS仕様）。下端＝CTAが全部見える位置なので自然に止まれる
- 縦スナップが実機で硬すぎる場合は `.app-page` の `scroll-snap-type: y mandatory` → `y proximity` に1語変更すればよい

**検証:** Playwright 22項目ALL PASS（初期表示／矢印位置／横往復とハッシュ追従／縦スナップ吸着／CTA静止安定性／最下部静止／スライド切替＋解説文連動／ハッシュ直リンク着地／旧URLリダイレクト／デスクトップ表示）。ローカル・本番両方で確認済み。実機iPhoneでのスナップ感触の確認は未実施（推奨）。

**同日追修正（ユーザー指摘2件）:**
1. **矢印位置**: 画面中央右/左 → 白地（煽り文）のすぐ下＝緑地（ヒーロー）の上角に移動。`#pager` を `#pagerWrap`（position: relative）で包み、`.pager-nav` を `position: absolute; top: 10px`（右=next/左=prev）に変更
2. **最終セクション下部が見えない**: 縦スナップの吸着点が「詳細・購入」帯までしか無く、レビュー下部で指を離すと mandatory スナップが帯まで引き戻していた。**footer に `scroll-snap-align: end`（下端合わせの吸着点）を追加**し、スクロールし切った位置で静止できるようにした（スナップ構成で末尾に自由領域を置く場合の定石として記録）

**同日追修正（第2ラウンド）:**
1. **矢印位置の再調整**: タイトル文字と重なっていたため `top: 10px` → `top: -22px`（円44pxの半分が白地の煽り文エリアにかかる位置）
2. **トップバーダブルタップ**: 「100均アプリ」バッジ（header h1）をダブルタップ（400ms以内の2クリック）で現在ページの先頭へ `scrollTo({top:0, smooth})`。h1 に `touch-action: manipulation`（ダブルタップズーム抑止）＋ `user-select: none`
3. **詳細ビューワーの解説文が古い問題**: 原因は**Firestoreの `apps/memo-sync` に古い文言の `slides` フィールドが残っていた**こと。旧app-detail.htmlはハードコードSLIDESを表示していたのでFirestoreの古いデータが見えなかったが、統合後はFirestore優先のため表面化した。**コード（git履歴48f2c05のSLIDES＝フォールバック）は正しく、Firestore側をREST PATCH（Firebase CLIのOAuthトークン使用）で最新6枚（最適化jpgパス＋新文言）に更新して解決**。教訓: 「コードをFirestore優先に変えるときは、Firestoreに残っている旧データの中身を必ず確認する」

**同日追修正（第3ラウンド）— 詳細末尾で意図せず横ページ切替:**
- **症状**: 詳細（購入・レビュー）を末尾までスクロールする手前で、意図せず「次の作品」へ横切替してしまい末尾が読めない
- **原因**: 縦スクロールが末尾境界に達すると `overscroll-behavior-y: contain` で縦連鎖は止まるが、指の軌道のわずかな横ぶれ成分が外側の横ページャ（x mandatory）へ連鎖して吸着する（iOS Safari の入れ子スナップ運動量ハンドオフ）
- **修正**: 縦読みゾーン（`.section-divider, .detail-section, .app-page footer`）に **`touch-action: pan-y`** を指定し、そこで始まるタッチの横パンをブラウザレベルで遮断。ヒーロー／ビューワー画面は対象外なので横スワイプでの作品切替は引き続き可能。矢印は常時有効
- ⚠️ **Chromiumエミュレーションではこの漏れは再現できない**（Chromiumはジェスチャーを内側スクローラーに固定するため、.app-page 越しの横スワイプ連鎖自体が発生しない＝横スワイプ切替の自動テストも不可。矢印クリックで代替確認する）。最終確認は実機iPhoneで行うこと

**同日追修正（第4ラウンド）— 通常速度スクロールで詳細末尾がスキップされる:**
- **症状（実機iPhone）**: 詳細をゆっくりスクロールすれば末尾に到達できるが、通常速度だとレビュー末尾をすっ飛ばして詳細先頭へ戻される
- **原因（実測で確定）**: 吸着点「section-divider(2651)」と「footer end(3007)」の間隔が356px＝0.48画面しかなく、**CSS仕様の「吸着点間隔が1画面未満の区間では中間静止できない」ルール**により静止禁止ゾーンになっていた。mandatoryが最寄り吸着点（多くはdivider）へヤンクする。Chromiumでも再現（scrollTop 2800で解放→2651へ引き戻し）
- **修正（案3）**: 帯〜レビュー〜footerを `.detail-block`（snap-align: start）で包む。ブロックは1.48画面分あり、**「スナップ領域が1画面より大きければ領域内どこでも静止できる」仕様**（.intro-scrollで実証済みの機構）で内部が自由スクロール化。帯の位置は入り口吸着点として維持
- ⚠️ **footerの `scroll-snap-align: end` は必ず残すこと**。外すと最下部の静止判定が端数ピクセルで失敗し入り口までヤンクされる（実験で確認）。「ブロック＝領域内自由 ＋ footer end＝最下部の錨」がセット
- touch-action: pan-y は .detail-block に移設（効果は同じ、タッチ連鎖のゲートは祖先要素でも効く）
- **設計指針として記録: 縦スナップに新しいセクションを足すときは「隣接する吸着点との間隔が1画面以上あるか」を必ず確認する。1画面未満なら静止禁止ゾーンが生まれる**
- **第5ラウンド**: ブロック化後も実機で「末尾で止まろうとして止まりきれない」感触が残ったため、縦スナップを `y proximity` に緩和（v2026-07-04g）→ 今度は表紙のピタッと感が物足りなくなった（実機フィードバック）
- **第6ラウンド（最終形・v2026-07-04h）— 入れ子スクロール構造**: 1つのコンテナ内でスナップ強弱は混在できないため、`.detail-block` を **「1画面の窓（height:100%・snap-align:start）＋内部スクロール（overflow-y:auto）」** に変更。外側 `.app-page` は `y mandatory` に復帰
  - 表紙（ヒーロー〜悩みごと〜ビューワー〜詳細入り口）: mandatoryのピタッと感
  - 詳細の中身: スナップ非対象の内部スクローラーなので完全自由・末尾で確実に静止
  - 外側の最下端＝ブロック入り口と一致し、外側に静止禁止ゾーンは存在しない（吸着点間隔: 1.0/1.58/1.0/1.0画面）
  - footerの `scroll-snap-align: end` は不要になり削除（内部スクローラーにスナップは効かない）
  - ロゴダブルタップは内部スクロール（`.detail-block`）もリセットするよう更新
  - 検証: 入れ子テスト12項目＋回帰22項目 ALL PASS（表紙の吸着復活・詳細内部の自由静止・footer可視・ダブルタップ両リセット）
- **第7ラウンド（v2026-07-04k）— 入れ子構造でも実機で末尾の着地が不安定との報告への追加対策2点**:
  1. `.detail-block` の吸着を `scroll-snap-align: start` → **`end`** に変更。dvhの端数で「吸着点(blockTop=2651) > スクロール最大値(2650)」という**1pxの到達不能吸着点**が生じ、mandatoryが届かない点へ吸い付こうとして微振動していた疑い。end揃えなら吸着位置＝スクロール最大値ちょうどで必ず到達可能
  2. **ドックロック**: 外側がブロック入り口（最下端）に到着するまで内側スクロールを `overflow-y: hidden` でロックするJSを追加（scroll+rAF監視）。表紙からの強フリックの残り運動量が内側スクローラーへチェーンして着地が暴れるのを防ぐ。ドック到着で `auto` にアンロック
  - あわせてスライド解説ボックスの偶数枚目（`.slide-description.alt`）の文字色を赤→黒（`#1a1a18`）に変更（白地・赤太枠・bold維持）
- **第9ラウンド（v2026-07-04m）— 【最終アーキテクチャ】詳細を独立モーダル化（案A）**:
  - 第8ラウンドの修正でも実機で末尾閲覧が不安定なため、抜本策として**詳細（ビューワー〜購入〜レビュー〜footer）を縦スナップの祖先を一切持たない独立の固定モーダル（`.detail-modal` > `.modal-scroll`）に分離**。iOSのmandatory再スナップが介入する余地が構造的に消滅
  - **教訓（重要）: iOSでは「スナップコンテナ」と「長い自由読書領域」を同じ縦軸の祖先チェーンに同居させてはならない**。単一スクローラー・大スナップ領域・proximity・入れ子窓＋ドックロックの全アプローチが実機で失敗した末の結論
  - 表紙スクローラー（y mandatory）は hero ＋ intro-scroll のみ。`.detail-cta { scroll-snap-align: end }` が最下端アンカー
  - モーダル: `position: fixed; top: 52px; height: calc(var(--app-height,100dvh) - 52px)`、slide-up遷移、`overscroll-behavior-y: contain`＋`touch-action: pan-y`。アプリごとに `#modalRoot` 内へ生成
  - 開く: CTA「もっと詳しく見ましょう→」／ハッシュ `#id/detail` 直リンク。閉じる: ✕ボタン／ブラウザバック（pushState＋popstate連携でiOS戻るジェスチャー対応）／ロゴダブルタップ（閉じて表紙先頭へ）
  - ハッシュの `/detail` はモーダル開閉が管理（スクロール位置からの推定は廃止）。ドックロックは全削除
  - 検証: モーダルテスト18項目＋回帰22項目 ALL PASS（スナップ祖先ゼロ・任意位置での静止・表紙スナップ維持・横切替・直リンク・旧URLリダイレクト・高さ追従）
- **第8ラウンド（v2026-07-04l）— 「詳細末尾→先頭への巻き戻り」と「画面下部の恒久空白」**:
  - **空白の原因**: 高さがCSSの100dvh任せで**resize処理がゼロ**だった。iOSはアドレスバー表示/非表示でdvh更新を取りこぼすことがあり、一度ズレると回復手段が無く全ページ共通の高さがズレ続ける
  - **巻き戻りの原因**: 末尾バウンスが外側へ数pxチェーン→ドックロック判定（2px閾値）が瞬間的に反転→overflow切替→**iOS Safariはoverflow切替時に内部スクロール位置を0にリセットする癖がある**→解錠時に詳細の先頭が表示される
  - **修正**: ①body高さを `var(--app-height, 100dvh)` にし、`refitViewport()` が `innerHeight` 実測値を supply（`resize`＋`visualViewport.resize` で追従、rAFスロットル）②ドックロックにヒステリシス（2px以内で解錠／40px超でのみ施錠、中間は状態維持）③overflow切替をまたいで `blk.scrollTop` を保全 ④高さ変化時は解錠中ならドック位置を維持し、横ページャも現在ページに再整列
  - 検証: 高さ変動シミュレーション（844→760→844）で空白の恒久化なし・ドック維持・±10px揺れで巻き戻りなし、計47項目 ALL PASS

**キャッシュのハマりポイント（重要・再発注意）:**
- 上記2件の修正が「本番に反映されていない」との指摘があり調査した結果、**デプロイは成功していたがルートURL `/` に `Cache-Control: max-age=3600`（Firebaseデフォルト）が付いていた**ことが原因だった
- firebase.json の headers ルール `**/*.@(html|js|css)` は**拡張子付きパス（/index.html）にしか一致せず、拡張子のないルートパス `/` には適用されない**。ユーザーは `apps100kin.web.app/`（ルート）でアクセスするため、最大1時間古いHTMLがブラウザキャッシュから表示されていた
- 対策: firebase.json に `"source": "/"` の headers エントリを追加して `no-cache` を明示（2026-07-04対応済み）。**今後 rewrites 等でパスを増やす場合も、拡張子なしパスにはヘッダーが付かない点に注意**

---

## 0. トップページ横ページャ化（2026-07-04 前半）

index.html を「アプリ1つ＝横1ページ」のページャ構成に全面改修。

**新アーキテクチャ:**
- `<main id="pager">` が横スクロールコンテナ（`scroll-snap-type: x mandatory`）。各 `.app-page` が1アプリ分（ヒーロー＋開発の動機＋¥100 CTA＋footer）で、ページ内は縦スクロール（`overflow-y: auto`）
- body は `height: 100dvh; overflow: hidden` の固定ビューポート化。footer は各ページの縦スクロール末尾に移設（`FOOTER_HTML` テンプレート）
- **ジェスチャー処理はCSSスクロールスナップに全面委譲**。旧 `initHeroCarousel` の Pointer Events 実装（約90行）は全削除。縦横の軸判定・慣性・スナップはブラウザネイティブ。JSが持つのは「矢印クリックで `scrollTo`」「IntersectionObserver（threshold 0.6, root=pager）での現在ページ検出」「カルーセルのドット追従」のみ
- 固定矢印: `#nextBtn`（右端「次の作品」）/ `#prevBtn`（左端「前の作品」）。1ページ目では prev 非表示、最終ページでは next 非表示
- 最終ページに「近日公開」（`.coming-soon`）プレースホルダーページを自動追加（`○作目を制作中です`）
- ヒーロー内スクショカルーセルも同方式に統一（`overscroll-behavior-x: contain` で外側ページ送りへの連鎖を遮断）。ドットインジケーター付き
- `renderMoreApps`（「他のアプリ」縦カード一覧）は廃止。旧 `fitHero()`（ヒーロー高さJS計算）も廃止し `.hero { height: 100% }` に置き換え
- `scrollend` イベントはiOS Safari未対応のため不使用（IntersectionObserverで代替）

**topImages（トップ用スクショのFirestore管理化）:**
- 各アプリの `apps/{id}` ドキュメントに `topImages: [画像パス, ...]` 配列を持たせる設計に変更（2枚ずつカルーセルページに分割表示）
- **未設定時のフォールバック**: `memo-sync` のみコード内の `MEMO_SYNC_FALLBACK_IMAGES`（IMG_9266/9267/9268/9271）を使用。それ以外のアプリは `icon` 絵文字のプレースホルダー表示
- ⚠️ 残作業: Firebase Console で `apps/memo-sync` に `topImages` を登録すればフォールバックは不要になる。2作目以降は登録必須。`開発者ガイド.md` への手順追記も未実施

**来店者数カウンターの重複カウント修正:**
- `trackVisitor()` に sessionStorage ガード（キー `visitCounted`）を追加。同一タブ内のリロード・トップ⇔詳細往復では加算されず、1セッション1カウントになった
- **追加ガード（v2026-07-04j）**: `navigator.webdriver === true`（Playwright等の自動ブラウザ）と `localhost`/`127.0.0.1`（ローカル開発。firebase-configは本番Firestoreを指すため）はカウントしない。検証作業でカウンターが汚れる問題（テスト1コンテキスト=+1、1日で+50超）の恒久対策。実装後カウンターを0にリセットし、自動ブラウザ3回アクセスで増えないことを実証済み
- カウンターのリセット方法: `visitors/total` はルールで公開updateが許可されているため、認証なしREST PATCHで可能（`curl -X PATCH ".../documents/visitors/total?updateMask.fieldPaths=count" -d '{"fields":{"count":{"integerValue":"0"}}}'`）

**デスクトップレイアウトのハマりポイント:**
- PC（860px以上）の横並びヒーローでは、カルーセルの高さが親から与えられず `flex: 1 1 0` が0に潰れる（さらに flex の `align-items: stretch` が画像の `aspect-ratio` 由来の高さを打ち消す）。メディアクエリ内で `.hero-carousel-viewport { flex: 0 0 auto }` ＋ track/page `height: auto` にして画像のアスペクト比から高さを導出して解決

**検証:** Playwright（Chromium）でモバイル390×844/デスクトップ1280×800の表示、矢印での往復、ドット、リロード時のカウント非加算をローカル・本番URL両方で確認済み。実機iPhoneでのスワイプ感触の確認は未実施（推奨）。
- ⚠️ 既知の制約: iOS Safariの画面左端エッジスワイプ（ブラウザバック）はシステムジェスチャーのため奪えない。矢印ボタンで代替可能

---

## 0-旧. ヒーローカルーセル フリック根本修正（2026-07-01）※歴史的記録

> **注:** ここで実装した Pointer Events 方式は 2026-07-04 の横ページャ化で全削除され、CSSスクロールスナップ方式に置き換えられた（上記0章参照）。以下は「JS自作スワイプは二重登録・動く要素へのリスナーで壊れる」という教訓の記録として残す。

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
├── index.html           ← ホーム画面＋詳細ページ統合（2軸スナップ・本番）
├── app-detail.html      ← 転送用スタブ（?app=xxx → index.html#xxx/detail へリダイレクト）
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
- **メモアプリ本体の正規URLは `https://crossmemo.web.app`（2026-07-04確認）**。旧GitHub Pages（`kimijimasan-lgtm.github.io/howto-v2/`）も生きているが、リンク先はcrossmemoに統一する。ゲストモードは `?guest=true` 付き
- **2026-07-04 リンク修正**: Firestore `apps/memo-sync` の `guestLink` が旧GitHub Pages URLのままだった → `https://crossmemo.web.app/?guest=true` に更新。さらに `stripeLink` が**テスト用**（`test_5kQ...`）のまま残っていたのを発見 → 本番URL（`8x24gAe62bwQaYO07teUU00`）に更新（login.htmlは両方とも修正済みだったが、Firestore側が未更新だった。**リンク類はlogin.htmlとFirestoreの2箇所にあるので、変更時は必ず両方更新すること**）
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
5. ~~**カルーセル1枚目の画像差し替え**~~ → **完了**（`images/IMG_9266.PNG` として差し替え済み。ユーザー確認済み、詳細な経緯はgit履歴になし）
6. **PWAホーム画面追加の案内モーダル実装**（index.htmlへの実装はまだ未着手）
7. ~~**ゲスト制限の実装**~~ → **完了（2026-07-02、howto-v2側で実装）**
   - 実装先はメモアプリ本体 `F:\Claude学習\howto-v2`（GitHubリポジトリ `kimijimasan-lgtm/howto-v2`、GitHub Pages公開）。詳細は同ディレクトリの `CLAUDE.md`「制限・課金」セクション参照
   - 仕様: 無課金ユーザー（ゲスト・無料Googleログイン）はパネル累計3枚・カード累計7枚まで。**累計カウント方式**（削除しても枠は戻らない。RTDB `users/{uid}/stats/` に保存）。100円決済（isPremium）で無制限
   - `login.html` の制限説明文も新仕様（累計3枚・累計7枚）に更新済み
8. ~~**Stripe本番リンクの発行**~~ → **完了（2026-07-03）**
   - `login.html` の購入ボタンURLをtestモード（`test_5kQ28s9Q2ccj0pt9Kr7Re01`）から本番URL（`8x24gAe62bwQaYO07teUU00`）へ差し替え済み
9. **一斉メール送信の実送信機能**（Firebase Functions + Resend/SendGridの実装）
10. **大量アクセス対策**（設計書6章）— Cloudflare導入、ウェイティングリスト等は紹介前に着手

---

## 6. 注意事項・既知の制約

- ~~`admin/` 配下は認証なしで誰でもURLを直接開けば見える状態~~ → 2026-06-23、Firebase Auth導入により解消。`onAuthStateChanged` ガードで未ログイン/非管理者は `login.html` にリダイレクトされる。
- `src/` 配下のファイルは古いバックアップなので、編集対象は常にルート直下のファイルにすること。
- `save.bat` はユーザーがダブルクリックで `git add . && commit "auto save <日時>" && push` を実行する。Claude側で別メッセージでコミットしようとしても、既にauto saveで取り込まれて差分が無いことがある（コミット前に `git status` で確認すること）。
