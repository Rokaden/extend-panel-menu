/*
    This file is part of Extend Panel Menu

    Extend Panel Menu is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Extend Panel Menu is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Extend Panel Menu.  If not, see <http://www.gnu.org/licenses/>.

    Copyright 2017 Julio Galvan
*/

const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Config = imports.misc.config;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const GnomeDesktop = imports.gi.GnomeDesktop;
const Shell = imports.gi.Shell;

const Gettext = imports.gettext.domain("extend-panel-menu");
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const MenuItems = Me.imports.menuItems;
const _ = Gettext.gettext;
const Util = imports.misc.util;

function init() {
    Convenience.initTranslations("extend-panel-menu");
}


const CustomButton = new Lang.Class({
    Name: "Button",
    Extends: PanelMenu.Button,

    _init: function (name) {
        this.parent(0.0, name, false);
        this.name = name;
        this.box = new St.BoxLayout({
            vertical: false,
            style_class: "panel-status-menu-box"
        });;
        //this.actor.add_style_class_name("horizontal-spacing");
        this.actor.add_child(this.box);
    },
    _openApp: function (a, b, app) {
        Shell.AppSystem.get_default().lookup_app(app).activate();
    },
    destroy: function () {
        this.parent();
    }
});

const NetworkIndicator = new Lang.Class({
    Name: "NetworkIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("NetworkIndicator");
        this.menu.actor.add_style_class_name("aggregate-menu");

        this._network = null;
        this._bluetooth = null;
        this._rfkill = Main.panel.statusArea.aggregateMenu._rfkill;
        if (Config.HAVE_NETWORKMANAGER) {
            this._network = Main.panel.statusArea.aggregateMenu._network;
        }
        if (Config.HAVE_BLUETOOTH) {
            this._bluetooth = Main.panel.statusArea.aggregateMenu._bluetooth;
        }
        this._location = Main.panel.statusArea.aggregateMenu._location;

        Main.panel.statusArea.aggregateMenu._indicators.remove_actor(this._location.indicators);
        this.box.add_child(this._location.indicators);
        ////////

        if (this._network) {
            Main.panel.statusArea.aggregateMenu._indicators.remove_actor(this._network.indicators);
            this.box.add_child(this._network.indicators);
        }
        if (this._bluetooth) {
            Main.panel.statusArea.aggregateMenu._indicators.remove_actor(this._bluetooth.indicators);
            this.box.add_child(this._bluetooth.indicators);
        }
        Main.panel.statusArea.aggregateMenu._indicators.remove_actor(this._rfkill.indicators);
        this.box.add_child(this._rfkill.indicators);
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
        this.box.add_child(this._arrowIcon);

        if (this._network) {
            Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._network.menu.actor);
            this.menu.addMenuItem(this._network.menu);
        }
        if (this._bluetooth) {
            Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._bluetooth.menu.actor);
            this.menu.addMenuItem(this._bluetooth.menu);
        }


        Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._location.menu.actor);
        this.menu.box.add_actor(this._location.menu.actor);

        Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._rfkill.menu.actor);
        this.menu.addMenuItem(this._rfkill.menu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let network = new PopupMenu.PopupMenuItem(_("Network Settings"));
        network.connect("activate", Lang.bind(this, this._openApp, "gnome-network-panel.desktop"));
        this.menu.addMenuItem(network);

        this._rfkill._manager._proxy.connect("g-properties-changed", Lang.bind(this, this._sync));
        if (this._network) {
            this._network._primaryIndicator.connect("notify", Lang.bind(this, this._sync))
        }
        if (this._bluetooth) {
            this._bluetooth._proxy.connect("g-properties-changed", Lang.bind(this, this._sync));
        }
        this._sync();

        this._rfkill._sync();
        if (this._bluetooth) {
            this._bluetooth._sync();
        }
    },
    _sync: function () {
        this._arrowIcon.hide();
        if (this.box.get_width() == 0) {
            this._arrowIcon.show();
        }
    },
    destroy: function () {
        this.box.remove_child(this._location.indicators);
        this.menu.box.remove_actor(this._location.menu.actor);
        Main.panel.statusArea.aggregateMenu._indicators.add_actor(this._location.indicators);
        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._location.menu.actor);
        this.box.remove_child(this._rfkill.indicators);
        this.menu.box.remove_actor(this._rfkill.menu.actor);
        Main.panel.statusArea.aggregateMenu._indicators.add_actor(this._rfkill.indicators);
        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._rfkill.menu.actor);
        this.box.remove_child(this._network.indicators);
        this.menu.box.remove_actor(this._network.menu.actor);
        Main.panel.statusArea.aggregateMenu._indicators.add_actor(this._network.indicators);
        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._network.menu.actor);
        this.box.remove_child(this._bluetooth.indicators);
        this.menu.box.remove_actor(this._bluetooth.menu.actor);
        Main.panel.statusArea.aggregateMenu._indicators.add_actor(this._bluetooth.indicators);
        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._bluetooth.menu.actor);
        this.parent();
    },
});

const UserIndicator = new Lang.Class({
    Name: "UserIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("UserIndicator");
        this._system = new imports.ui.status.system.Indicator();
        this._screencast = new imports.ui.status.screencast.Indicator();

        let username = GLib.get_real_name();
        this._nameLabel = new St.Label({
            text: username,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "panel-status-menu-box"
        });
        this._userIcon = new St.Icon({
            icon_name: "avatar-default-symbolic",
            style_class: "system-status-icon"
        });
        this.box.add_child(this._screencast.indicators);
        this.box.add_child(this._userIcon);
        this.box.add_child(this._nameLabel);

        this._session = this._system._session;
        this._loginManager = this._system._loginManager;

        this.menu.box.set_width(270);

        //////////////////////////////////////////////////////////////
        // MENU
        let about = new PopupMenu.PopupMenuItem(_("About This Computer"));
        about.connect("activate", Lang.bind(this, this._openApp, "gnome-info-panel.desktop"));
        this.menu.addMenuItem(about);

        let help = new PopupMenu.PopupMenuItem(_("GNOME Help"));
        help.connect("activate", Lang.bind(this, this._openApp, "yelp.desktop"));
        this.menu.addMenuItem(help);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        let settings = new PopupMenu.PopupMenuItem(_("System Settings"));
        settings.connect("activate", Lang.bind(this, this._openApp, "gnome-control-center.desktop"));
        this.menu.addMenuItem(settings);

        let extsettings = new PopupMenu.PopupMenuItem(_("Extension Settings"));
        extsettings.connect("activate", Lang.bind(this, this._openApp, "gnome-shell-extension-prefs.desktop"));
        this.menu.addMenuItem(extsettings);


        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        let lock = new PopupMenu.PopupMenuItem(_("Lock"));
        lock.connect("activate", Lang.bind(this, this._system._onLockScreenClicked));
        this.menu.addMenuItem(lock);
        if (!this._system._lockScreenAction.visible) {
            lock.actor.hide();
        }

        let switchuser = new PopupMenu.PopupMenuItem(_("Switch User"));
        switchuser.connect("activate", Lang.bind(this, this._system._onLoginScreenActivate));
        this.menu.addMenuItem(switchuser);
        if (!this._system._updateSwitchUser) {
            switchuser.actor.hide();
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        let logout = new PopupMenu.PopupMenuItem(_("Log Out"));
        logout.connect("activate", Lang.bind(this, this._system._onQuitSessionActivate));
        this.menu.addMenuItem(logout);
        if (!this._system._updateLogout) {
            logout.actor.hide();
        }

        let account = new PopupMenu.PopupMenuItem(_("Account Settings"));
        account.connect("activate", Lang.bind(this, this._openApp, "gnome-user-accounts-panel.desktop"));
        this.menu.addMenuItem(account);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        //////////////
        // INCONCLUSIVE
        //this.orientation = new PopupMenu.PopupMenuItem(_("Orientation Lock"));
        //this.orientation.connect("activate", Lang.bind(this, this._system._onOrientationLockClicked));
        //this.menu.addMenuItem(this.orientation);
        //if (!this._system._orientationLockAction.visible) {
        //    this.orientation.actor.hide();
        //}
        ///////////////

        let suspend = new PopupMenu.PopupMenuItem(_("Suspend"));
        suspend.connect("activate", Lang.bind(this, this._system._onSuspendClicked));
        this.menu.addMenuItem(suspend);
        if (!this._system._suspendAction.visible) {
            suspend.actor.hide();
        }

        let power = new PopupMenu.PopupMenuItem(_("Power Off"));
        power.connect("activate", Lang.bind(this, this._system._onPowerOffClicked));
        this.menu.addMenuItem(power);
        if (!this._system._powerOffAction.visible) {
            power.actor.hide();
        }

    }
});

const NightLightIndicator = new Lang.Class({
    Name: "NightLightIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("NightLightIndicator");
        this._nightLight = new imports.ui.status.nightLight.Indicator();
        this.menu.box.set_width(250);
        this.box.add_child(this._nightLight.indicators);
        this._label = new St.Label({
            style_class: "label-menu"
        });
        this.menu.box.add_child(this._label);
        this._disableItem = new PopupMenu.PopupMenuItem(_("Resume"));
        this._disableItem.connect("activate", Lang.bind(this, this._change));
        this.menu.addMenuItem(this._disableItem);
        let turnItem = new PopupMenu.PopupMenuItem(_("Turn Off"));
        turnItem.connect("activate", Lang.bind(this, this._turnOff));
        this.menu.addMenuItem(turnItem);
        let nightSettings = new PopupMenu.PopupMenuItem(_("Display Settings"));
        nightSettings.connect("activate", Lang.bind(this, this._openApp, "gnome-display-panel.desktop"));
        this.menu.addMenuItem(nightSettings);
        this._nightLight._proxy.connect("g-properties-changed", Lang.bind(this, this._sync));
        this._sync();
    },
    _change: function () {
        this._nightLight._proxy.DisabledUntilTomorrow = !this._nightLight._proxy.DisabledUntilTomorrow;
    },
    _turnOff: function () {
        let settings = new Gio.Settings({
            schema_id: "org.gnome.settings-daemon.plugins.color"
        });
        settings.set_boolean("night-light-enabled", false);
    },
    _sync: function () {
        let visible = this._nightLight._proxy.NightLightActive;
        let disabled = this._nightLight._proxy.DisabledUntilTomorrow;
        this._label.set_text(disabled ? _("Night Light Disabled") : _("Night Light On"));
        this._disableItem.label.text = disabled ? _("Resume") : _("Disable Until Tomorrow");
        if (visible) {
            this.actor.show();
        } else {
            this.actor.hide();
        }
    }
});

const PowerIndicator = new Lang.Class({
    Name: "PowerIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("PowerIndicator");
        this.menu.actor.add_style_class_name("aggregate-menu");
        this._power = new imports.ui.status.power.Indicator();
        this._brightness = new imports.ui.status.brightness.Indicator();
        this._brightnessIcon = new St.Icon({
            icon_name: "display-brightness-symbolic",
            style_class: "system-status-icon"
        });
        this.box.add_child(this._brightnessIcon);
        this.box.add_child(this._power.indicators);
        this.menu.addMenuItem(this._brightness.menu);
        this._separator = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(this._separator);
        this._label = new St.Label({
            style_class: "label-menu"
        });
        this.menu.box.add_child(this._label);
        this._settings = new PopupMenu.PopupMenuItem(_("Power Settings"));
        this._settings.connect("activate", Lang.bind(this, this._openApp, "gnome-power-panel.desktop"));
        this.menu.addMenuItem(this._settings);
        this._properties_changed = this._power._proxy.connect("g-properties-changed", Lang.bind(this, this._sync));
        this._sync();
    },
    _sync: function () {
        let powertype = this._power._proxy.IsPresent;
        // Do we have batteries or a UPS?
        if (!powertype) {
            // If there"s no battery, then we use the brightness icon.
            this._brightnessIcon.show();
            this._power.indicators.hide();
            this._separator.actor.hide();
            this._label.hide();
            this._settings.actor.hide();
        } else {
            this._brightnessIcon.hide();
            this._power.indicators.show();
            this._separator.actor.show();
            this._label.show();
            this._settings.actor.show();
        }
        this._label.set_text(this._power._getStatus());
    },
    destroy: function () {
        this._power._proxy.disconnect(this._properties_changed)
        this.parent();
    }
});

const VolumeIndicator = new Lang.Class({
    Name: "VolumeIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("VolumeIndicator");
        this.menu.actor.add_style_class_name("aggregate-menu");
        //this._volume = new imports.ui.status.volume.Indicator();
        //this.box.add_child(this._volume.indicators);
        //this.menu.addMenuItem(this._volume.menu);
        this._volume = Main.panel.statusArea.aggregateMenu._volume;
        Main.panel.statusArea.aggregateMenu._indicators.remove_actor(this._volume.indicators);
        this.box.add_child(this._volume.indicators);
        Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._volume.menu.actor);
        this.menu.box.add_actor(this._volume.menu.actor);
        try {
            this._mediaSection = new imports.ui.mpris.MediaSection();
            this._mediaSection.actor.add_style_class_name("music-box");
            this.menu.box.add_actor(this._mediaSection.actor);
        } catch (e) { }
        //this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let settings = new PopupMenu.PopupMenuItem(_("Volume Settings"));
        settings.connect("activate", Lang.bind(this, this._openApp, "gnome-sound-panel.desktop"));
        this.menu.addMenuItem(settings);
    },
    destroy: function () {
        this.box.remove_child(this._volume.indicators);
        this.menu.box.remove_actor(this._volume.menu.actor);
        Main.panel.statusArea.aggregateMenu._indicators.add_actor(this._volume.indicators);
        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._volume.menu.actor);
        this.parent();
    }
});

const NotificationIndicator = new Lang.Class({
    Name: "NotificationIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("NotificationIndicator");
        Gtk.IconTheme.get_default().append_search_path(Me.dir.get_child('icons').get_path());

        this._messageList = Main.panel.statusArea.dateMenu._messageList;

        this._messageListParent = this._messageList.actor.get_parent();
        this._messageListParent.remove_actor(this._messageList.actor);
        this._newMessageIndicator = Main.panel.statusArea.dateMenu._indicator;

        this._messageIndicatorParent = this._newMessageIndicator.actor.get_parent();
        this._messageIndicatorParent.remove_child(this._newMessageIndicator.actor);

        this._newMessageIndicator.actor = new St.Icon({
            icon_name: "notification-new-symbolic",
            style_class: "system-status-icon",
            visible: false
        });

        this._messageIndicator = new St.Icon({
            icon_name: "notifications-symbolic",
            style_class: "system-status-icon"
        });


        this.box.add_child(this._newMessageIndicator.actor);
        this.box.add_child(this._messageIndicator);


        this._vbox = new St.BoxLayout({
            height: 400,
            style: "border:1px;"
        });

        this._vbox.add(this._messageList.actor);
        this.menu.box.add(this._vbox);


        try {
            this._messageList._removeSection(this._messageList._mediaSection);
        }
        catch (e) { }

        this.menu.connect("open-state-changed", Lang.bind(this, function (menu, isOpen) {
            // Whenever the menu is opened, select today
            if (isOpen) {
                let now = new Date();
                this._messageList.setDate(now);
            }
        }));

        this._newMessage = this._newMessageIndicator.actor.connect('notify::visible', Lang.bind(this, function (obj) {
            if (obj)
                this._messageIndicator.visible = !obj.visible;
        }));


        this._hideIndicator = this._messageList._clearButton.connect("notify::visible", Lang.bind(this, function (obj) {
            if (this._autoHide) {
                if (obj.visible) {
                    this.actor.show();
                } else {
                    this.actor.hide();
                }
            }
        }));

    },
    setHide: function (value) {
        this._autoHide = value
        if (!value) {
            this.actor.show();
        } else if (this._newMessageIndicator._sources == "") {
            this.actor.hide();
        }
    },
    destroy: function () {
        this._newMessageIndicator.actor.disconnect(this._newMessage);
        this._messageList._clearButton.disconnect(this._hideIndicator);
        this.box.remove_child(this._newMessageIndicator.actor);
        this._messageIndicatorParent.add_child(this._newMessageIndicator.actor);
        this._vbox.remove_child(this._messageList.actor)
        this._messageListParent.add_actor(this._messageList.actor);
        this.parent();
    }
});

const CalendarIndicator = new Lang.Class({
    Name: "CalendarIndicator",
    Extends: CustomButton,
    _init: function () {
        this.parent("CalendarIndicator");

        this._clock = Main.panel.statusArea.dateMenu._clock;
        this._calendar = Main.panel.statusArea.dateMenu._calendar;
        this._date = Main.panel.statusArea.dateMenu._date;
        this._eventsSection = new imports.ui.calendar.EventsSection();
        this._clocksSection = Main.panel.statusArea.dateMenu._clocksItem;
        this._clockIndicator = Main.panel.statusArea.dateMenu._clockDisplay;

        this._indicatorParent = this._clockIndicator.get_parent();
        this._calendarParent = this._calendar.actor.get_parent();
        this._sectionParent = this._clocksSection.actor.get_parent();
        this._indicatorParent.remove_actor(this._clockIndicator);
        this._calendarParent.remove_child(this._calendar.actor);
        this._calendarParent.remove_child(this._date.actor);
        this._sectionParent.remove_child(this._clocksSection.actor);

        try {
            this._weatherSection = Main.panel.statusArea.dateMenu._weatherItem;
            this._sectionParent.remove_child(this._weatherSection.actor);
        } catch (e) { }

        // ADD THE INDICATOR TO PANEL
        this.box.add_actor(this._clockIndicator);

        let boxLayout;
        let vbox;
        try {
            vbox = new St.Widget({
                style_class: "datemenu-calendar-column",
                layout_manager: boxLayout
            });
        } catch (e) {
            // GNOME Shell 3.18/20
            vbox = new St.BoxLayout({
                style_class: "datemenu-calendar-column",
                vertical: true
            });
        }
        let displaySection = new St.ScrollView({
            style_class: "datemenu-displays-section vfade",
            x_expand: true,
            x_fill: true,
            overlay_scrollbars: true
        });
        let dbox = new St.BoxLayout({
            vertical: true,
            style_class: "datemenu-displays-box"
        });

        vbox.add_actor(this._date.actor);
        vbox.add_actor(this._calendar.actor);
        dbox.add(this._eventsSection.actor, {
            x_fill: true
        });
        dbox.add(this._clocksSection.actor, {
            x_fill: true
        });
        if (this._weatherSection) {
            dbox.add(this._weatherSection.actor, {
                x_fill: true
            });
        }
        displaySection.add_actor(dbox);
        vbox.add_actor(displaySection);
        this.menu.box.add(vbox);

        this.menu.connect("open-state-changed", Lang.bind(this, function (menu, isOpen) {
            // Whenever the menu is opened, select today
            if (isOpen) {
                let now = new Date();
                this._calendar.setDate(now);
                this._eventsSection.setDate(now);
                this._date.setDate(now);
            }
        }));
        this._calendar.connect("selected-date-changed", Lang.bind(this, function (calendar, date) {
            this._eventsSection.setDate(date);
        }));
    },
    destroy: function () {
        this.box.remove_child(this._clockIndicator);
        this._calendar.actor.get_parent().remove_child(this._calendar.actor)
        this._date.actor.get_parent().remove_child(this._date.actor)
        this._clocksSection.actor.get_parent().remove_child(this._clocksSection.actor)

        this._indicatorParent.add_actor(this._clockIndicator)
        this._calendarParent.add_child(this._calendar.actor)
        this._calendarParent.add_child(this._date.actor)
        this._sectionParent.add_child(this._clocksSection.actor)

        try {
            this._weatherSection.actor.get_parent().remove_child(this._weatherSection.actor)
            this._sectionParent.add_child(this._weatherSection.actor)
        } catch (e) { }

        this.parent();
    }
});

let settings;
let settingsChanged;
let menuItems;
let order;
let offset;
let spacing;

let nightlight;
let volume;
let network;
let power;
let calendar;
let user;
let notification;


const VERSION = Config.PACKAGE_VERSION;
const VERSION_NIGHLIGHT = "3.24";

function enable() {
    let children = Main.panel._rightBox.get_children();
    Main.panel.statusArea.aggregateMenu.container.hide();
    //Main.panel.statusArea.dateMenu.destroy();//container.hide();
    Main.panel._centerBox.remove_child(Main.panel.statusArea.dateMenu.container);

    if (ExtensionUtils.versionCheck([VERSION_NIGHLIGHT], VERSION)) {
        nightlight = new NightLightIndicator();
    }
    volume = new VolumeIndicator();
    network = new NetworkIndicator();
    power = new PowerIndicator();
    notification = new NotificationIndicator();
    calendar = new CalendarIndicator();
    user = new UserIndicator();


    Main.panel.addToStatusArea(notification.name, notification, children.length, "right");
    Main.panel.addToStatusArea(user.name, user, children.length, "right");
    Main.panel.addToStatusArea(calendar.name, calendar, children.length, "right");
    Main.panel.addToStatusArea(power.name, power, children.length, "right");
    Main.panel.addToStatusArea(network.name, network, children.length, "right");
    Main.panel.addToStatusArea(volume.name, volume, children.length, "right");
    if (ExtensionUtils.versionCheck([VERSION_NIGHLIGHT], VERSION)) {
        Main.panel.addToStatusArea(nightlight.name, nightlight, children.length, "right");
    }

    // Load Settings
    order = null;
    settings = Convenience.getSettings();
    menuItems = new MenuItems.MenuItems(settings);
    offset = settings.get_int("tray-offset");
    spacing = settings.get_int("spacing");
    settingsChanged = settings.connect("changed", Lang.bind(this, applySettings));
    applySettings();
}

function applySettings() {
    let items = menuItems.getEnableItems();
    indicators = new Array(items.length);

    let newoffset = settings.get_int("tray-offset");
    if (newoffset != offset) {
        order = "";
        offset = newoffset
    }

    let newspacing = settings.get_int("spacing");
    if (spacing != newspacing) {
        order = "";
        spacing = newspacing;
    }

    // If the order in which the indicators are displayed is changed
    if (order != items.toString()) {
        removeAll();

        if (items.indexOf("power") != -1) {
            indicators[items.indexOf("power")] = power;
        }
        if (items.indexOf("user") != -1) {
            indicators[items.indexOf("user")] = user;
        }
        if (items.indexOf("volume") != -1) {
            indicators[items.indexOf("volume")] = volume;
        }
        if (items.indexOf("network") != -1) {
            indicators[items.indexOf("network")] = network;
        }
        if (items.indexOf("notification") != -1) {
            indicators[items.indexOf("notification")] = notification;
        }
        if (items.indexOf("calendar") != -1) {
            indicators[items.indexOf("calendar")] = calendar;
        }
        if (items.indexOf("nightlight") != -1 && ExtensionUtils.versionCheck([VERSION_NIGHLIGHT], VERSION)) {
            indicators[items.indexOf("nightlight")] = nightlight;
        }


        let children = Main.panel._rightBox.get_children();
        let styleLine = '-natural-hpadding: %dpx'.format(spacing);
        if (spacing < 6) {
            styleLine += '; -minimum-hpadding: %dpx'.format(spacing);
        }
        indicators.reverse().forEach(function (item) {
            item.actor.set_style(styleLine);
            Main.panel._rightBox.insert_child_at_index(item.container, children.length - offset);
        });
        // Save state
        order = items.toString();
    }

    let username = settings.get_string("username-text");
    if (username == "") {
        username = GLib.get_real_name();
    }
    if (user) {
        user._nameLabel.set_text(username);
    }
    let enableUserIcon = settings.get_boolean("user-icon");
    if (enableUserIcon) {
        user._userIcon.show();
        user._nameLabel.hide();
    } else {
        user._userIcon.hide();
        user._nameLabel.show();
    }


    let autoHideNotification = settings.get_boolean("autohide-notification");
    if (notification) {
        notification.setHide(autoHideNotification);
    }

}

function removeAll() {
    if (nightlight) {
        Main.panel._rightBox.remove_child(nightlight.container);
    }
    Main.panel._rightBox.remove_child(volume.container);
    Main.panel._rightBox.remove_child(network.container);
    Main.panel._rightBox.remove_child(power.container);
    Main.panel._rightBox.remove_child(calendar.container);
    Main.panel._rightBox.remove_child(user.container);
    Main.panel._rightBox.remove_child(notification.container);
}

function disable() {
    if (settingsChanged) {
        settings.disconnect(settingsChanged);
    }
    settings = null;
    if (nightlight) {
        nightlight.destroy();
    }
    volume.destroy();
    network.destroy();
    power.destroy();
    notification.destroy();
    calendar.destroy();
    user.destroy();


    Main.panel.statusArea.aggregateMenu.container.show();
    Main.panel._centerBox.add_child(Main.panel.statusArea.dateMenu.container);
}
