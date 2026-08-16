# wall-clock-24h

24時間表示のアナログ壁掛け時計です。午前は 0～11、午後は 12～23 の数字を表示し、現在の時刻にあたる数字を強調します。

![wall-clock-24h のスクリーンショット](screenshot1.png)

## 収録内容

このリポジトリには、次の3種類を用意しています。

- `pipx` でインストールし、`wall-clock-24h` コマンドで起動する PySide6 デスクトップアプリ
- デスクトップの壁紙（ウィンドウの背後）に時計を表示する GNOME Shell 拡張 [gnome-shell-extension](gnome-shell-extension)
- ブラウザで開いて使えるスタンドアロン版 [wall-clock-24h.html](wall-clock-24h.html)

## デスクトップアプリ

[pipx](https://pipx.pypa.io/) を使って、GitHub から直接インストールできます。

```console
pipx install git+https://github.com/tos-kamiya/wall-clock-24h.git
```

次のコマンドで起動します。

```console
wall-clock-24h
```

ウィンドウには枠がなく、背景は半透明です。次の操作に対応しています。

- マウスの左ボタンでドラッグして移動
- 右下の角をドラッグしてサイズ変更
- 左上のハンバーガーメニューからバージョンを表示したり終了したりする

システムのタイムゾーンを表示し、現在の時刻にあたる数字を強調します。

## GNOME ウィジェット

GNOME 版は、同じ 24 時間表示のアナログ時計をデスクトップの壁紙（ウィンドウの背後）に表示する Shell 拡張です。

`gnome-shell-extension` ディレクトリで、次のコマンドを実行してインストールします。

```console
./install.sh
gnome-extensions enable wall-clock-24h@tos-kamiya.github.com
```

Wayland を使用している場合は、初回インストール後にいったんログアウトして再度ログインしてから、拡張を有効にしてください。

拡張を有効にすると、次の操作ができます。

- ドラッグして移動
- 時計の上でスクロールしてサイズ変更
- 右クリックで設定を開く

パネル（トレイ）の時計アイコンから、次の操作ができます。

- 時計を壁紙のすぐ上に表示するか、すべてのウィンドウより手前に表示するかを切り替え
- サイズを S（280px）/ M（400px）/ L（560px）から選択

Desktop Icons NG が有効な場合は、時計を手前に表示してから移動し、終わったら壁紙の上に戻してください。時計の上でスクロールすれば、好みのサイズに調整できます。

GNOME Shell 45〜50 に対応しています。

## ライセンス

`wall-clock-24h` は [MIT](https://spdx.org/licenses/MIT.html) ライセンスのもとで配布されています。
