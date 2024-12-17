import { StatusBarItem } from "vscode";

export interface Track {
  thumbnails: Thumbnails[];
  title: string;
  author: string;
  duration: string;
  selected: boolean;
  videoId: string;
}

export enum RepeatMode {
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
export interface ApiRequestCodeResponse extends ApiResponse {
  code: string;
}
export interface ApiAuthRequestResponse extends ApiResponse {
  token: string;
}

interface Thumbnails {
  url: string;
  width: number;
  height: number;
}
export interface ApiStateResponse extends ApiResponse {
  player: {
    trackState: number
    videoProgress: number
    volume: number
    muted: boolean
    adPlaying: boolean
    queue: {
      autoplay: boolean
      items: Track[]
      automixItems: Track[]
      isGenerating: boolean
      isInfinite: boolean
      repeatMode: number // 0 = None, 1 = Playlist, 2 = Song
      selectedItemIndex: number
    }
  }
  video: {
    author: string
    channelId: string
    title: string
    album: string | null
    albumId: string | null
    likeStatus: number // 0 = Disliked, 1 = Neutral, 2 = Liked
    thumbnails: Thumbnails[]
    durationSeconds: number
    id: string
    isLive: boolean
    videoType: number
    metadataFilled: boolean
  }
  playlistId: string
}
