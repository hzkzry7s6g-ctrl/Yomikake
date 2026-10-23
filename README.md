# よみかけ — 読書ノート(PWA)

読みかけの本と、登場人物・関係・メモを **タップ中心で** 記録する個人用の読書アプリです。
データは端末内(IndexedDB)だけに保存します。ログインは不要で、オフラインでも動きます。

## できること
- **本棚**: 読書中 / 読みたい / 読了 / 中断。バーコード(ISBN)かタイトル検索で1タップ登録(openBD + Google Books)
- **ホームの4ボタン**: `＋10ページ`(1タップ)、`ここまで`、`メモ`、`人物`
- **スタンプメモ**: 🔖しおり ⭐大事 ❓わからない 🔍伏線かも など。タップした瞬間に現在ページつきで保存。文字は任意
- **登場人物と相関図**: 名前だけで連続追加。人物A → 人物B → 関係チップ の3タップで関係を作れる。相関図はドラッグで並べ替え可能
- **ネタバレ防止**: 人物・関係・用語は登録時のページで「判明」として記録。現在ページより先の情報は隠す
- **復習タブ**: 本を開くと、前回のしおり・ここまでの人物と相関図・最近のメモを最初に表示
- **用語・設定集**: 本ごとに管理するので、他の本の設定と混ざらない
- **iCloud で同期**: iCloud Drive に置いた `yomikake-sync.json` を通して端末間で記録をそろえる。両方の端末で書いた記録はマージされ、削除も伝わる(`src/db/actions.ts` の `mergeAll`)

## 開発
```sh
npm install
npm run dev        # http://localhost:5173 (--host 付きなので同じ Wi-Fi のスマホからも開ける)
npm test           # 単体テスト(ネタバレ防止フィルタ)
npm run test:e2e   # E2E(モバイル画面サイズ)。Chromium の場所は CHROMIUM_PATH で指定可
npm run build      # dist/ に PWA を出力
```

## スマホ・iPad で使う
公開URL: **https://hzkzry7s6g-ctrl.github.io/Yomikake/**

`main` に push すると GitHub Actions がビルドして GitHub Pages に公開します(`.github/workflows/deploy.yml`)。
Safari で URL を開き、「共有」→「ホーム画面に追加」でアプリとして使えます。
記録はその端末の中に保存され、GitHub には送られません。

### iPhone と iPad で記録をそろえる
1. 片方の端末で「☁️ iCloud で同期」→「② iCloud へ保存」→「"ファイル"に保存」→ iCloud Drive に保存
2. もう片方の端末で「① iCloud から取り込む」→ そのファイルを選ぶ
3. 以降は、読む前に①、読み終わったら②(保存時は同じファイルを置き換える)

## 構成
- `src/db/` — Dexie のスキーマ(`db.ts`)、書き込み処理(`actions.ts`)、読み取りフック(`hooks.ts`)
- `src/lib/spoiler.ts` — 現在ページによる表示フィルタ
- `src/components/` — QuickActions(4ボタン)、各種ボトムシート
- `src/features/` — shelf(ホーム・追加・スキャナ)、book(本の画面とタブ)、characters(人物と関係)、graph(相関図)
