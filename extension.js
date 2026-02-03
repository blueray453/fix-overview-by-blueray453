import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as WindowPreview from 'resource:///org/gnome/shell/ui/windowPreview.js';
import * as WorkspacesView from 'resource:///org/gnome/shell/ui/workspacesView.js';
import * as WorkspaceThumbnail from 'resource:///org/gnome/shell/ui/workspaceThumbnail.js';
import { setLogging, setLogFn, journal } from './utils.js';
import { PrototypeInjector } from './PrototypeInjector.js';

// const _originalHideOverlay = WindowPreview.WindowPreview.prototype.hideOverlay;
// const _originalShowOverlay = WindowPreview.WindowPreview.prototype.showOverlay;
// const _originalWindowPreviewInit = WindowPreview.WindowPreview.prototype._init;

// const _originalUpdateShouldShow = WorkspaceThumbnail.ThumbnailsBox.prototype._updateShouldShow;
// const _originalUpdateWorkspacesState = WorkspacesView.WorkspacesView.prototype._updateWorkspacesState;

export default class NotificationThemeExtension extends Extension {
  enable() {
    this.injector = new PrototypeInjector();

    setLogFn((msg, error = false) => {
      let level;
      if (error) {
        level = GLib.LogLevelFlags.LEVEL_CRITICAL;
      } else {
        level = GLib.LogLevelFlags.LEVEL_MESSAGE;
      }

      GLib.log_structured(
        'fix-overview-by-blueray453',
        level,
        {
          MESSAGE: `${msg}`,
          SYSLOG_IDENTIFIER: 'fix-overview-by-blueray453',
          CODE_FILE: GLib.filename_from_uri(import.meta.url)[0]
        }
      );
    });

    setLogging(true);

    // Main.overview.dash.height = 0;
    // Main.overview.dash.hide();

    // journalctl -f -o cat SYSLOG_IDENTIFIER=fix-overview-by-blueray453
    journal(`Enabled`);

    this._NoOverviewAtStartUp();
    this._hideThumbnailsBox();
    this._scaleWorkspacesView();
    this._WindowPreviewTitle();

    // const workspacesDisplay = Main.overview._overview.controls._workspacesDisplay;
    // let _overviewShowingId = Main.overview.connect('showing', () => {
    //   workspacesDisplay._workspacesViews.forEach(view => {

    //     // scale workspace previews
    //     view.set_scale(0.96, 0.96);

    //     view._workspaces.forEach(workspace => {
    //       workspace._windows.forEach(windowPreview => {

    //         // center each title
    //         windowPreview._title.set_opacity(255);
    //         const constraints = windowPreview._title.get_constraints();
    //         constraints.forEach(constraint => {
    //           if (constraint instanceof Clutter.AlignConstraint &&
    //             constraint.align_axis === Clutter.AlignAxis.Y_AXIS) {
    //             constraint.factor = 0.5;
    //           }
    //         });
    //       });
    //     });
    //   });
    // });
  }

  _NoOverviewAtStartUp(){
    // PRIORITY_HIGH = -100
    // PRIORITY_DEFAULT = 0
    // PRIORITY_HIGH_IDLE = 100
    // PRIORITY_DEFAULT_IDLE = 200
    // PRIORITY_LOW = 300
    GLib.idle_add(GLib.PRIORITY_HIGH, () => {
      Main.overview.hide();
      return GLib.SOURCE_REMOVE;
    });

    // Main.layoutManager.connectObject(
    //   'startup-complete',
    //   () => Main.overview.hide(),
    //   this
    // );
  }

  _WindowPreviewTitle() {
    this.injector.injectMultiple(WindowPreview.WindowPreview.prototype, {
      hideOverlay: {
        mode: 'after',
        fn: function () {
          this._title.set_opacity(255);
        }
      },
      showOverlay: {
        mode: 'after',
        fn: function () {
          this._title.set_opacity(255);
        }
      },
      _init: {
        mode: 'after',
        fn: function () {
          if (!this._title) return;

          this._title.show();
          this._title.get_constraints().forEach(constraint => {
            if (constraint instanceof Clutter.AlignConstraint &&
              constraint.align_axis === Clutter.AlignAxis.Y_AXIS) {
              constraint.set_factor(0.5);
            }
          });
        }
      }
    });
    // WindowPreview.WindowPreview.prototype.hideOverlay = function (...args) {
    //   _originalHideOverlay.call(this, ...args);

    //   // Keep the title visible, don't animate it
    //   this._title.set_opacity(255);
    // };

    // WindowPreview.WindowPreview.prototype.showOverlay = function (...args) {
    //   _originalShowOverlay.call(this, ...args);

    //   // Remove the title from Shell's animation handling
    //   this._title.set_opacity(255);
    // };

    // WindowPreview.WindowPreview.prototype._init = function () {
    //   // Call the original _init
    //   _originalWindowPreviewInit.apply(this, arguments);

    //   if (!this._title)
    //     return;

    //   this._title.show();

    //   // Center the window title
    //   const titleConstraints = this._title.get_constraints();
    //   for (const constraint of titleConstraints) {
    //     if (constraint instanceof Clutter.AlignConstraint &&
    //       constraint.align_axis === Clutter.AlignAxis.Y_AXIS) {
    //       constraint.set_factor(0.5); // 0=top, 0.5=center, 1=bottom
    //     }
    //   }
    // };
  }

  _hideThumbnailsBox() {
    this.injector.override(
      WorkspaceThumbnail.ThumbnailsBox.prototype,
      '_updateShouldShow',
      function () {
        this._shouldShow = false;
        this.notify('should-show');
      }
    );
    // WorkspaceThumbnail.ThumbnailsBox.prototype._updateShouldShow = function () {
    //   this._shouldShow = false;
    //   this.notify('should-show');
    // };
  }

  _scaleWorkspacesView() {
    this.injector.after(
      WorkspacesView.WorkspacesView.prototype,
      '_updateWorkspacesState',
      function () {
        this._workspaces.forEach(w => w.set_scale(0.96, 0.96));
      }
    );
    // WorkspacesView.WorkspacesView.prototype._updateWorkspacesState = function (...args) {
    //   // Call the original function first
    //   _originalUpdateWorkspacesState.call(this, ...args);

    //   // Apply custom scaling on top
    //   this._workspaces.forEach(w => {
    //     w.set_scale(0.96, 0.96);
    //   });
    // };
  }

  disable() {
    this.injector.removeAllInjections();
    // Main.layoutManager.disconnectObject(this);
    // WindowPreview.WindowPreview.prototype.hideOverlay = _originalHideOverlay;
    // WindowPreview.WindowPreview.prototype.showOverlay = _originalShowOverlay;
    // WindowPreview.WindowPreview.prototype._init = _originalWindowPreviewInit;

    // WorkspaceThumbnail.ThumbnailsBox.prototype._updateShouldShow = _originalUpdateShouldShow;
    // WorkspacesView.WorkspacesView.prototype._updateWorkspacesState = _originalUpdateWorkspacesState;
  }
}
