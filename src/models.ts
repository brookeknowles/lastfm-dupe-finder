export interface Album {
  artist: string;
  title: string;
  playcount: number;
  url: string;
}

export interface Track {
  artist: string;
  title: string;
  playcount: number;
  url: string;
}

export interface DuplicateInfo<T> {
  title: string;
  artist: string;
  "total-playcount": number;
  versions: T[];
}

export type Item = Album | Track;