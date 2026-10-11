# 指揮官 Live2D 素材

`source/commander.psd`（800×2000）を、Live2D Cubism Editor で動かせるように分割した素材一式です。

- **commander_live2d.psd**：Cubism Editor に読み込む PSD（43レイヤー）
- **viewer/index.html**：ブラウザーで動作を確認できるプレビュー。表情切り替え、まばたき、視線追従、髪と飾緒の物理演算を確認できます
- **cubism/expressions/*.exp3.json**：表情ファイル8種類
- **cubism/commander.physics3.json**：髪と飾緒の物理演算設定

> Live2D のモデル本体（`.moc3` / `.model3.json`）は、Cubism Editor でメッシュやデフォーマー、パラメーターを設定して書き出す必要があります。ここに含まれるのは、その前段の PSD と設定ファイルです。表情ファイルと物理演算ファイルは、モデルを下記のパラメーター ID で作ると、そのまま使えます。

## PSD でしたこと

元の PSD は、色が素材ごとのレイヤーに、線画が全身で1枚に入っていたため、そのままでは動かせません。次の処理をしています。

1. **クリッピングと乗算の統合**：影のクリッピングレイヤー（乗算）を、下の色レイヤーに焼き込みました。Cubism はクリッピングや描画モードを読み込みません。
2. **線画の分配**：1枚の線画を、各線が縁取っているパーツ（手前にあるもの優先）に振り分け、色と統合しました。
3. **髪の分割**：線画を境界に、前髪・横髪4房（向かって左右 × 内・外）・後ろ髪に分けました。
4. **塗り足し**：動いたときに見える部分を描き足しました。
   - 前髪の下の額と、**隠れていた左目・左眉**（見えている右目を左右反転して作成）
   - あごの下の首、頭の後ろの後ろ髪
   - 飾緒の下の袖（色と輪郭線を補完）
5. **表情差分の描き下ろし**：目閉じ線、笑い目、縮んだ瞳、口5種類（微笑み・への字・照れ・あ・お）、頬染め、汗

静止状態で全レイヤーを重ねると、元のイラストと一致します（飾緒のふちの数十ピクセルを除き、差は 16/255 以下）。差分レイヤーは非表示で入っています。

### レイヤー構成

| フォルダー | レイヤー | 用途 |
| --- | --- | --- |
| 頭 | 汗 | 表情差分（非表示） |
| 頭/目_向かって右 | 右眉、右目_笑い目・目閉じ（非表示）、上まつげ、二重線、下まつげ、ハイライト、瞳_縮小（非表示）、瞳、白目 | 見えている目。眉と目は元絵と同じく髪の上に描画（透け眉） |
| 頭 | 帽子 | |
| 頭/髪 | 前髪、横髪_向かって右_内、横髪_向かって左_内、横髪_向かって右_外、横髪_向かって左_外 | 物理演算で揺らす房 |
| 頭 | 頬染め | 表情差分（非表示） |
| 頭/口 | 口_お、口_あ、口_照れ、口_への字、口_微笑み（すべて非表示）、口_通常 | |
| 頭 | 鼻 | |
| 頭/目_向かって左(前髪下) | 左眉、左目_*（右目と同じ構成） | 前髪の下に隠れた目。前髪が揺れたときにのぞく |
| 頭 | 顔 | 前髪の下まで塗り足し済み |
| 首・襟 | 襟_シャツ_ネクタイ、首 | 首はあごの下まで塗り足し済み |
| 後ろ髪 | 後ろ髪 | |
| 体 | 飾緒、上半身、裾裏、脚 | |

## Cubism Editor での組み立て手順

1. `commander_live2d.psd` を読み込み、全パーツに自動メッシュを適用します。目・口・髪の房は細かめにします。
2. **クリッピング**：`右目_瞳`・`右目_瞳_縮小`・`右目_ハイライト` のクリッピング ID に `右目_白目` を指定します。左目も同様です。
3. **目**：`ParamEyeLOpen` / `ParamEyeROpen`（0〜1.2）。0 で白目・瞳・上まつげ・二重線を閉じ線の位置まで縮め、`目閉じ` を表示します。`ParamEyeLSmile` / `ParamEyeRSmile` が 1 のときは `笑い目` を表示します。`ParamEyeBallForm` は −1 で `瞳_縮小` に切り替えます。
4. **眉**：`ParamBrowLY` / `ParamBrowRY`（上下）、`ParamBrowLAngle` / `ParamBrowRAngle`（＋1 で眉頭が下がる怒り、−1 で眉頭が上がる困り）。
5. **口**：`ParamMouthForm`（−1 への字 〜 ＋1 微笑み）と `ParamMouthOpenY`（0〜1）の2軸で口レイヤーの不透明度を切り替えます。開いた口は Form が負なら `口_お`、それ以外は `口_あ` です。`ParamMouthShy`（0〜1）で `口_照れ` に切り替えます。
6. **頬・汗**：`ParamCheek`（0〜1）で `頬染め`、`ParamSweat`（0〜1）で `汗` の不透明度を変えます。
7. **顔の向き**：頭フォルダー全体にワープデフォーマーを付け、`ParamAngleX` / `ParamAngleY` / `ParamAngleZ` を設定します。首は上端だけを頭に追従させます。
8. **髪と飾緒**：房ごとに根元を軸にした回転デフォーマー（またはワープ）を付け、下表の物理演算出力パラメーターで毛先ほど大きく動くようにします。
9. **物理演算**：物理演算設定に `cubism/commander.physics3.json` を読み込み、入力と出力のパラメーター ID が一致していることを確認します。
10. 書き出し時に `cubism/expressions/*.exp3.json` を表情としてモデル設定に登録します。

### パラメーター ID

| ID | 範囲 | 内容 |
| --- | --- | --- |
| ParamAngleX / ParamAngleY / ParamAngleZ | −30〜30 | 顔の左右・上下・傾き |
| ParamBodyAngleX / ParamBodyAngleZ | −10〜10 | 体の左右・傾き |
| ParamBreath | 0〜1 | 呼吸 |
| ParamEyeLOpen / ParamEyeROpen | 0〜1.2 | 目の開閉（1.2 は見開き） |
| ParamEyeLSmile / ParamEyeRSmile | 0〜1 | 笑い目 |
| ParamEyeBallX / ParamEyeBallY | −1〜1 | 視線 |
| ParamEyeBallForm | −1〜0 | 瞳の収縮 |
| ParamBrowLY / ParamBrowRY | −1〜1 | 眉の上下 |
| ParamBrowLAngle / ParamBrowRAngle | −1〜1 | 眉の角度 |
| ParamMouthForm | −1〜1 | 口の形 |
| ParamMouthOpenY | 0〜1 | 口の開閉 |
| ParamMouthShy（追加） | 0〜1 | 照れ口 |
| ParamCheek | 0〜1 | 頬染め |
| ParamSweat（追加） | 0〜1 | 汗 |
| ParamHairFront | −1〜1 | 前髪の揺れ（物理演算の出力） |
| ParamHairSideL_In / ParamHairSideL_Out（追加） | −1〜1 | 向かって左の横髪 内・外 |
| ParamHairSideR_In / ParamHairSideR_Out（追加） | −1〜1 | 向かって右の横髪 内・外 |
| ParamHairBack | −1〜1 | 後ろ髪 |
| ParamAiguillette（追加） | −1〜1 | 飾緒 |

「追加」は Cubism の標準パラメーターにない ID です。同じ ID で新規作成してください。表情ファイルは左右の目と眉に同じ値を入れているため、L/R をどちらの目に割り当てても動作します。

### 表情

| 表情 | ファイル | 主な値 |
| --- | --- | --- |
| 通常 | normal.exp3.json | 変更なし |
| 笑顔 | smile.exp3.json | 目 0（乗算）、笑い目 1、口 微笑み |
| 怒り | angry.exp3.json | 眉角度 ＋1、眉 −0.5、目 0.8、口 への字、瞳 −0.3 |
| 驚き | surprised.exp3.json | 目 1.2、瞳 −1、眉 ＋1、口 開き 0.8・お |
| 照れ | shy.exp3.json | 頬染め 1、視線 X −0.7、目 0.75、照れ口 |
| 困り | troubled.exp3.json | 眉角度 −1、目 0.85、口 −0.6、汗 1 |
| ジト目 | half_eyes.exp3.json | 目 0.42、眉 −0.6 |
| 得意げ | smug.exp3.json | 目 0.62、眉 ＋0.4・角度 ＋0.35、口 微笑み 0.8 |

## 再生成

```sh
pip install psd-tools numpy pillow scipy opencv-python-headless
python3 tools/build_parts.py   # パーツ分割 → build/
python3 tools/export_psd.py    # commander_live2d.psd
python3 tools/build_cubism.py  # 表情・物理演算ファイル
python3 tools/build_viewer.py  # viewer/index.html
```

表情の値は `tools/expressions.json` にまとめてあり、プレビューと `.exp3.json` の両方がここから作られます。
