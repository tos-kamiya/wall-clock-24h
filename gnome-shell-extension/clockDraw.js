import Cairo from 'gi://cairo';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';

const WHITE = [1, 1, 1];
const GRAY = hexToRgb('#dddddd');
const INK = hexToRgb('#202226');
const MINUTE_HAND = hexToRgb('#5d6b78');
const SECOND_HAND = hexToRgb('#d44949');
const TICK_MAJOR = hexToRgb('#555b62');
const TICK_MINOR = hexToRgb('#9aa0a6');
const FRAME = hexToRgb('#f4f4f2');
const FRAME_EDGE = hexToRgb('#e4e5e6');
const LABEL = hexToRgb('#434a52');
const LABEL_ACTIVE = hexToRgb('#111820');
const TIMEZONE = hexToRgb('#b4b8bc');

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function lerpColor(a, b, t) {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

function ringColor(t, afternoon) {
    if (afternoon) {
        if (t <= 0.25)
            return WHITE;
        return lerpColor(WHITE, GRAY, (t - 0.25) / 0.75);
    }
    if (t <= 0.25)
        return GRAY;
    return lerpColor(GRAY, WHITE, (t - 0.25) / 0.75);
}

function roundedRect(cr, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    cr.newSubPath();
    cr.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
    cr.arc(x + width - r, y + r, r, 1.5 * Math.PI, 2 * Math.PI);
    cr.arc(x + width - r, y + height - r, r, 0, 0.5 * Math.PI);
    cr.arc(x + r, y + height - r, r, 0.5 * Math.PI, Math.PI);
    cr.closePath();
}

function setSourceRgb(cr, rgb, alpha = 1) {
    if (alpha >= 1)
        cr.setSourceRGB(rgb[0], rgb[1], rgb[2]);
    else
        cr.setSourceRGBA(rgb[0], rgb[1], rgb[2], alpha);
}

function drawOutlinedText(cr, text, cx, cy, pixelSize, rgb, outline, weight, letterSpacing = 0, family = 'Monospace') {
    const layout = PangoCairo.create_layout(cr);
    const font = new Pango.FontDescription();
    font.set_family(family);
    font.set_weight(weight);
    font.set_absolute_size(Math.max(8, pixelSize) * Pango.SCALE);
    layout.set_font_description(font);
    layout.set_text(text, -1);

    if (letterSpacing) {
        const attrs = new Pango.AttrList();
        attrs.insert(Pango.attr_letter_spacing_new(Math.round(letterSpacing * Pango.SCALE)));
        layout.set_attributes(attrs);
    }

    const [textWidth, textHeight] = layout.get_pixel_size();
    cr.save();
    cr.translate(cx - textWidth / 2, cy - textHeight / 2);
    PangoCairo.layout_path(cr, layout);
    cr.setLineWidth(outline * 2);
    cr.setSourceRGBA(1, 1, 1, 0.72);
    cr.strokePreserve();
    setSourceRgb(cr, rgb);
    cr.fill();
    cr.restore();
}

function drawHand(cr, cx, cy, length, width, degrees, rgb, shadowAlpha, fromCenter = true) {
    const start = fromCenter ? -length : 0;
    if (shadowAlpha) {
        cr.save();
        cr.translate(cx + 1, cy + 1);
        cr.rotate(degrees * Math.PI / 180);
        setSourceRgb(cr, [0, 0, 0], shadowAlpha / 255);
        roundedRect(cr, -width / 2, start, width, length, width / 2);
        cr.fill();
        cr.restore();
    }

    cr.save();
    cr.translate(cx, cy);
    cr.rotate(degrees * Math.PI / 180);
    setSourceRgb(cr, rgb);
    roundedRect(cr, -width / 2, start, width, length, width / 2);
    cr.fill();
    cr.restore();
}

export function readNow() {
    const now = GLib.DateTime.new_now_local();
    return {
        hour: now.get_hour(),
        minute: now.get_minute(),
        second: now.get_second() + now.get_microsecond() / 1_000_000,
        timezone: now.get_timezone_abbreviation() || 'UTC',
    };
}

export function drawClock(cr, width, height, now, {showSeconds = true, showTimezone = true} = {}) {
    const side = Math.min(width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = side * 0.49;
    const afternoon = now.hour >= 12;
    const gradientRadius = radius - side * 0.012;
    const faceRadius = gradientRadius * 0.874;

    for (const [extra, alpha] of [[10, 0.10], [6, 0.18], [2, 0.28]]) {
        cr.setSourceRGBA(0, 0, 0, alpha);
        cr.arc(cx, cy, radius + extra / 2, 0, 2 * Math.PI);
        cr.fill();
    }

    setSourceRgb(cr, FRAME);
    cr.arc(cx, cy, radius, 0, 2 * Math.PI);
    cr.fillPreserve();
    cr.setLineWidth(1);
    setSourceRgb(cr, FRAME_EDGE);
    cr.stroke();

    const steps = 180;
    for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps + 0.5 / steps;
        const a0 = (t0 * 360 - 90) * Math.PI / 180;
        const a1 = (t1 * 360 - 90) * Math.PI / 180;
        setSourceRgb(cr, ringColor(t0, afternoon));
        cr.moveTo(cx, cy);
        cr.lineTo(cx + Math.cos(a0) * gradientRadius, cy + Math.sin(a0) * gradientRadius);
        cr.lineTo(cx + Math.cos(a1) * gradientRadius, cy + Math.sin(a1) * gradientRadius);
        cr.closePath();
        cr.fill();
    }

    cr.setSourceRGB(1, 1, 1);
    cr.arc(cx, cy, faceRadius, 0, 2 * Math.PI);
    cr.fill();

    for (let index = 0; index < 60; index++) {
        const angle = (index * 6 - 90) * Math.PI / 180;
        const major = index % 5 === 0;
        const outer = gradientRadius * (major ? 0.970 : 0.958);
        const inner = gradientRadius * (major ? 0.886 : 0.906);
        cr.setLineWidth(Math.max(1.5, gradientRadius * (major ? 0.008 : 0.0045)));
        setSourceRgb(cr, major ? TICK_MAJOR : TICK_MINOR);
        cr.setLineCap(Cairo.LineCap.ROUND);
        cr.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        cr.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        cr.stroke();
    }

    const seconds = now.second;
    const minutes = now.minute + seconds / 60;
    const hours12 = now.hour % 12 + minutes / 60;

    drawHand(cr, cx, cy, radius * 0.5304, radius * 0.042, hours12 * 30, INK, 46);
    drawHand(cr, cx, cy, radius * 0.7592, radius * 0.0264, minutes * 6, MINUTE_HAND, 36);
    if (showSeconds) {
        drawHand(cr, cx, cy, radius * 0.86751, radius * 0.0108, seconds * 6, SECOND_HAND, 0);
        drawHand(cr, cx, cy, radius * 0.18, radius * 0.0108, seconds * 6 + 180, SECOND_HAND, 0, false);
    }

    const hub = radius * 0.024;
    setSourceRgb(cr, INK);
    cr.arc(cx, cy, hub, 0, 2 * Math.PI);
    cr.fillPreserve();
    cr.setLineWidth(Math.max(2, radius * 0.01));
    cr.setSourceRGB(1, 1, 1);
    cr.stroke();

    const labelRadius = gradientRadius * 0.74;
    const labelSize = Math.max(24, radius * 0.108 * 1.44);
    for (let index = 0; index < 12; index++) {
        const angle = (index * 30 - 90) * Math.PI / 180;
        const displayed = afternoon ? index + 12 : index;
        const active = displayed === now.hour;
        drawOutlinedText(
            cr,
            String(displayed),
            cx + Math.cos(angle) * labelRadius,
            cy + Math.sin(angle) * labelRadius,
            labelSize,
            active ? LABEL_ACTIVE : LABEL,
            Math.max(2, radius * 0.010),
            active ? Pango.Weight.BOLD : Pango.Weight.NORMAL
        );
    }

    if (showTimezone) {
        drawOutlinedText(
            cr,
            now.timezone,
            cx,
            cy + radius * 0.27,
            Math.max(8, radius * 0.064),
            TIMEZONE,
            Math.max(2, radius * 0.0075),
            Pango.Weight.NORMAL,
            Math.max(1, radius * 0.012),
            'Sans'
        );
    }
}
