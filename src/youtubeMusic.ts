import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
} from "vscode";
import { Track, Button, RepeatMode } from "./types";
import { friendlyErrorMessages } from "./constants";
import Cache from "./cache";

/**
 * Constantly changing class that holds YTMDP data
 */
export default class YouTubeMusic {
  private _nowPlayingStatusBarItem: StatusBarItem | null;
  private _buttons: Record<string, Button> = {};

  private _track: Track;
  private _repeat: string;
  private _codeCache: Cache;

  public constructor(context: ExtensionContext) {
    this._codeCache = new Cache(context, "ytMusic");
    const authCode = this._codeCache.get("authCode");
    if (authCode) {
      // Initialize the socket
      this.createButtons();
    } else {
      // Trigger the auth flow
    }
  }

  private removeButton(id: string) {
    const button = this._buttons[id];
    if (button) {
      if (button.statusBarItem != null) {
        button.statusBarItem.dispose();
      }
      delete this._buttons[id];
    }
  }

  private createButtons() {
    if (!this._nowPlayingStatusBarItem) {
      this._nowPlayingStatusBarItem = window.createStatusBarItem(
        StatusBarAlignment.Left,
        0.1
      );
      this._nowPlayingStatusBarItem.name = "YT Music - Now Playing";
    }
    if (Object.keys(this._buttons).length === 0) {
      this.createControlButtons();
    }
  }

  private createControlButtons() {
    const buttons = [
      {
        id: "rewind",
        title: "Previous Song",
        text: "$(chevron-left)",
        priority: 0.9,
      },
      {
        id: "playPause",
        title: "Play / Pause",
        text: "$(triangle-right)",
        dynamicText: (currentlyPlaying: boolean) =>
          currentlyPlaying ? "$(primitive-square)" : "$(triangle-right)",
        priority: 0.8,
      },
      {
        id: "skip",
        title: "Next Song",
        text: "$(chevron-right)",
        priority: 0.7,
      },
      {
        id: "cycleRepeat",
        title: "Not Repeating",
        text: "$(sync)",
        priority: 0.6,
        name: "Cycle Repeat Mode",
      },
      {
        id: "thumbsDown",
        title: "Thumbs Down",
        text: "$(mui-thumbs-down)",
        dynamicText: (isThumbsDown: boolean) =>
          isThumbsDown ? "$(mui-thumbs-down-solid)" : "$(mui-thumbs-down)",
        priority: 0.4,
      },
      {
        id: "thumbsUp",
        title: "Thumbs Up",
        text: "$(mui-thumbs-up)",
        dynamicText: (isThumbsUp: boolean) =>
          isThumbsUp ? "$(mui-thumbs-up-solid)" : "$(mui-thumbs-up)",
        priority: 0.3,
      },
    ];

    buttons.map((button) => {
      const command = "ytMusic." + button.id;
      const statusBarItem = window.createStatusBarItem(
        button.id,
        StatusBarAlignment.Left,
        button.priority
      );
      statusBarItem.name = `YT Music - ${button.name || button.title}`;
      statusBarItem.text = button.text;
      statusBarItem.command = command;
      statusBarItem.tooltip = button.title;
      this._buttons[button.id] = Object.assign({}, button, {
        command,
        statusBarItem,
        isVisible: true,
      });
      statusBarItem.show();
    });
    this.updateRepeatButtonState(); // Set the initial state of the repeat button
  }

  private updateRepeatButtonState() {
    const repeatButton = this._buttons["cycleRepeat"];
    if (repeatButton == null) {
      return; // Button not created yet
    }
    const statusItem = repeatButton.statusBarItem;
    switch (this._repeat) {
      case RepeatMode.None:
        statusItem.text = "$(sync)";
        statusItem.color = "darkGrey";
        statusItem.tooltip = "Not Repeating";
        break;
      case RepeatMode.Playlist:
        statusItem.text = "$(sync)";
        statusItem.color = "white";
        statusItem.tooltip = "Repeating Playlist";
        break;
      case RepeatMode.Song:
        statusItem.text = "$(issue-reopened)";
        statusItem.color = "white";
        statusItem.tooltip = "Repeating Song";
        break;
    }
  }

  private updateDynamicButton(id: string, condition: boolean) {
    const button = this._buttons[id];
    if (button == null || button.dynamicText == null) return;
    const text = button.dynamicText(condition);
    button.statusBarItem.text = text;
  }

  private refreshNowPlaying() {
    let textItem = this.getNowPlayingText(this._track);
    if (this._nowPlayingStatusBarItem == null) return;
    if (textItem == null) {
      this._nowPlayingStatusBarItem.hide();
    }
    this._nowPlayingStatusBarItem.text = textItem;
    this._nowPlayingStatusBarItem.show();
  }

  private getNowPlayingText(track: Track): string {
    if (track == null || track.title === null) {
      return "";
    }
    return `${track.title} - ${track.author}`;
  }

  private showErrorMessage(message: string) {
    const errorMessage = friendlyErrorMessages.get(message) ?? message;
    window.showErrorMessage(`vscode-ytmusic: ${errorMessage}`);
  }

  public auth() {
    // TODO: Implement auth flow
  }

  public togglePlay() {
    // TODO: Implement play/pause
  }

  public forward() {
    // TODO: Implement forward
    // TODO: Rename to next
  }

  public rewind() {
    // TODO: Implement rewind
    // TODO: Rename to previous
  }

  public toggleRepeat(mode: string) {
    // TODO: Implement repeat
    // TODO: Rename to setRepeatMode, private?
  }

  public thumbsUp() {
    // TODO: Implement thumbs up
  }

  public thumbsDown() {
    // TODO: Implement thumbs down
  }

  public cycleRepeat() {
    switch (this._repeat) {
      case RepeatMode.None:
        this.toggleRepeat(RepeatMode.Playlist);
        break;
      case RepeatMode.Playlist:
        this.toggleRepeat(RepeatMode.Song);
        break;
      case RepeatMode.Song:
        this.toggleRepeat(RepeatMode.None);
        break;
    }
  }

  public dispose() {
    if (this._nowPlayingStatusBarItem != null) {
      this._nowPlayingStatusBarItem.dispose();
    }
    Object.values(this._buttons).forEach((button) => {
      if (button.statusBarItem != null) {
        button.statusBarItem.dispose();
      }
    });
    // TODO: Close any open sockets/connections
  }
}
