import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
} from "vscode";
import { Track, Button, RepeatMode, KeyedCollection } from "./types";
import { SimpleDictionary } from "./utils";
import Cache from "vscode-cache";
import * as io from "socket.io-client";
import fetch from "node-fetch";

/**
 * Constantly changing class that holds YTMD data
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

  public constructor(context: ExtensionContext) {
    // Create as needed
    if (!this._nowPlayingStatusBarItem) {
      this._nowPlayingStatusBarItem = window.createStatusBarItem(
        StatusBarAlignment.Left
      );
    }
    if (this._buttons.Count() === 0) {
      this.createControlButtons();
    }

    this._codeCache = new Cache(context);

    // Get Auth Code if not set
    if (!this._codeCache.has("authCode")) {
      window
        .showInputBox({
          prompt: "Enter your Youtube Music Desktop Player Auth Code",
          ignoreFocusOut: true,
        })
        .then((code) => {
          this._codeCache.put("authCode", code);
        });
    }

    this._socket = io.connect(this._apiUrl, {
      extraHeaders: {
        password: this._codeCache.get("authCode"),
      },
    });

    this._socket.on("tick", (data) => {
      try {
        this._track = data.track;
        this._isPaused = data.player.isPaused;
        this._repeat = data.player.repeatType;
        this.updateRepeatButtonState();
        this.refreshNowPlaying();
        this.updateDynamicButton("playpause", !this._isPaused);
      } catch (err) {
        window.showErrorMessage(
          `YTMusic: WebSocket failed to connect ${err.message}`
        );
      }
    });

    this._socket.on("connect_error", (err) => {
      window.showErrorMessage(`connect_error due to ${err.message}`);
    });
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
    }).catch((err) => {
      window.showErrorMessage(err.message);
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

  public dispose() {
    this._nowPlayingStatusBarItem.dispose();
    this._buttons.Values().forEach((button) => {
      button.statusBarItem.dispose();
    });
    this._socket.close();
  }
}
