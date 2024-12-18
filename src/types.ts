import { StatusBarItem } from "vscode";

export interface Track {
  title: string;
  author: string;
}

export interface State {
  player: PlayerState;
  video: VideoState;
}

export interface PlayerState {
  queue: QueueState;
  trackState: TrackStatus;
}

export interface QueueState {
  items: Track[];
  repeatMode: RepeatMode;
}

export interface VideoState {
  likeStatus: LikeStatus;
}

export enum LikeStatus {
  Unknown = -1,
  Disliked = 0,
  Indefferent = 1,
  Liked = 2,
}

export enum TrackStatus {
  Unknown = -1,
  Paused = 0,
  Playing = 1,
  Buffering = 2,
}

export enum RepeatMode {
  Unknown = -1,
  None = 0,
  Playlist = 1,
  Song = 2,
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
