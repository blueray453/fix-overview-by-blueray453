import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as WindowPreview from 'resource:///org/gnome/shell/ui/windowPreview.js';
import * as WorkspacesView from 'resource:///org/gnome/shell/ui/workspacesView.js';
import { setLogging, setLogFn, journal } from './utils.js';

const thumbnailsBox = Main.overview._overview._controls._thumbnailsBox;
const _originalUpdateWorkspacesState = WorkspacesView.WorkspacesView.prototype._updateWorkspacesState;
const _originalWindowPreviewInit = WindowPreview.WindowPreview.prototype._init;
const _originalShowOverlay = WindowPreview.WindowPreview.prototype.showOverlay;
const _originalHideOverlay = WindowPreview.WindowPreview.prototype.hideOverlay;

export default class NotificationThemeExtension extends Extension {
  enable() {
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

    this._scaleWorkspacesView();
    this._WindowPreviewTitle();
  }

  _NoOverviewAtStartUp(){
    // No overview at start-up
    // Main.layoutManager.connectObject('startup-complete', () => Main.overview.hide(), this);
    this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      Main.overview.hide();
      this._idleId = null;
      return GLib.SOURCE_REMOVE;
    });
  }

  _hideThumbnailsBox() {
    this._originalUpdateShouldShow = thumbnailsBox._updateShouldShow;
    thumbnailsBox._updateShouldShow = () => {
      const shouldShow = false;

      if (thumbnailsBox._shouldShow === shouldShow)
        return;

      thumbnailsBox._shouldShow = shouldShow;
      thumbnailsBox.notify('should-show');
    }
    thumbnailsBox._updateShouldShow();
  }

  _scaleWorkspacesView() {
    WorkspacesView.WorkspacesView.prototype._updateWorkspacesState = function (...args) {
      // Call the original function first
      _originalUpdateWorkspacesState.call(this, ...args);

      // Apply custom scaling on top
      this._workspaces.forEach(w => {
        w.set_scale(0.96, 0.96);
      });
    };
  }

  _WindowPreviewTitle() {
    WindowPreview.WindowPreview.prototype._init = function () {
      // Call the original _init
      _originalWindowPreviewInit.apply(this, arguments);

      if (!this._title)
        return;

      this._title.show();

      // Center the window title
      const titleConstraints = this._title.get_constraints();
      for (const constraint of titleConstraints) {
        if (constraint instanceof Clutter.AlignConstraint &&
          constraint.align_axis === Clutter.AlignAxis.Y_AXIS) {
          constraint.set_factor(0.5); // 0=top, 0.5=center, 1=bottom
        }
      }
    };

    WindowPreview.WindowPreview.prototype.showOverlay = function (...args) {
      _originalShowOverlay.call(this, ...args);

      // Remove the title from Shell's animation handling
      this._title.set_opacity(255);
    };

    WindowPreview.WindowPreview.prototype.hideOverlay = function (...args) {
      _originalHideOverlay.call(this, ...args);

      // Keep the title visible, don't animate it
      this._title.set_opacity(255);
    };
  }

  disable() {
    // Main.layoutManager.disconnectObject(this);
    if (this._idleId) {
      GLib.source_remove(this._idleId);
      this._idleId = null;
    }

    if (this._originalUpdateShouldShow) {
      thumbnailsBox._updateShouldShow = this._originalUpdateShouldShow;
    }
    thumbnailsBox._updateShouldShow();

    if (this._overviewHideSignalId) {
      Main.layoutManager.disconnectObject(this._overviewHideSignalId);
      this._overviewHideSignalId = null;
    }

    WorkspacesView.WorkspacesView.prototype._updateWorkspacesState = _originalUpdateWorkspacesState;

    WindowPreview.WindowPreview.prototype._init = _originalWindowPreviewInit;

    WindowPreview.WindowPreview.prototype.showOverlay = _originalShowOverlay;

    WindowPreview.WindowPreview.prototype.hideOverlay = _originalHideOverlay;
  }
}
