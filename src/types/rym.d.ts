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
    id: string;
    title: string;
    rating: number;
    ownership: ERYMOwnershipStatus;
    format: ERYMFormat | '';
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
