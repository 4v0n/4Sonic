import { useMemo } from "react";
import { toast } from "sonner";
import CoverImage, { CoverFallback } from "../ui/CoverImage";
import { ArrowForwardIcon, ClockIcon, PlayArrowIcon, QueueMusicRoundedIcon } from "../../constants/icons";
import { useAuthStore } from "../../store/authStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { SubsonicAlbumDetail, SubsonicSong } from "../../types/subsonic";
import cn from "../../utils/cn";
import { formatTime } from "../../utils/time";
import { addSongToQueue, playSongById, queueSongNext } from "../../utils/playbackActions";
import { getAlbumCoverUrl } from "../../utils/mediaImages";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/ContextMenu";

interface AlbumSongsTableProps {
  album?: SubsonicAlbumDetail;
  onSongClick?: (song: SubsonicSong, index: number) => Promise<void> | void;
}

const AlbumSongsTable: React.FC<AlbumSongsTableProps> = ({ album, onSongClick }) => {
  const client = useAuthStore((state) => state.session?.client);
  const currentSongId = usePlaybackStore((state) => state.currentSong?.id);

  const coverUrl = useMemo(
    () => getAlbumCoverUrl(album, client),
    [album, client],
  );

  const songs = useMemo(() => album?.song ?? [], [album?.song]);

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3 p-2">
        <div className="h-32 w-32 flex-shrink-0 sm:h-40 sm:w-40">
          <CoverImage
            src={coverUrl}
            alt={album?.name ?? "Album cover"}
            className="h-full w-full rounded border border-(--surface2)"
            placeholder={<CoverFallback rounded className="rounded" />}
            fallback={<CoverFallback rounded className="rounded" />}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-3xl font-extrabold leading-tight text-(--text) sm:text-4xl">
            {album?.name}
          </h1>
        </div>
      </div>
      <div className="overflow-x-auto px-4">
        <table className="w-full min-w-[560px]">
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

              const handlePlayNext = () => {
                void queueSongNext(song).catch((error) => {
                  const description = error instanceof Error ? error.message : undefined;
                  toast.error("Unable to queue song next", description ? { description } : undefined);
                });
              };

              const handleAddToQueue = () => {
                void addSongToQueue(song).catch((error) => {
                  const description = error instanceof Error ? error.message : undefined;
                  toast.error("Unable to add song to queue", description ? { description } : undefined);
                });
              };

              return (
                <ContextMenu key={song.id ?? `${song.title}-${index}`}>
                  <ContextMenuTrigger asChild>
                    <tr
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
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem icon={<PlayArrowIcon />} onSelect={handleClick}>
                      Play
                    </ContextMenuItem>
                    <ContextMenuItem icon={<ArrowForwardIcon />} onSelect={handlePlayNext}>
                      Play next
                    </ContextMenuItem>
                    <ContextMenuItem icon={<QueueMusicRoundedIcon />} onSelect={handleAddToQueue}>
                      Add to queue
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlbumSongsTable;
