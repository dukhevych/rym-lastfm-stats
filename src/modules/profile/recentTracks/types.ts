export interface UIElements {
  item: HTMLElement;
  artbox: HTMLElement;
  infobox: HTMLElement;
  artLink: HTMLAnchorElement;
  itemArt: HTMLImageElement;
  infoboxLower: HTMLElement;
  itemDate: HTMLElement;
  statusSpan: HTMLSpanElement;
  release: HTMLElement;
  artistSpan: HTMLElement;
  artistLink: HTMLAnchorElement;
  separator: HTMLSpanElement;
  trackLink: HTMLAnchorElement;
  customMyRating: HTMLElement;
  starsWrapper: HTMLElement;
  starsFilled: HTMLElement;
  starsEmpty: HTMLElement;
  format: HTMLElement;
  customFromAlbum: HTMLElement;
}

export interface UIRecentTracks {
  button: HTMLButtonElement;
  lockButton: HTMLButtonElement;
  profileButton: HTMLAnchorElement;
  tracksWrapper: HTMLElement;
  panelContainer: HTMLElement;
}

export interface TrackDataNormalized {
  albumName: string;
  artistName: string;
  coverExtraLargeUrl: string;
  coverLargeUrl: string;
  coverUrl: string;
  nowPlaying: boolean;
  timestamp: number | null;
  trackName: string;
}

export interface PlayHistoryData extends TrackDataNormalized {
  albumUrl: string;
  artistUrl: string;
  trackUrl: string;
}
