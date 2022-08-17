import { StatusBarItem } from "vscode";

export interface Track {
  title: string;
  author: string;
  album: string;
  albumArt: string;
}

export enum RepeatMode {
  None = "NONE",
  Playlist = "ALL",
  Song = "ONE",
}

export interface Button {
  id: string;
  title: string;
  command: string;
  text: string;
  dynamicText?: (cond: boolean) => string;
  statusBarItem: StatusBarItem;
  isVisible: boolean;
}

export interface ApiResponse {
  error: string;
}
