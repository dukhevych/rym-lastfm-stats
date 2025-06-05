declare global {
  enum ERYMOwnershipStatus {
    InCollection = 'o',
    OnWishlist = 'w',
    UsedToOwn = 'u',
    NotCataloged = 'n',
  }

  export enum ERYMFormats {
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

  interface IRYMRecordExport {
    id: string;
    firstName: string;
    lastName: string;
    firstNameLocalized: string;
    lastNameLocalized: string;
    title: string;
    releaseDate: string;
    rating: number;
    ownership: ERYMOwnershipStatus;
    format: ERYMFormats | '';
  }

  interface IRYMRecordDB {
    _raw?: string;
    id: string;
    title: string;
    rating: number;
    ownership: ERYMOwnershipStatus;
    format: ERYMFormats | '';
    artistName: string;
    artistNameLocalized: string;
    $artistName: string;
    $artistNameLocalized: string;
    $title: string;
    releaseDate: number;
  }

  interface IRYMRecordDBMatch extends IRYMRecordDB {
    _match?: 'full' | 'partial';
  }
}

export {};
