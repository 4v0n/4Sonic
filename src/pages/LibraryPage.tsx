import { useMemo } from "react";
import { useLibraryStore } from "../store/libraryStore";

const SAMPLE_SIZE = 25;

const LibraryPage = () => {
  const status = useLibraryStore((state) => state.status);
  const indexedAt = useLibraryStore((state) => state.indexedAt);
  const signature = useLibraryStore((state) => state.signature);
  const artists = useLibraryStore((state) => state.artists);
  const albums = useLibraryStore((state) => state.albums);
  const tracks = useLibraryStore((state) => state.tracks);
  const error = useLibraryStore((state) => state.error);

  const metaString = useMemo(
    () =>
      JSON.stringify(
        {
          status,
          indexedAt,
          signature,
          artistCount: artists.length,
          albumCount: albums.length,
          trackCount: tracks.length,
          error,
        },
        null,
        2,
      ),
    [albums.length, artists.length, error, indexedAt, signature, status, tracks.length],
  );

  const artistPreview = useMemo(
    () => JSON.stringify(artists.slice(0, SAMPLE_SIZE), null, 2),
    [artists],
  );
  const albumPreview = useMemo(
    () => JSON.stringify(albums.slice(0, SAMPLE_SIZE), null, 2),
    [albums],
  );
  const trackPreview = useMemo(
    () => JSON.stringify(tracks.slice(0, SAMPLE_SIZE), null, 2),
    [tracks],
  );

  const renderPreviewFooter = (total: number) => {
    if (total <= SAMPLE_SIZE) {
      return null;
    }
    return (
      <p className="mt-2 text-xs text-(--text-grey)">
        Showing first {SAMPLE_SIZE.toLocaleString()} items. {total - SAMPLE_SIZE} more in memory.
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-(--text)">Library Debug View</h1>
        <p className="text-sm text-(--text-grey)">Live snapshot of the global store.</p>
        <pre className="mt-4 overflow-auto rounded-2xl border border-(--surface2) bg-(--surface0) p-4 text-xs leading-tight text-(--text)">
          {metaString}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-(--text)">Artists ({artists.length})</h2>
        <pre className="mt-2 max-h-56 overflow-auto rounded-2xl border border-(--surface2) bg-(--surface0) p-4 text-xs leading-tight text-(--text)">
          {artistPreview}
        </pre>
        {renderPreviewFooter(artists.length)}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-(--text)">Albums ({albums.length})</h2>
        <pre className="mt-2 max-h-56 overflow-auto rounded-2xl border border-(--surface2) bg-(--surface0) p-4 text-xs leading-tight text-(--text)">
          {albumPreview}
        </pre>
        {renderPreviewFooter(albums.length)}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-(--text)">Songs ({tracks.length})</h2>
        <pre className="mt-2 max-h-56 overflow-auto rounded-2xl border border-(--surface2) bg-(--surface0) p-4 text-xs leading-tight text-(--text)">
          {trackPreview}
        </pre>
        {renderPreviewFooter(tracks.length)}
      </section>
    </div>
  );
};

export default LibraryPage;
