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

このリポジトリには、次の3種類が含まれています。

- `pipx` でインストールして `wall-clock-24h` として起動する PySide6 アプリ版
- デスクトップの壁紙の上に載る GNOME Shell 拡張 [gnome-shell-extension](gnome-shell-extension)
- ブラウザで開いて使えるスタンドアロン HTML 版 [wall-clock-24h.html](wall-clock-24h.html)

## GNOME ウィジェット

GNOME 版は、同じ 24 時間アナログ時計をデスクトップの壁紙（ウィンドウの後ろ）に描く Shell 拡張です。

`gnome-shell-extension` ディレクトリからインストールします。

```console
./install.sh
gnome-extensions enable wall-clock-24h@tos-kamiya.github.com
```

Wayland では、初回インストールのあとにログアウトして入り直し、そのあとで拡張を有効にしてください。

有効化すると、次の操作ができます。

- ドラッグして移動
- 時計の上でスクロールしてサイズ変更
- 右クリックで設定を開く

トレイの時計アイコンから、次の操作ができます。

- 壁紙のすぐ上に置くか、すべてのウィンドウより手前に出すかを切り替え
- 大きさを S（280px）/ M（400px）/ L（560px）から選択

Desktop Icons NG が有効なときは手前に出してから移動し、終わったら壁紙の上に戻してください。スクロールでの細かいサイズ変更もそのまま使えます。

GNOME Shell 45〜50 に対応しています。

## ライセンス

`wall-clock-24h` は [MIT](https://spdx.org/licenses/MIT.html) ライセンスのもとで配布されています。
