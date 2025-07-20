declare global {
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
    format: ERYMFormat | '';
  }

  interface IRYMRecordDB {
    _raw?: string;
    artistName: string;
    artistNameLocalized: string;
    format: ERYMFormat | '';
    id: string;
    ownership: ERYMOwnershipStatus;
    rating: number;
    releaseDate: number | '';
    title: string;
    $artistName: string;
    $artistNameLocalized: string;
    $title: string;
  }

  interface IRYMRecordDBMatch extends IRYMRecordDB {
    _match?: 'full' | 'partial';
  }

  type RYMArtistName = { artistNameLocalized: string; artistName: string };
  type RYMArtistNames = RYMArtistName[];
}

export {};
