import Dexie, { Table } from "dexie";

export interface Artist {
  id: string;
  name: string;
  albumCount?: number;
}

export interface Album {
  id: string;
  artistId: string;
  name: string;
  songCount?: number;
}

export interface Song {
  id: string;
  albumId: string;
  artistId: string;
  title: string;
  track?: number;
  duration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

interface Meta {
  key: string;
  value: string;
}

class SubsonicDb extends Dexie {
  artists!: Table<Artist>;
  albums!: Table<Album>;
  songs!: Table<Song>;
  playlists!: Table<Playlist>;
  meta!: Table<Meta>;

  constructor() {
    super("subsonic");
    this.version(1).stores({
      artists: "id,name",
      albums: "id,artistId,name",
      songs: "id,albumId,artistId,title",
      playlists: "id,name",
      meta: "key",
    });
  }
}

export const db = new SubsonicDb();

class Library {
  async getArtists() {
    return db.artists.toArray();
  }

  async getAlbumsByArtist(artistId: string) {
    return db.albums.where("artistId").equals(artistId).toArray();
  }

  async getSongsByAlbum(albumId: string) {
    return db.songs.where("albumId").equals(albumId).toArray();
  }

  async getPlaylists() {
    return db.playlists.toArray();
  }
}

export const library = new Library();
