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
};

export enum RYMEntityCode {
  Artist = 'a',
  Release = 'l',
  Song = 'z',
  // Uncomment these if needed in the future
  // Y = 'v/a release',
  // B = 'label',
  // H = 'genre',
  // U = 'user',
  // S = 'list',
}
