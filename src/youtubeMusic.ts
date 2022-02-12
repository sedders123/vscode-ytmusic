import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
} from "vscode";
import Cache from "vscode-cache";
import * as io from "socket.io-client";
import fetch from "node-fetch";
import { Track, Button, RepeatMode, KeyedCollection } from "./types";
import { SimpleDictionary } from "./utils";
import { friendlyErrorMessages } from "./constants";

/**
 * Constantly changing class that holds YTMDP data
 */
export default class YouTubeMusic {
  private _nowPlayingStatusBarItem: StatusBarItem;
  private _buttons: KeyedCollection<Button> = new SimpleDictionary<Button>();

  private _track: Track;
  private _isPaused: boolean;
  private _repeat: string;
  private _apiUrl = "http://localhost:9863";
  private _socket: io.Socket;
  private _codeCache: Cache;
  private _lastConnectionErrorMessage: string;

  public constructor(context: ExtensionContext) {
    this._codeCache = new Cache(context);
    const authCode = this._codeCache.get("authCode");
    if (authCode) {
      this._socket = this.initSocket(authCode);
      this.createButtons();
    } else {
      this.createAuthButton();
    }
  }

  private createAuthButton() {
    const command = "ytMusic.auth";
    var statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    statusBarItem.text = "Authenticate YTMDP";
    statusBarItem.command = command;
    statusBarItem.tooltip = "Authenticate with YouTube Music Desktop Player";
    this._buttons.Add("auth", {
      id: "auth",
      title: "Authenticate with YouTube Music Desktop Player",
      text: "Authenticate YTMDP",
      command,
      statusBarItem,
      isVisible: true,
    });
    statusBarItem.show();
  }

  private removeButton(id: string) {
    const button = this._buttons.Item(id);
    if (button) {
      button.statusBarItem.hide();
      this._buttons.Remove(id);
    }
  }

  private createButtons() {
    if (!this._nowPlayingStatusBarItem) {
      this._nowPlayingStatusBarItem = window.createStatusBarItem(
        StatusBarAlignment.Left
      );
    }
    if (this._buttons.Count() === 0) {
      this.createControlButtons();
    }
  }

  private initSocket(authCode) {
    const socket = io.connect(this._apiUrl, {
      extraHeaders: {
        password: authCode,
      },
      reconnectionAttempts: 3,
    });

    socket.on("tick", (data) => {
      this._track = data.track;
      this._isPaused = data.player.isPaused;
      this._repeat = data.player.repeatType;
      this.updateRepeatButtonState();
      this.refreshNowPlaying();
      this.updateDynamicButton("playpause", !this._isPaused);
    });

    socket.on("reconnect_error", (err) => {
      this._lastConnectionErrorMessage = err.message;
    });

    socket.on("reconnect_failed", () => {
      this.showErrorMessage(this._lastConnectionErrorMessage);
    });

    return socket;
  }

  private createControlButtons() {
    const buttons = [
      { id: "rewind", title: "Previous Song", text: "$(chevron-left)" },
      {
        id: "playpause",
        title: "Play / Pause",
        text: "$(triangle-right)",
        dynamicText: (currentlyPlaying: boolean) =>
          currentlyPlaying ? "$(primitive-square)" : "$(triangle-right)",
      },
      { id: "skip", title: "Next Song", text: "$(chevron-right)" },
      { id: "cycleRepeat", title: "Not Repeating", text: "$(sync)" },
    ];

    buttons.map((button) => {
      const command = "ytMusic." + button.id;
      var statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
      statusBarItem.text = button.text;
      statusBarItem.command = command;
      statusBarItem.tooltip = button.title;
      this._buttons.Add(
        button.id,
        Object.assign({}, button, { command, statusBarItem, isVisible: true })
      );
      statusBarItem.show();
    });
    this.updateRepeatButtonState(); // Set the initial state of the repeat button
  }

  private updateRepeatButtonState() {
    const repeatButton = this._buttons.Item("cycleRepeat");
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
    const button = this._buttons.Item(id);
    const text = button.dynamicText(condition);
    button.statusBarItem.text = text;
  }

  private refreshNowPlaying() {
    let textItem = this.getNowPlayingText(this._track);
    if (textItem == null) {
      this._nowPlayingStatusBarItem.hide();
    }
    this._nowPlayingStatusBarItem.text = textItem;
    this._nowPlayingStatusBarItem.show();
  }

  private getNowPlayingText(track: Track): string {
    if (track == null || track.title === null) {
      return null;
    }
    return `${track.title} - ${track.author}`;
  }

  private post(command, value?) {
    fetch(`${this._apiUrl}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Code ${this._codeCache.get("authCode")}`,
      },
      body: JSON.stringify({
        command,
        value,
      }),
    })
      .then(async (response) => {
        const responseJson = await response.json();
        if (responseJson.error) {
          this.showErrorMessage(responseJson.error);
        }
      })
      .catch((err) => {
        this.showErrorMessage(err);
      });
  }

  private showErrorMessage(message: string) {
    const errorMessage = friendlyErrorMessages.get(message) ?? message;
    window.showErrorMessage(`vscode-ytmusic: ${errorMessage}`);
  }

  public auth() {
    window
      .showInputBox({
        prompt: "Enter your Youtube Music Desktop Player Auth Code",
        ignoreFocusOut: true,
      })
      .then((code) => {
        this._codeCache.put("authCode", code);
        this.initSocket(code);
        this.removeButton("auth");
        this.createButtons();
      });
  }

  public togglePlay() {
    this.post("track-play-pause");
  }

  public forward() {
    this.post("track-next");
  }

  public rewind() {
    this.post("track-previous");
  }

  public toggleRepeat(mode: string) {
    this.post("player-repeat", mode);
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
    this._nowPlayingStatusBarItem.dispose();
    this._buttons.Values().forEach((button) => {
      button.statusBarItem.dispose();
    });
    this._socket.close();
  }
}
