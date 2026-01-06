import { useMemo } from "react";
import { toast } from "sonner";
import CoverImage, { CoverFallback } from "../ui/CoverImage";
import { ClockIcon } from "../../constants/icons";
import { useAuthStore } from "../../store/authStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { SubsonicAlbumDetail, SubsonicSong } from "../../types/subsonic";
import cn from "../../utils/cn";
import { formatTime } from "../../utils/time";
import { playSongById } from "../../utils/playbackActions";

interface AlbumSongsTableProps {
  album?: SubsonicAlbumDetail;
  onSongClick?: (song: SubsonicSong, index: number) => Promise<void> | void;
}

const AlbumSongsTable: React.FC<AlbumSongsTableProps> = ({ album, onSongClick }) => {
  const client = useAuthStore((state) => state.session?.client);
  const currentSongId = usePlaybackStore((state) => state.currentSong?.id);

  const coverUrl = useMemo(
    () => client?.getCoverArtUrl(album?.coverArt, { size: 512 }),
    [album?.coverArt, client],
  );

  const songs = useMemo(() => album?.song ?? [], [album?.song]);

  return (
    <div>
      <div className="p-2 space-x-2 flex">
        <div>
          <CoverImage
            src={coverUrl}
            alt={album?.name ?? "Album cover"}
            className="w-50 h-50 rounded border border-(--surface2)"
            placeholder={<CoverFallback rounded className="rounded" />}
            fallback={<CoverFallback rounded className="rounded" />}
          />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-(--text)">
            {album?.name}
          </h1>
        </div>
      </div>
      <div className="px-4">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th>#</th>
              <th>Title</th>
              <th>Album</th>
              <th><ClockIcon /></th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song, index) => {
              const handleClick = () => {
                try {
                  const action = onSongClick ? onSongClick(song, index) : playSongById(song.id);
                  if (action instanceof Promise) {
                    void action.catch((error) => {
                      const description = error instanceof Error ? error.message : undefined;
                      toast.error("Unable to play song", description ? { description } : undefined);
                    });
                  }
                } catch (error) {
                  const description = error instanceof Error ? error.message : undefined;
                  toast.error("Unable to play song", description ? { description } : undefined);
                }
              };

              return (
                <tr
                  key={song.id ?? `${song.title}-${index}`}
                  className={cn(
                    "hover:bg-(--surface2) cursor-pointer transition-colors",
                    currentSongId === song.id && "bg-(--surface-tonal0)",
                  )}
                  onClick={handleClick}
                >
                  <td>{index + 1}</td>
                  <td>{song.title}</td>
                  <td>{song.album}</td>
                  <td>{song.duration ? formatTime(song.duration) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlbumSongsTable;
