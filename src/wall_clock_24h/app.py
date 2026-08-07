"""A frameless, translucent 24-hour wall clock written with PySide6."""

from __future__ import annotations

import math
import sys
from datetime import datetime

from PySide6.QtCore import QPoint, QPointF, QRectF, QTimer, QSize, Qt
from PySide6.QtGui import (QAction, QColor, QConicalGradient, QFont, QMouseEvent,
                           QPainter, QPen)
from PySide6.QtWidgets import QApplication, QMenu, QMessageBox, QToolButton, QWidget

from .__about__ import __version__


class WallClock(QWidget):
    """Paint the clock directly, leaving the area around the dial transparent."""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("24-hour Wall Clock")
        self.setMinimumSize(280, 280)
        self.resize(760, 760)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self._drag_offset: QPoint | None = None
        self._system_move_started = False
        self._resize_margin = 36
        self._resize_start_global: QPoint | None = None
        self._resize_start_size: QSize | None = None
        self._system_resize_started = False
        self.setMouseTracking(True)

        self._menu_button = QToolButton(self)
        self._menu_button.setText("☰")
        self._menu_button.setToolTip("Menu")
        self._menu_button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._menu_button.setFixedSize(36, 36)
        self._menu_button.setStyleSheet(
            "QToolButton { color: #555b62; background: rgba(255,255,255,180); "
            "border: 1px solid rgba(85,91,98,80); border-radius: 18px; "
            "font-size: 20px; }"
            "QToolButton:hover { background: rgba(255,255,255,235); }"
        )
        self._menu_button.clicked.connect(self._show_menu)

        self._timer = QTimer(self)
        self._timer.timeout.connect(self.update)
        self._timer.start(16)

    def resizeEvent(self, event: object) -> None:
        self._menu_button.move(12, 12)
        super().resizeEvent(event)

    def _show_menu(self) -> None:
        menu = QMenu(self)
        menu.setStyleSheet(
            "QMenu { background: #ffffff; color: #202226; border: 1px solid #d5d7d9; }"
            "QMenu::item { padding: 7px 28px 7px 16px; }"
            "QMenu::item:selected { background: #e9eaeb; }"
        )
        version_action = QAction("About", menu)
        version_action.triggered.connect(self._show_version)
        menu.addAction(version_action)
        menu.addSeparator()
        quit_action = QAction("Quit", menu)
        quit_action.triggered.connect(self.close)
        menu.addAction(quit_action)
        menu.exec(self._menu_button.mapToGlobal(QPoint(0, self._menu_button.height())))

    def _show_version(self) -> None:
        QMessageBox.information(
            self,
            "About",
            f"24-hour Wall Clock\nVersion {__version__}",
        )

    def paintEvent(self, _event: object) -> None:
        now = datetime.now().astimezone()
        side = float(min(self.width(), self.height()))
        center = QPointF(self.width() / 2, self.height() / 2)
        # Reduce the transparent margin between the window bounds and the
        # clock face to roughly one quarter of its previous size.
        radius = side * 0.49

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Give the transparent window area outside the dial a subtle black
        # backdrop (20% opacity) while keeping the dial itself opaque.
        painter.fillRect(self.rect(), QColor(0, 0, 0, 51))

        # A subtle shadow is the only painted area outside the dial.
        for extra, alpha in ((10.0, 10), (6.0, 18), (2.0, 28)):
            painter.setBrush(QColor(0, 0, 0, alpha))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawEllipse(center.x() - radius - extra / 2, center.y() - radius - extra / 2,
                                2 * radius + extra, 2 * radius + extra)

        # Paint the outer frame first.  The smaller gradient disk below leaves
        # a narrow plain band between the frame circumference and the color.
        painter.setBrush(QColor("#f4f4f2"))
        painter.setPen(QPen(QColor("#e4e5e6"), 1))
        painter.drawEllipse(QRectF(center.x() - radius, center.y() - radius,
                                   2 * radius, 2 * radius))

        gradient_radius = radius - side * 0.012

        afternoon = now.hour >= 12
        # Qt's conical gradient is reversed relative to CSS.  The .75 point
        # corresponds to 3 o'clock.  Keep 12--15 (afternoon) or 0--3
        # (morning) flat, and only grade the remaining 3-to-12 segment.
        gradient = QConicalGradient(center, 90)
        if afternoon:
            gradient.setColorAt(0.0, QColor("#dddddd"))
            gradient.setColorAt(0.74, QColor("#ffffff"))
            gradient.setColorAt(0.76, QColor("#ffffff"))
            gradient.setColorAt(1.0, QColor("#ffffff"))
        else:
            gradient.setColorAt(0.0, QColor("#ffffff"))
            gradient.setColorAt(0.74, QColor("#dddddd"))
            gradient.setColorAt(0.76, QColor("#dddddd"))
            gradient.setColorAt(0.999, QColor("#dddddd"))
            gradient.setColorAt(1.0, QColor("#ffffff"))

        dial = QRectF(center.x() - gradient_radius, center.y() - gradient_radius,
                      2 * gradient_radius, 2 * gradient_radius)
        painter.setBrush(gradient)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(dial)

        painter.setBrush(QColor("#ffffff"))
        painter.setPen(Qt.PenStyle.NoPen)
        # Narrow the gradient band by 10% while keeping its outer edge fixed.
        face_radius = gradient_radius * 0.874
        painter.drawEllipse(QRectF(center.x() - face_radius, center.y() - face_radius,
                                   2 * face_radius, 2 * face_radius))

        self._draw_ticks(painter, center, gradient_radius)

        seconds = now.second + now.microsecond / 1_000_000
        minutes = now.minute + seconds / 60
        hours12 = now.hour % 12 + minutes / 60
        # The original HTML percentages are relative to the dial diameter,
        # while ``radius`` is half of that diameter.
        self._draw_hand(painter, center, radius * 0.5304, radius * 0.042, hours12 * 30,
                        QColor("#202226"), shadow_alpha=46)
        self._draw_hand(painter, center, radius * 0.7592, radius * 0.0264, minutes * 6,
                        QColor("#5d6b78"), shadow_alpha=36)
        self._draw_hand(painter, center, radius * 0.86751, radius * 0.0108, seconds * 6,
                        QColor("#d44949"), shadow_alpha=0)
        self._draw_hand(painter, center, radius * 0.18, radius * 0.0108, seconds * 6 + 180,
                        QColor("#d44949"), shadow_alpha=0, from_center=False)

        painter.setBrush(QColor("#202226"))
        painter.setPen(QPen(QColor("#ffffff"), max(2.0, radius * 0.01)))
        painter.drawEllipse(QRectF(center.x() - radius * 0.024, center.y() - radius * 0.024,
                                   radius * 0.048, radius * 0.048))

        # Keep labels above the hands so they remain legible.
        self._draw_labels(painter, center, gradient_radius, now.hour)

        painter.setPen(QColor("#b4b8bc"))
        font = QFont("Sans Serif")
        font.setPixelSize(max(8, round(radius * 0.064)))
        font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, max(1.0, radius * 0.012))
        painter.setFont(font)
        timezone_rect = QRectF(center.x() - radius * 0.3, center.y() + radius * 0.22,
                               radius * 0.6, radius * 0.1)
        timezone_name = now.tzname() or "UTC"
        self._draw_outlined_text(
            painter, timezone_rect, timezone_name, Qt.AlignmentFlag.AlignCenter,
            QColor("#b4b8bc"), max(2.0, radius * 0.0075)
        )

        # Visual marker for the bottom-right resize grip: two short staple-like
        # diagonal strokes, kept subtle so they do not compete with the dial.
        grip_pen = QPen(QColor(70, 75, 80, 165), 2.5, Qt.PenStyle.SolidLine,
                        Qt.PenCapStyle.RoundCap)
        painter.setPen(grip_pen)
        painter.drawLine(QPointF(self.width() - 34, self.height() - 7),
                         QPointF(self.width() - 7, self.height() - 34))
        painter.drawLine(QPointF(self.width() - 20, self.height() - 7),
                         QPointF(self.width() - 7, self.height() - 20))
        painter.end()

    @staticmethod
    def _draw_ticks(painter: QPainter, center: QPointF, radius: float) -> None:
        for index in range(60):
            angle = math.radians(index * 6 - 90)
            major = index % 5 == 0
            # Leave a narrow clear band between the tick marks and the outer
            # circumference, as in the original HTML clock.
            outer = radius * (0.970 if major else 0.958)
            inner = radius * (0.886 if major else 0.906)
            pen = QPen(QColor("#555b62" if major else "#9aa0a6"),
                       max(1.5, radius * (0.008 if major else 0.0045)),
                       Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap)
            painter.setPen(pen)
            painter.drawLine(QPointF(center.x() + math.cos(angle) * inner,
                                     center.y() + math.sin(angle) * inner),
                             QPointF(center.x() + math.cos(angle) * outer,
                                     center.y() + math.sin(angle) * outer))

    @staticmethod
    def _draw_outlined_text(painter: QPainter, rect: QRectF, text: str,
                            alignment: Qt.AlignmentFlag, foreground: QColor,
                            outline_width: float) -> None:
        """Draw text with a visible halo, including on raster paint devices."""
        painter.setPen(QColor(255, 255, 255, 180))
        for dx, dy in (
            (-outline_width, -outline_width), (0.0, -outline_width),
            (outline_width, -outline_width), (-outline_width, 0.0),
            (outline_width, 0.0), (-outline_width, outline_width),
            (0.0, outline_width), (outline_width, outline_width),
        ):
            painter.drawText(rect.translated(dx, dy), alignment, text)
        painter.setPen(foreground)
        painter.drawText(rect, alignment, text)

    @staticmethod
    def _draw_labels(painter: QPainter, center: QPointF, radius: float, hour: int) -> None:
        font = QFont("Monospace")
        font.setStyleHint(QFont.StyleHint.TypeWriter)
        font.setPixelSize(max(24, round(radius * 0.108 * 1.44)))
        afternoon = hour >= 12
        # Move the labels 5% outward from their current position, returning
        # them to the original HTML-aligned radius.
        label_radius = radius * 0.74
        for index in range(12):
            angle = math.radians(index * 30 - 90)
            x = center.x() + math.cos(angle) * label_radius
            y = center.y() + math.sin(angle) * label_radius
            displayed = index + 12 if afternoon else index
            font.setWeight(QFont.Weight.Bold if displayed == hour else QFont.Weight.Normal)
            painter.setFont(font)
            label_rect = QRectF(x - radius * 0.15, y - radius * 0.09,
                                radius * 0.30, radius * 0.18)
            label_text = str(displayed)
            WallClock._draw_outlined_text(
                painter, label_rect, label_text, Qt.AlignmentFlag.AlignCenter,
                QColor("#111820" if displayed == hour else "#434a52"),
                max(2.0, radius * 0.010)
            )

    @staticmethod
    def _draw_hand(painter: QPainter, center: QPointF, length: float, width: float,
                   degrees: float, color: QColor, shadow_alpha: int, from_center: bool = True) -> None:
        if shadow_alpha:
            painter.save()
            painter.translate(1, 1)
            shadow = QColor(0, 0, 0, shadow_alpha)
            WallClock._draw_hand(painter, center, length, width, degrees, shadow, 0, from_center)
            painter.restore()
        painter.save()
        painter.translate(center.x(), center.y())
        painter.rotate(degrees)
        painter.setBrush(color)
        painter.setPen(Qt.PenStyle.NoPen)
        start = -length if from_center else 0
        painter.drawRoundedRect(QRectF(-width / 2, start, width, length), width / 2, width / 2)
        painter.restore()
    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            if self._in_resize_grip(event.position().toPoint()):
                window = self.windowHandle()
                self._system_resize_started = bool(
                    window and window.startSystemResize(
                        Qt.Edge.RightEdge | Qt.Edge.BottomEdge
                    )
                )
                if not self._system_resize_started:
                    self._resize_start_global = event.globalPosition().toPoint()
                    self._resize_start_size = self.size()
                return

            # Wayland and some compositors do not allow a frameless window to
            # be moved reliably with QWidget.move(). Ask the window manager to
            # perform the move when that API is available.
            window = self.windowHandle()
            self._system_move_started = bool(window and window.startSystemMove())
            if not self._system_move_started:
                self._drag_offset = event.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        if self._resize_start_global is not None and self._resize_start_size is not None:
            delta = event.globalPosition().toPoint() - self._resize_start_global
            self.resize(
                max(self.minimumWidth(), self._resize_start_size.width() + delta.x()),
                max(self.minimumHeight(), self._resize_start_size.height() + delta.y()),
            )
            return

        if self._drag_offset is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self.move(event.globalPosition().toPoint() - self._drag_offset)
            return

        if self._in_resize_grip(event.position().toPoint()):
            self.setCursor(Qt.CursorShape.SizeFDiagCursor)
        else:
            self.unsetCursor()

    def mouseReleaseEvent(self, _event: QMouseEvent) -> None:
        self._drag_offset = None
        self._system_move_started = False
        self._resize_start_global = None
        self._resize_start_size = None
        self._system_resize_started = False

    def _in_resize_grip(self, position: QPoint) -> bool:
        return (
            position.x() >= self.width() - self._resize_margin
            and position.y() >= self.height() - self._resize_margin
        )


def main() -> int:
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(True)
    window = WallClock()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
