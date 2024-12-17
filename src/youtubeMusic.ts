import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
} from "vscode";
import Cache from "vscode-cache";
import * as io from "socket.io-client";
import fetch from "node-fetch";
import { Track, Button, RepeatMode, ApiResponse, ApiAuthRequestResponse, ApiRequestCodeResponse, ApiStateResponse } from "./types";
import { friendlyErrorMessages } from "./constants";
/**
 * Constantly changing class that holds YTMDP data
 */
export default class YouTubeMusic {
  private _nowPlayingStatusBarItem: StatusBarItem | null;
  private _buttons: Record<string, Button> = {};

  private _track: Track;
  private _isPaused: boolean;
  private _repeat: RepeatMode;
  private _apiUrl = "http://localhost:9863";
  private _codeCache: Cache;
  private _lastConnectionErrorMessage: string;

  public constructor(context: ExtensionContext) {
    this._codeCache = new Cache(context);
    const authCode = this._codeCache.get("authCode");
    if (authCode) {
      this.createButtons();
      this.initSocket(authCode);
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

  private tick(authCode) {
    fetch(`${this._apiUrl}/api/v1/state`, {
      headers: {
        Authorization: `${authCode}`,
      },
    })
      .then(async (response) => {
        const responseJson: ApiStateResponse =
          (await response.json()) as ApiStateResponse;
        if (responseJson.error) {
          if (responseJson.error === "UNAUTHORIZED") {
            this.removeButton("auth");
            this.createAuthButton();
          }
          this.showErrorMessage(responseJson.error);
          return;
        }
        this._track = {
          title: responseJson.video.title,
          thumbnails: [],
          author: responseJson.video.author,
          duration: "0:00",
          selected: false,
          videoId: responseJson.video.channelId,
        };
        this._isPaused = responseJson.player.trackState === 0;
        this._repeat = responseJson.player.queue.repeatMode;
        this.updateRepeatButtonState();
        this.refreshNowPlaying();
        this.updateDynamicButton("playPause", !this._isPaused);
        this.updateDynamicButton("thumbsUp", responseJson.video.likeStatus === 2);
        this.updateDynamicButton("thumbsDown", responseJson.video.likeStatus === 0);
      })
      .catch((err) => {
        if (err.message !== this._lastConnectionErrorMessage) {
          this.showErrorMessage(err.message);
          this._lastConnectionErrorMessage = err.message;
        }
      });
  }
  private initSocket(authCode) {
    // this procedure is chosen because websocket is giving errors at the moment
    setInterval(() => this.tick(authCode), 10_000); 
    this.tick(authCode);
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

  private post(command, data?) {
    fetch(`${this._apiUrl}/api/v1/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${this._codeCache.get("authCode")}`,
      },
      body: JSON.stringify({
        command,
        data,
      }),
    })
      .then(async (response) => {
        if (response.status === 204) return;
        const responseJson: ApiResponse =
          (await response.json()) as ApiResponse;
        if (responseJson.error) {
          this.showErrorMessage(responseJson.error);
          if (
            responseJson.error === "UNAUTHORIZED"
          ) {
            const buttonKeys = Object.keys(this._buttons);
            for (const key of buttonKeys) {
              this.removeButton(key);
            }
            this.createAuthButton();
          }
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
  private showInfoMessage(message: string) {
    window.showInformationMessage(`vscode-ytmusic: ${message}`);
  }

  public auth() {
    fetch(`${this._apiUrl}/api/v1/auth/requestcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "appId": "vscode-ytmusic",
        "appName": "Vscode Youtube Music",
        "appVersion": "1.0.0"
      })
    })
      .then(async (response) => {
        const responseJson = (await response.json()) as ApiRequestCodeResponse; 
        if (responseJson.error) {
          this.showErrorMessage(responseJson.error ?? "An error occurred");
          return;
        }
        this.showInfoMessage(`Please open Youtube Music Desktop App and approve Authorization Request with code: ${responseJson.code}`);
        fetch(`${this._apiUrl}/api/v1/auth/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "appId": "vscode-ytmusic",
            "appName": "Vscode Youtube Music",
            "appVersion": "1.0.0",
            "code": responseJson.code
          })
        })
          .then(async (response) => {
            const responseJson = (await response.json()) as ApiAuthRequestResponse;
            if (responseJson.error) {
              this.showErrorMessage(responseJson.error);
              return;
            }
            this._codeCache.put("authCode", responseJson.token);
            this.initSocket(responseJson.token);
            this.removeButton("auth");
            if (this._nowPlayingStatusBarItem != null) {
              this._nowPlayingStatusBarItem.dispose();
              this._nowPlayingStatusBarItem = null;
            }
            this.createButtons();
            this.showInfoMessage("Successfully authenticated into Youtube Music Desktop Player");
          })
          .catch((err) => {
            this.showErrorMessage(err);
          });
      })
      .catch((err) => {
        this.showErrorMessage(err);
      });
  }

  public togglePlay() {
    this._isPaused = !this._isPaused;
    this.updateDynamicButton("playPause", !this._isPaused);
    this.post("playPause");
  }

  public forward() {
    this.post("next");
  }

  public rewind() {
    this.post("previous");
  }

  public toggleRepeat(mode: number) {
    this._repeat = mode;
    this.updateRepeatButtonState();
    this.post("repeatMode", mode);
  }

  public thumbsUp() {
    this.post("toggleLike");
  }

  public thumbsDown() {
    this.post("toggleDislike");
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
  }
}
