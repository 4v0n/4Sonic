const base = "/rest";

export const endpoints = {
  ping: `${base}/ping`,
  album: {
    getRandomSongs: `${base}/getRandomSongs`,
  },
  library: {
    indexes: `${base}/getIndexes`,
    artist: `${base}/getArtist`,
    album: `${base}/getAlbum`,
    playlists: `${base}/getPlaylists`,
    playlist: `${base}/getPlaylist`,
  },
};
