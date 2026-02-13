# 4Sonic Architecture & Sequence Diagrams (Mermaid)

This document captures the current app architecture and key runtime flows. The diagrams reflect the actual modules and data flow in the codebase.

## High‑Level Architecture (UI, Stores, Services, Storage)

```mermaid
flowchart LR
  %% Entry + App Shell
  subgraph Runtime[App Runtime]
    Main[main.tsx\nReactDOM + ThemeProvider + HashRouter]
    App[App.tsx\nRoutes + RequireAuth]
    Shell[AppShell\nTopBar/Left/Right/Bottom + Sonner]
    Pages[Pages\nLibrary/Albums/Artists/AlbumDetail/...]
    Components[UI Components\nMediaCard/AlbumSongsTable/etc]
  end

  %% Hooks
  subgraph Hooks
    LibraryBootstrap[useLibraryBootstrap]
    MediaSessionHook[useMediaSession]
    VisualizerHook[useAudioVisualizerData]
  end

  %% Stores (Zustand)
  subgraph Stores[State Stores (Zustand)]
    AuthStore[authStore\nSubsonic session + login/logout]
    LibraryStore[libraryStore\nartists/albums/tracks + bootstrap]
    PlaybackStore[playbackStore\nplayer state + queue]
    UiPrefsStore[uiPreferencesStore\nvisualizer + toast prefs]
    RightSidebarStore[rightSidebarStore\nqueue panel]
  end

  %% Services
  subgraph Services
    SubsonicClient[SubsonicClient\nREST API + stream URL]
    AudioPlayer[HiResAudioPlayer\nHTMLAudio + WebAudio]
    AudioCache[AudioCache\nIndexedDB + fetch]
  end

  %% Storage
  subgraph Storage
    LocalStorage[LocalStorage\nAuth credentials + prefs]
    LibraryDB[Dexie: libraryDb\nartists/albums/tracks snapshot]
    AudioCacheDB[Dexie: audioCacheDb\ntrack blobs]
  end

  %% External
  subgraph External
    SubsonicServer[Subsonic/Navidrome Server]
    MediaSession[OS Media Session API]
    BrowserAudio[HTMLAudioElement/WebAudio]
  end

  %% Wiring
  Main --> App --> Shell --> Pages --> Components
  Shell --> LibraryBootstrap --> LibraryStore
  Shell --> MediaSessionHook --> PlaybackStore
  Shell --> VisualizerHook --> PlaybackStore

  Pages --> AuthStore
  Pages --> LibraryStore
  Pages --> PlaybackStore
  Components --> PlaybackStore
  Components --> RightSidebarStore
  Components --> UiPrefsStore

  AuthStore --> SubsonicClient
  LibraryStore --> SubsonicClient
  PlaybackStore --> SubsonicClient

  PlaybackStore --> AudioPlayer
  PlaybackStore --> AudioCache

  AudioCache --> AudioCacheDB
  LibraryStore --> LibraryDB
  AuthStore --> LocalStorage
  UiPrefsStore --> LocalStorage
  PlaybackStore --> LocalStorage

  SubsonicClient --> SubsonicServer
  AudioPlayer --> BrowserAudio
  MediaSessionHook --> MediaSession
```

## Startup & Library Bootstrap Sequence

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Main as main.tsx
  participant App as App.tsx
  participant Auth as authStore
  participant LS as LocalStorage
  participant Client as SubsonicClient
  participant Shell as AppShell
  participant LibHook as useLibraryBootstrap
  participant LibStore as libraryStore
  participant LibDB as libraryDb (Dexie)
  participant Server as Subsonic Server

  User->>Main: Launch app
  Main->>App: Render routes
  App->>Auth: hydrateFromStorage()
  Auth->>LS: read credentials
  alt credentials present
    Auth->>Client: create + ping()
    Client->>Server: /rest/ping
    Auth-->>App: session ready
  else no credentials
    Auth-->>App: not authenticated
  end

  App->>Shell: Render AppShell (after auth)
  Shell->>LibHook: useLibraryBootstrap()
  LibHook->>LibStore: bootstrap(client)
  LibStore->>LibDB: loadLibrarySnapshot()
  alt snapshot matches server signature
    LibStore-->>Shell: use cached artists/albums/tracks
  else fetch remote
    LibStore->>Server: getArtists / getArtist / getAlbum
    LibStore->>LibDB: saveLibrarySnapshot()
    LibStore-->>Shell: updated library state
  end
```

## Playback (Play Now / Queue + Audio Cache) Sequence

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as UI/Pages
  participant Actions as playbackActions
  participant Store as playbackStore
  participant Auth as authStore
  participant Client as SubsonicClient
  participant Cache as AudioCache
  participant CacheDB as audioCacheDb
  participant Player as HiResAudioPlayer
  participant Audio as HTMLAudioElement

  User->>UI: Click Play (song/album/artist)
  UI->>Actions: playSong(song) / playAlbum(...) / playArtist(...)
  Actions->>Store: addToQueueFront(queueItems)
  Actions->>Store: playFromQueue(targetIndex)

  Store->>Auth: get session/client
  Store->>Client: getSong (if metadata required)
  Store->>Client: getStreamUrl(songId)

  Store->>Cache: getPlayableSource(stream)
  Cache->>CacheDB: read cached blob
  alt cached
    Cache-->>Store: objectUrl (from cache)
  else not cached
    Cache-->>Store: stream URL (no prefetch for current)
  end

  Store->>Player: setSource(url, duration)
  Player->>Audio: load + play
  Audio-->>Player: events (play/progress/ended)
  Player-->>Store: callbacks update state

  opt prefetch next when current is cached
    Store->>Cache: getPlayableSource(next track) (prefetch)
    Cache->>CacheDB: save blob (LRU)
  end
```

## Media Session Controls (Prev/Next + Like)

```mermaid
sequenceDiagram
  autonumber
  participant OS as OS Media Controls
  participant Hook as useMediaSession
  participant Store as playbackStore

  OS->>Hook: previoustrack / nexttrack
  Hook->>Store: playPrevious() / playNext()

  OS->>Hook: like / favorite
  Hook->>Hook: console.log + toast
```

## Queue Data Model (Normalized + Order)

```mermaid
flowchart TB
  Queue[queue: QueueItem[]] --> Order[queueOrder: number[]]
  Order --> Position[queuePosition]

  note right of Queue
    queue is the source list
    (original insertion order)
  end note

  note right of Order
    queueOrder indexes into queue
    and changes when shuffle/reorder
  end note

  note right of Position
    queuePosition = current index
    within queueOrder
  end note
```

## Storage & Persistence Notes
- Auth credentials and UI preferences are stored in LocalStorage.
- Library snapshot is persisted in IndexedDB via Dexie (`libraryDb`).
- Audio cache persists track blobs in IndexedDB via Dexie (`audioCacheDb`).
- Playback preferences (volume/mute/shuffle/repeat) are persisted via Zustand `persist`.
