import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WallClock24hPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;
        window.title = _('24-hour Wall Clock');
        window.default_width = 520;
        window.default_height = 420;

        const page = new Adw.PreferencesPage({
            title: _('Clock'),
            icon_name: 'preferences-system-time-symbolic',
        });

        const appearance = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });

        const sizeRow = new Adw.SpinRow({
            title: _('Size'),
            subtitle: _('Clock diameter in pixels. Presets: S 280, M 400, L 560. You can also scroll on the clock.'),
            adjustment: new Gtk.Adjustment({
                lower: 240,
                upper: 900,
                step_increment: 10,
                page_increment: 40,
            }),
        });
        settings.bind('size', sizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(sizeRow);

        const secondsRow = new Adw.SwitchRow({
            title: _('Show seconds'),
            subtitle: _('Draw the red second hand'),
        });
        settings.bind('show-seconds', secondsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(secondsRow);

        const timezoneRow = new Adw.SwitchRow({
            title: _('Show time zone'),
            subtitle: _('Draw the system time zone under the hands'),
        });
        settings.bind('show-timezone', timezoneRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(timezoneRow);

        page.add(appearance);

        const position = new Adw.PreferencesGroup({
            title: _('Position'),
            description: _('Drag the clock to move it. Right-click it to open these settings.'),
        });

        const frontRow = new Adw.SwitchRow({
            title: _('In front of windows'),
            subtitle: _('When off, the clock stays just above the wallpaper. When on, it stays in front of windows so you can drag it.'),
        });
        settings.bind('above-windows', frontRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        position.add(frontRow);

        const resetRow = new Adw.ActionRow({
            title: _('Reset position'),
            subtitle: _('Move the clock back to the center of the primary monitor'),
        });
        const resetButton = new Gtk.Button({
            label: _('Reset'),
            valign: Gtk.Align.CENTER,
        });
        resetButton.connect('clicked', () => {
            settings.set_int('x', -1);
            settings.set_int('y', -1);
        });
        resetRow.add_suffix(resetButton);
        resetRow.activatable_widget = resetButton;
        position.add(resetRow);

        page.add(position);
        window.add(page);
    }
}
