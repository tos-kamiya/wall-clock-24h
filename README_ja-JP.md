# wall-clock-24h

PySide6 で作られた、フレームレス・半透明の24時間表示壁掛け時計です。

![wall-clock-24h のスクリーンショット](screenshot1.png)

## インストール

[pipx](https://pipx.pypa.io/) を使って、GitHub から直接インストールできます。

```console
pipx install git+https://github.com/tos-kamiya/wall-clock-24h.git
```

## 使い方

以下のコマンドで起動します。

```console
wall-clock-24h
```

ウィンドウには枠がなく、背景は半透明です。次の操作ができます。

- マウスの左ボタンでドラッグして移動
- 右下をドラッグしてサイズ変更
- 左上のハンバーガーメニューからバージョン表示または終了

システムのタイムゾーンを表示し、現在時の数字を強調します。

## 版の種類

このリポジトリには、次の2種類が含まれています。

- `pipx` でインストールして `wall-clock-24h` として起動する PySide6 アプリ版
- ブラウザで開いて使えるスタンドアロン HTML 版 [wall-clock-24h.html](wall-clock-24h.html)

## ライセンス

`wall-clock-24h` は [MIT](https://spdx.org/licenses/MIT.html) ライセンスのもとで配布されています。
