export enum ERYMOwnershipStatus {
  InCollection = 'o',
  OnWishlist = 'w',
  UsedToOwn = 'u',
  NotCataloged = 'n',
}

export enum ERYMOwnershipAltText {
  OnWishlist = 'Wishlist',
  UsedToOwn = 'Used to Own',
}

export enum ERYMFormat {
  CD = 'CD',
  LP = 'LP',
  MP3 = 'MP3',
  CD_R = 'CD-R',
  Cassette = 'Cassette',
  DVD_A = 'DVD-A',
  SACD = 'SACD',
  Minidisc = 'Minidisc',
  Multiple = 'Multiple',
  EightTrack = '8-Track',
  Other = 'Other',
}

export enum ERYMEntityCode {
  Artist = 'a',
  Release = 'l',
  Song = 'z',
  // VARelease = 'y',
  // Label = 'b',
  // Genre = 'h',
  // User = 'u',
  // List = 's',
}

export enum ERYMEntityType {
  Artist = 'artist',
  Release = 'release',
  Song = 'song',
  // VARelease = 'v/a release',
  // Label = 'label',
  // Genre = 'genre',
  // User = 'user',
  // List = 'list',
}

export enum ERYMDiscographyType {
  Album = 's',
  LiveAlbum = 'l',
  EP = 'e',
  Single = 'i',
  MusicVideo = 'o',
  AppearsOn = 'a',
  VACompilation = 'v',
  AdditionalRelease = 'x',
}

export enum ERYMReleaseType {
  Album = 'album',
  Single = 'single',
  MusicVideo = 'music video',
  Compilation = 'compilation',
  EP = 'ep',
}
