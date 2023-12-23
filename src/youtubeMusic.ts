import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
} from "vscode";
import {
  Track,
  Button,
  RepeatMode,
  State,
  TrackStatus,
  LikeStatus,
} from "./types";
import { friendlyErrorMessages } from "./constants";
import Cache from "./cache";
import { io, Socket } from "socket.io-client";

/**
 * Constantly changing class that holds YTMDP data
 */
export default class YouTubeMusic {
  private _apiUrl: string = "http://localhost:9863/api/v1";

  private _nowPlayingStatusBarItem: StatusBarItem | null;
  private _buttons: Record<string, Button> = {};

  private _track: Track;
  private _repeat: RepeatMode;
  private _codeCache: Cache;
  private _socket: Socket;

  public constructor(context: ExtensionContext) {
    this._codeCache = new Cache(context, "vscode-ytmusic");
    const authCode = this._codeCache.get("authCode") as string;
    if (authCode) {
      this.initSocket(authCode);
      this.createButtons();
    } else {
      this.createAuthButton();
    }
  }

  private createAuthButton() {
    const command = "ytMusic.auth";
    const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    statusBarItem.text = "Authenticate YTMDP";
    statusBarItem.command = command;
    statusBarItem.tooltip = "Authenticate with YouTube Music Desktop Player";
    this._buttons["auth"] = {
      id: "auth",
      title: "Authenticate with YouTube Music Desktop Player",
      text: "Authenticate YTMDP",
      command,
      statusBarItem,
      isVisible: true,
    };
    statusBarItem.show();
  }

  private initSocket(authCode: string) {
    this._socket = io(`${this._apiUrl}/realtime`, {
      transports: ["websocket"],
      auth: {
        token: authCode,
      },
    });

    this._socket.on("state-update", (state: State) => {
      this._track =
        state.player.queue.items[state.player.queue.selectedItemIndex];
      this._repeat = state.player.queue.repeatMode;
      this.updateRepeatButtonState();
      this.refreshNowPlaying();
      this.updateDynamicButton(
        "playPause",
        state.player.trackState == TrackStatus.Playing ||
          state.player.trackState == TrackStatus.Buffering
      );
      this.updateDynamicButton(
        "thumbsUp",
        state.video.likeStatus == LikeStatus.Liked
      );
      this.updateDynamicButton(
        "thumbsDown",
        state.video.likeStatus == LikeStatus.Disliked
      );
    });
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
        text: "$(icon-skip-previous)",
        priority: 0.9,
      },
      {
        id: "playPause",
        title: "Play / Pause",
        text: "$(icon-play)",
        dynamicText: (currentlyPlaying: boolean) =>
          currentlyPlaying ? "$(icon-pause)" : "$(icon-play)",
        priority: 0.8,
      },
      {
        id: "skip",
        title: "Next Song",
        text: "$(icon-skip-next)",
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
        text: "$(icon-thumbs-down-deselected)",
        dynamicText: (isThumbsDown: boolean) =>
          isThumbsDown
            ? "$(icon-thumbs-down-selected)"
            : "$(icon-thumbs-down-deselected)",
        priority: 0.4,
      },
      {
        id: "thumbsUp",
        title: "Thumbs Up",
        text: "$(icon-thumbs-up-deselected)",
        dynamicText: (isThumbsUp: boolean) =>
          isThumbsUp
            ? "$(icon-thumbs-up-selected)"
            : "$(icon-thumbs-up-deselected)",
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

  private showInformationMessage(message: string) {
    window.showInformationMessage(`vscode-ytmusic: ${message}`);
  }

  public async auth() {
    const response = await fetch(`${this._apiUrl}/auth/requestcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: "vscode-ytmusic",
        appName: "Vscode Youtube Music",
        appVersion: "1.0.0", //TODO: Does this need to be dynamic?
      }),
    });
    const { code, error } = await response.json();
    if (error) {
      this.showErrorMessage(error);
      return;
    }
    this.showInformationMessage(
      `Please open the Youtube Music Desktop App and approve the Authorization Request. The code should be: ${code}`
    );
    const tokenResponse = await fetch(`${this._apiUrl}/auth/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        appId: "vscode-ytmusic",
      }),
    });
    const { token, error: tokenError } = await tokenResponse.json();
    if (tokenError) {
      this.showErrorMessage(tokenError);
      return;
    }
    this._codeCache.set("authCode", token);
    this.initSocket(token);
    this.removeButton("auth");
    if (this._nowPlayingStatusBarItem != null) {
      this._nowPlayingStatusBarItem.dispose();
      this._nowPlayingStatusBarItem = null;
    }
    this.createButtons();
  }

  private async sendCommand(command: string, data?: any) {
    try {
      const response = await fetch(`${this._apiUrl}/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${this._codeCache.get("authCode")}`,
        },
        body: JSON.stringify({
          command,
          data,
        }),
      });
      if (response.headers.get("content-type") === "application/json") {
        const { error } = await response.json();
        if (error) {
          this.showErrorMessage(error);
        }
      }
    } catch (error) {
      this.showErrorMessage(error);
    }
  }

  public async togglePlay() {
    await this.sendCommand("playPause");
  }

  public async next() {
    await this.sendCommand("next");
  }

  public async previous() {
    await this.sendCommand("previous");
  }

  private async setRepeatMode(mode: RepeatMode) {
    await this.sendCommand("repeatMode", mode);
  }

  public async thumbsUp() {
    await this.sendCommand("toggleLike");
  }

  public async thumbsDown() {
    await this.sendCommand("toggleDislike");
  }

  public async cycleRepeat() {
    switch (this._repeat) {
      case RepeatMode.None:
        await this.setRepeatMode(RepeatMode.Playlist);
        break;
      case RepeatMode.Playlist:
        await this.setRepeatMode(RepeatMode.Song);
        break;
      case RepeatMode.Song:
        await this.setRepeatMode(RepeatMode.None);
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
    if (this._socket != null) {
      this._socket.close();
    }
  }
}
