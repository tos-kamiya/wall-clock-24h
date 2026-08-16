import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {drawClock, readNow} from './clockDraw.js';

function createIndicator(extension) {
    const settings = extension.getSettings();
    const indicator = new PanelMenu.Button(0.5, extension.metadata.name, false);

    const box = new St.BoxLayout({
        style_class: 'panel-status-menu-box',
    });
    box.add_child(new St.Icon({
        icon_name: 'preferences-system-time-symbolic',
        style_class: 'system-status-icon',
    }));
    indicator.add_child(box);

    const frontItem = new PopupMenu.PopupSwitchMenuItem(
        _('In front of windows'),
        settings.get_boolean('above-windows')
    );
    frontItem.connect('toggled', (_item, state) => {
        settings.set_boolean('above-windows', state);
    });
    indicator.menu.addMenuItem(frontItem);

    indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const prefsItem = new PopupMenu.PopupMenuItem(_('Settings'));
    prefsItem.connect('activate', () => {
        try {
            extension.openPreferences();
        } catch (error) {
            console.error('[wall-clock-24h] failed to open preferences', error);
        }
    });
    indicator.menu.addMenuItem(prefsItem);

    settings.connectObject(
        'changed::above-windows', () => {
            const value = settings.get_boolean('above-windows');
            if (frontItem.state !== value)
                frontItem.setToggleState(value);
        },
        indicator
    );

    return indicator;
}

class DesktopClock {
    constructor(extension) {
        this._extension = extension;
        this._settings = extension.getSettings();
        this._drag = null;
        this._grab = null;
        this._timeoutId = 0;
        this._raiseId = 0;

        this._container = new St.Widget({
            name: 'wall-clock-24h-container',
            reactive: false,
            layout_manager: new Clutter.FixedLayout(),
        });

        this._actor = new St.DrawingArea({
            name: 'wall-clock-24h',
            style_class: 'wall-clock-24h',
            reactive: true,
            track_hover: true,
            can_focus: true,
        });
        this._container.add_child(this._actor);

        this._actor.connect('repaint', this._onRepaint.bind(this));
        this._actor.connect('button-press-event', this._onButtonPress.bind(this));
        this._actor.connect('button-release-event', this._onButtonRelease.bind(this));
        this._actor.connect('motion-event', this._onMotion.bind(this));
        this._actor.connect('scroll-event', this._onScroll.bind(this));

        this._settings.connectObject(
            'changed::size', () => this._applySize(true),
            'changed::x', () => this._applyPosition(),
            'changed::y', () => this._applyPosition(),
            'changed::show-seconds', () => this._actor.queue_repaint(),
            'changed::show-timezone', () => this._actor.queue_repaint(),
            'changed::above-windows', () => this._applyLayer(),
            this
        );
        Main.layoutManager.connectObject(
            'monitors-changed', () => this._relayout(),
            this
        );
        global.display.connectObject(
            'restacked', () => this._queueRaise(),
            this
        );

        this._applyLayer();
        this._relayout();

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            this._actor.queue_repaint();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _applyLayer() {
        const parent = this._container.get_parent();
        if (parent)
            parent.remove_child(this._container);

        if (this._settings.get_boolean('above-windows')) {
            Main.layoutManager.uiGroup.add_child(this._container);
            this._container.raise_top();
        } else {
            const bgGroup = Main.layoutManager._backgroundGroup;
            if (bgGroup)
                bgGroup.add_child(this._container);
            else
                Main.layoutManager.uiGroup.insert_child_at_index(this._container, 0);
        }
        this._relayout();
    }

    _queueRaise() {
        if (!this._settings.get_boolean('above-windows'))
            return;
        if (this._raiseId)
            return;
        this._raiseId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._raiseId = 0;
            if (this._container.get_parent() === Main.layoutManager.uiGroup)
                this._container.raise_top();
            return GLib.SOURCE_REMOVE;
        });
    }

    _primaryMonitor() {
        return Main.layoutManager.primaryMonitor ?? Main.layoutManager.monitors[0];
    }

    _relayout() {
        const monitor = this._primaryMonitor();
        if (!monitor)
            return;
        this._container.set_position(monitor.x, monitor.y);
        this._container.set_size(monitor.width, monitor.height);
        this._applySize(false);
        this._applyPosition();
    }

    _applySize(keepCenter) {
        const size = this._settings.get_int('size');
        const prev = this._actor.width || size;
        if (keepCenter && prev) {
            const cx = this._actor.x + prev / 2;
            const cy = this._actor.y + prev / 2;
            this._actor.set_size(size, size);
            this._setPositionClamped(cx - size / 2, cy - size / 2);
            this._savePosition();
            return;
        }
        this._actor.set_size(size, size);
    }

    _applyPosition() {
        if (this._drag)
            return;
        const size = this._settings.get_int('size');
        let x = this._settings.get_int('x');
        let y = this._settings.get_int('y');
        if (x < 0 || y < 0) {
            x = (this._container.width - size) / 2;
            y = (this._container.height - size) / 2;
        }
        this._setPositionClamped(x, y);
    }

    _setPositionClamped(x, y) {
        const size = this._actor.width || this._settings.get_int('size');
        const maxX = Math.max(0, this._container.width - size);
        const maxY = Math.max(0, this._container.height - size);
        this._actor.set_position(
            Math.round(Math.min(Math.max(0, x), maxX)),
            Math.round(Math.min(Math.max(0, y), maxY))
        );
    }

    _savePosition() {
        this._settings.set_int('x', Math.round(this._actor.x));
        this._settings.set_int('y', Math.round(this._actor.y));
    }

    _onRepaint(area) {
        const cr = area.get_context();
        try {
            drawClock(cr, area.width, area.height, readNow(), {
                showSeconds: this._settings.get_boolean('show-seconds'),
                showTimezone: this._settings.get_boolean('show-timezone'),
            });
        } finally {
            cr.$dispose();
        }
    }

    _onButtonPress(_actor, event) {
        const button = event.get_button();
        if (button === Clutter.BUTTON_SECONDARY) {
            try {
                this._extension.openPreferences();
            } catch (error) {
                console.error('[wall-clock-24h] failed to open preferences', error);
            }
            return Clutter.EVENT_STOP;
        }
        if (button !== Clutter.BUTTON_PRIMARY)
            return Clutter.EVENT_PROPAGATE;

        const [x, y] = event.get_coords();
        this._drag = {
            pointerX: x,
            pointerY: y,
            actorX: this._actor.x,
            actorY: this._actor.y,
            moved: false,
        };
        this._grab = global.stage.grab(this._actor);
        return Clutter.EVENT_STOP;
    }

    _onMotion(_actor, event) {
        if (!this._drag)
            return Clutter.EVENT_PROPAGATE;
        const [x, y] = event.get_coords();
        this._setPositionClamped(
            this._drag.actorX + (x - this._drag.pointerX),
            this._drag.actorY + (y - this._drag.pointerY)
        );
        this._drag.moved = true;
        return Clutter.EVENT_STOP;
    }

    _onButtonRelease(_actor, _event) {
        if (!this._drag)
            return Clutter.EVENT_PROPAGATE;
        this._ungrab();
        if (this._drag.moved)
            this._savePosition();
        this._drag = null;
        return Clutter.EVENT_STOP;
    }

    _onScroll(_actor, event) {
        const direction = event.get_scroll_direction();
        let delta = 0;
        if (direction === Clutter.ScrollDirection.UP)
            delta = 16;
        else if (direction === Clutter.ScrollDirection.DOWN)
            delta = -16;
        else if (direction === Clutter.ScrollDirection.SMOOTH) {
            const [, dy] = event.get_scroll_delta();
            if (dy < 0)
                delta = 16;
            else if (dy > 0)
                delta = -16;
        }
        if (!delta)
            return Clutter.EVENT_PROPAGATE;

        const size = this._settings.get_int('size');
        const next = Math.max(240, Math.min(900, size + delta));
        if (next !== size)
            this._settings.set_int('size', next);
        return Clutter.EVENT_STOP;
    }

    _ungrab() {
        if (this._grab) {
            this._grab.dismiss();
            this._grab = null;
        }
    }

    destroy() {
        this._ungrab();
        this._drag = null;
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if (this._raiseId) {
            GLib.Source.remove(this._raiseId);
            this._raiseId = 0;
        }
        this._settings.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
        global.display.disconnectObject(this);
        this._container.destroy();
    }
}

export default class WallClock24hExtension extends Extension {
    enable() {
        try {
            this._clock = new DesktopClock(this);
            if (Main.panel.statusArea[this.uuid])
                Main.panel.statusArea[this.uuid].destroy();
            this._indicator = createIndicator(this);
            Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
        } catch (error) {
            console.error('[wall-clock-24h] enable failed', error);
            throw error;
        }
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._clock?.destroy();
        this._clock = null;
    }
}
