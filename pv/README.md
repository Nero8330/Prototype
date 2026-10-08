# DRONEFALL PV（87秒）

文字とロゴだけで構成した DRONEFALL のプロモーション映像です。

- 完成動画：`out/DRONEFALL_PV.mp4`（1920×1080 / 30fps / 87.0秒 / H.264 + AAC）
- BGM：Diamond Eyes - Flutter [NCS Release] の 0:00〜1:27（最後の1.4秒をフェードアウト）

## 構成

| 時間 | 内容 |
|---|---|
| 0:00–0:12 | 意味深な台詞（縦書き）「あの日、世界は、人の手を離れた。」ほか |
| 0:12–0:24 | 世界の Keyword #01〜#05（大暴走／母機／フォース／フォース汚染／フォースビースト） |
| 0:24–0:37 | 1回目のドロップ：ドローンフォール（落下循環）と、都市の Keyword #06〜#12 |
| 0:37–0:48 | 改造兵として描くパート Keyword #13〜#16（隊員個人の紹介はなし） |
| 0:48–1:04 | 敵（赤）：機械の王「■■■■■」と Keyword #17〜#26 |
| 1:04–1:12 | 作戦開始と各章（プロローグ〜第六章）、最後通告 |
| 1:12–1:20 | 2回目のドロップ：最終決戦 |
| 1:20–1:27 | タイトル「DRONEFALL／ドローンフォール」で終了 |

- 色：味方側はオレンジと灰色、敵側は赤。
- キーワードカードには、用語解説（シキ・アケボシ台詞版）の説明文を全文入れています。話者名は出さず、アルケトラの名前は「■■■■■」に置き換えています。
- カードの切り替えは BGM のビート（159.98 BPM）に合わせています。同じ背景パターンが続かないようにしています（`PV.validate()` で確認）。

## ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | 1920×1080 の舞台とスタイル |
| `engine.js` | 時刻 t のフレームを描く `renderAt(t)`、背景、アニメーション、グリッチ |
| `scenes.js` | 絵コンテ（シーンの並びとレイアウト） |
| `terms.js` | キーワードの説明文・引用・英語名 |
| `emblems.js` | 紋章（第零特設班／フロンティア／機械の王／守護機）とアイコン描画 |
| `render.mjs` | Playwright で全フレームを書き出し、ffmpeg で BGM と合成 |
| `tools/` | テクスチャ生成、アイコン生成、フォントのサブセット化 |

## 書き出し方

```sh
# 確認用の静止画（秒数をカンマ区切り）
node render.mjs stills /tmp/stills 12.5,40,82

# 本番（BGM の mp3 を指定）
node render.mjs video "Diamond Eyes - Flutter [NCS Release].mp3" out/DRONEFALL_PV.mp4 4
```

ブラウザで `index.html?t=12.5` を開くと、その時刻の画面を確認できます（ローカルサーバー経由で開いてください）。

文字を変えたときは `python3 tools/subset_fonts.py` でフォントを作り直します（使う文字だけを収録しているため）。

## クレジット

- Music: Diamond Eyes - Flutter [NCS Release]. Music provided by NoCopyrightSounds. 動画を公開する際は、概要欄に NCS 指定のクレジットを記載してください。
- フォント（SIL Open Font License）：Shippori Mincho、Cormorant Garamond、Jost
- アイコン：Tabler Icons（MIT License）。一部の図形は独自に作成
