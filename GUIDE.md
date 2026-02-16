# 4Sonic Developer Guide (Quick Reference)

This is a short guide to the current APIs, stores, and helpers used in the app. It focuses on getting library data, searching, and interacting with the player/queue.

## Authentication + Client Access
- The Subsonic client is created and stored in `useAuthStore` after login.
- Access it from any component or utility:

```tsx
import { useAuthStore } from "../store/authStore";

const client = useAuthStore((state) => state.session?.client);
```

- Login flow lives in `useAuthStore` (`login`, `logout`, `hydrateFromStorage`).

## Library Data (Artists / Albums / Tracks)
- Library data is stored in `useLibraryStore`.
- Use helper hooks from `src/hooks/useLibrary.ts`:

```tsx
import { useLibraryBootstrap, useArtists, useAlbums, useTracks } from "../hooks/useLibrary";

useLibraryBootstrap(); // call once in an app shell after auth

const artists = useArtists();
const albums = useAlbums();
const tracks = useTracks();
```

- Direct store access (actions + status):

```tsx
import { useLibraryStore } from "../store/libraryStore";

const status = useLibraryStore((state) => state.status);
const error = useLibraryStore((state) => state.error);
```

## Searching / Filtering
Search is currently implemented in UI components (for example, `MediaCollection`) as a case-insensitive substring match. For consistent behavior across pages, use the lightweight helpers in `src/utils/search.ts` and `src/utils/strings.ts` (normalize text, build a blob, and rank/filter matches).

- Example: provide `searchText` in `mapItem`:

```tsx
const mapAlbumToItem = (album) => ({
  id: album.id,
  title: album.title,
  subtitle: album.artistName,
  searchText: [album.title, album.artistName, album.genre].filter(Boolean).join(" "),
});
```

- For custom filtering outside `MediaCollection`, do simple string matches:

```tsx
const query = searchQuery.trim().toLowerCase();
const filtered = albums.filter((album) =>
  [album.title, album.artistName, album.genre]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query)
);
```

## Playback + Queue
### Quick playback helpers
Utilities in `src/utils/playbackActions.ts` (recommended for page-level actions):

```ts
playSong(song)
playSongById(songId)
playAlbum(albumIdOrDetail, { startSongId? })
playArtist(artistIdOrDetail, { fallbackSongs? })
```

What each does:
- `playSong(song)`: plays a **song object** immediately (e.g. `playSong(album.tracks[0])`).
- `playSongById(songId)`: fetches the song and plays it immediately.
- `playAlbum(...)`: inserts the album’s songs and starts at `startSongId` (or the first track).
- `playArtist(...)`: inserts the artist’s songs and starts immediately (can fall back to provided songs).

All of the `play*` helpers above **do not clear the queue**. They act as “Play now / Play next” by inserting items at the front of the queue and jumping to the first inserted item.

### Player store (state + actions)
Use `usePlaybackStore` from `src/store/playbackStore.ts`.

Common state:
- `currentSong`, `coverArtUrl`
- `isPlaying`, `isLoading`, `position`, `duration`
- `queue`, `queueOrder`, `queuePosition`
- `shuffle`, `repeat`, `volume`, `isMuted`, `error`

Common actions:
- `playSong(songId, { queueItem? })`
- `togglePlayPause()`, `pause()`
- `seek(time)` / `beginScrub()` / `endScrub(time?)`
- `setQueue(items, startIndex?)`
- `addToQueue(items)` (append to end)
- `addToQueueFront(items)` (insert right after current track)
- `moveQueueItem(fromOrderIndex, toOrderIndex)` (reorder queue)
- `removeFromQueue(orderIndex)` (delete from queue)
- `playFromQueue(orderIndex)`, `playNext()`, `playPrevious()`
- `toggleShuffle()`, `cycleRepeat()`

Example usage:

```tsx
import { usePlaybackStore } from "../store/playbackStore";

const playNext = usePlaybackStore((state) => state.playNext);
const isPlaying = usePlaybackStore((state) => state.isPlaying);
```

Example: play a specific song object immediately (without clearing queue):
```ts
import { playSong } from "../utils/playbackActions";

await playSong(song); // song is a SubsonicSong
```

Queue order note:
- `queue` holds items in original order.
- `queueOrder` is an array of indexes (used when shuffle is enabled).
- `queuePosition` is the current index within `queueOrder`.

To render “up next” in playback order:

```ts
const ordered = queueOrder.map((queueIndex) => queue[queueIndex]).filter(Boolean);
```

### Queue manipulation examples
```tsx
import { usePlaybackStore } from "../store/playbackStore";

const { addToQueue, addToQueueFront, moveQueueItem, removeFromQueue } = usePlaybackStore.getState();

// append items to the end of the queue
addToQueue(newItems);

// insert items to play next (right after current song)
addToQueueFront(nextUpItems);

// reorder items by their position in queueOrder
moveQueueItem(5, 1);

// remove an item by its queueOrder position
removeFromQueue(3);
```

If you want to **replace the queue**, use `setQueue(newItems, startIndex)` or `setQueue([])` to clear it.

## Cover Art / Artist Images
Centralized helpers live in `src/utils/mediaImages.ts`:

```ts
getCoverArtUrl(client, coverArtId)
getArtistImageUrl(artist, client)
getAlbumCoverUrl(album, client)
getSongCoverUrl(song, album, client)
DEFAULT_COVER_SIZE // 512 by default
```

These helpers:
- enforce a consistent size parameter
- prefer `artistImageUrl` when present
- resize server-hosted artist images if possible

## Caching & Persistence (Current Behavior)
- **Library data** is persisted in IndexedDB (`Dexie`) and rehydrated on load.
- **Audio cache** (streamed tracks) is persisted in IndexedDB and LRU-evicted.
- **Playback preferences** (volume/mute/shuffle/repeat) are persisted via Zustand.
- **Image cache** (cover art / artist images) is persisted in IndexedDB and loaded lazily when image tiles enter the viewport. Cached entries are LRU-evicted and image blobs are normalized to `image/webp` when it reduces size.

## Related Utilities (What / Why / Where)
- `src/utils/playbackSort.ts`: `sortSongsForQueue` — consistent disc/track/title ordering. Use when presenting album/track lists.
- `src/utils/playbackMapping.ts`: `trackToSong`, `songToQueueItem`, `queueItemToSong` — central mappings to avoid duplicated shape conversions.
- `src/utils/time.ts`: `formatTime` — display durations in UI.
- `src/utils/mediaImages.ts`: `getArtistImageUrl`, `getAlbumCoverUrl`, `getSongCoverUrl` — consistent cover art sizing and artist image fallback.
- `src/services/image/imageCache.ts`: `imageCache.getImageSource` — persistent IndexedDB-backed image cache used by `LazyImage` (lazy fetch + LRU eviction + WebP normalization when beneficial).
- `src/utils/numbers.ts`: `clamp`, `clamp01`, `safeNumber` — bound values (volume, seek, sliders) and sanitize numeric input.
- `src/utils/strings.ts`: `normalizeText`, `tokenize`, `buildSearchBlob`, `includesNormalized` — normalize and match strings for search and filtering.
- `src/utils/search.ts`: `createSearchCandidate`, `matchesQuery`, `scoreQuery`, `filterAndRank` — basic ranking/filtering for local fuzzy-ish search.
- `src/utils/collections.ts`: `indexBy`, `groupBy`, `uniqueBy`, `sortBy`, `sortByKey` — transform arrays into maps and sorted views.
- `src/utils/errors.ts`: `toErrorMessage`, `isAbortError`, `safeAsync` — standardize error handling and async fallbacks.

## Utility Examples (How / Where to use)

### Numbers (clamp inputs, sanitize API values)
```ts
import { clamp, clamp01, safeNumber } from "../utils/numbers";

const volume = clamp01(userInput);
const bounded = clamp(position, 0, duration);
const rating = safeNumber(apiValue, 0);
```

### Strings + Search (consistent matching)
```ts
import { buildSearchBlob } from "../utils/strings";
import { createSearchCandidate, filterAndRank } from "../utils/search";

const candidates = tracks.map((track) =>
  createSearchCandidate(track.id, [track.title, track.artistName, track.albumName])
);

const ranked = filterAndRank(candidates, query, { limit: 25 });
const resultIds = ranked.map((entry) => entry.id);
```

```ts
import { normalizeText, tokenize, includesNormalized } from "../utils/strings";

const normalized = normalizeText("Beyonce  -  Halo"); // "beyonce halo"
const tokens = tokenize("The Dark Side of the Moon"); // ["the","dark","side","of","the","moon"]
const match = includesNormalized("Radiohead - In Rainbows", "rain"); // true
```

### Collections (indexing and grouping)
```ts
import { groupBy, indexBy, uniqueBy, sortByKey } from "../utils/collections";

const albumsByArtist = groupBy(albums, (album) => album.artistId);
const albumMap = indexBy(albums, (album) => album.id);
const uniqueAlbums = uniqueBy(albums, (album) => album.id);
const sortedAlbums = sortByKey(albums, (album) => album.title.toLowerCase());
```

### Errors (uniform error handling)
```ts
import { toErrorMessage, isAbortError, safeAsync } from "../utils/errors";

try {
  await client.getAlbum(id);
} catch (error) {
  if (!isAbortError(error)) {
    toast.error(toErrorMessage(error, "Unable to load album"));
  }
}

const payload = await safeAsync(fetch(url).then((r) => r.json()));
```

---
If you want this guide expanded (e.g., add a fuzzy search section or a data model diagram), say the word and I’ll extend it.
