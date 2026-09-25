# 作品塔 — 毎週作品の3Dアーカイブ

19テーマ × 3作品 = 57作品を、三角柱を19段ねじりながら積み上げた1本の塔として見せるWebサイトです。
スクロールで塔を螺旋状に登り、面ごとに作品の録画が再生されます。Three.js + Vite の静的サイトで、GitHub Pages にそのまま置けます。

## 見せ方

- 1段 = 1テーマ。三角柱の3面にその週の3作品を配置し、段ごとに 13° ずつねじって積んでいます。順番はテーマフォルダの番号(`01_自己紹介アート` など)。
- 段の本体はテーマごとに形が違います(`src/bodies.js`)。粒子の柱、日めくりの紙束、キャンディ、イコライザ、ボクセル、棒グラフ、チケット、笹と短冊、水槽、ログハウス、屋台、曇りガラス、軌道の輪、溶けたクロムなど。
- 材質・光・周囲の装飾と本体の種類は `src/themes.js` で定義。
- スクロール1単位で次の面へ。カメラは常に同じ向きに回りながら登ります。入口(足元から見上げ)→ 57作品 → 全景(目次)。
- 今見ている面と前後1面だけ動画を再生し、離れた動画は解放します(57本あっても軽い)。
- 面をクリックで寄り(もう一度で戻る)。右端の目次・全景の一覧・キーボード(↑↓ Home End)で移動できます。

## 開発

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ に静的ファイルを出力
```

## データの更新

テーマの順番は `毎週作品/` 直下の番号付きフォルダ(`NN_テーマ名`)から、作品の種別は `作品紹介映像/manifest.json` から取ります。

| ファイル | 役割 |
| --- | --- |
| `tools/build_data.py` | manifest + 説明文 + 画像サイズ + git remote → `src/works.json` |
| `tools/desc/*.json` | 作品ごとの `tagline` / `desc` / `tech` / `url`。文面を直すときはここを編集 |
| `public/captures/NN/<作品名>.mp4 / .jpg` | `build_data.py` が各テーマの `Captures/` から複製する録画と、640px幅のサムネイル |

説明文を直したり、フォルダ番号や録画を変えたりしたら:

```bash
npm run data       # 録画・サムネイルの同期と src/works.json の再生成
```

## 公開

公開先: https://gil0304.github.io/weekly-works-tower/ (リポジトリ: https://github.com/gil0304/weekly-works-tower)

`main` に push すると GitHub Actions(`.github/workflows/deploy.yml`)がビルドして GitHub Pages に配置します。動画は `public/captures/` ごとリポジトリに入れています(合計約 80MB、1ファイル最大 9MB)。

```bash
npm run data && git add -A && git commit -m "更新" && git push
```

## 構成

- `src/main.js` — レンダラ、カメラの経路(入口 / 各面 / 全景)、スクロール、クリック、HUD
- `src/tower.js` — 段の組み立て(本体・台座・光る縁・画面・ラベル)
- `src/bodies.js` — 19種類の本体の形
- `src/themes.js` — 19テーマの材質と装飾の定義
- `src/decor.js` — 装飾の実装(粒子、リング、棒グラフ、提灯、星、丸太、ヘリックスなど)
- `src/text.js` — Canvas で描いた文字のテクスチャ
- `src/video.js` — 近くの作品だけ動画を読み込む管理
