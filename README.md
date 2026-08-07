# wall-clock-24h

A frameless, translucent 24-hour wall clock built with PySide6.

![wall-clock-24h screenshot](screenshot1.png)

## Installation

Install the application with [pipx](https://pipx.pypa.io/) directly from GitHub:

```console
pipx install git+https://github.com/tos-kamiya/wall-clock-24h.git
```

## Usage

Launch the clock with:

```console
wall-clock-24h
```

The window has no frame and uses a translucent background. You can:

- drag the clock with the left mouse button;
- resize it from the bottom-right corner;
- open the hamburger menu in the top-left corner to view the version or quit.

The clock displays the system time zone and highlights the current hour.

## Editions

This repository contains two editions:

- the PySide6 desktop application, installed with `pipx` and launched as `wall-clock-24h`;
- the standalone browser version in [wall-clock-24h.html](wall-clock-24h.html).

## License

`wall-clock-24h` is distributed under the terms of the [MIT](https://spdx.org/licenses/MIT.html) license.
