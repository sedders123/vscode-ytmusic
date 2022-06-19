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

export interface KeyedCollection<T> {
  Add(key: string, value: T);
  ContainsKey(key: string): boolean;
  Count(): number;
  Item(key: string): T | null | undefined;
  Keys(): string[];
  Remove(key: string): void;
  Values(): T[];
}

export interface ApiResponse {
  error: string;
}
