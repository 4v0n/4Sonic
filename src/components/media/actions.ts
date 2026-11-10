import { toast } from "sonner";
import { addAlbumToQueue, addArtistToQueue, playAlbum, playArtist, queueAlbumNext, queueArtistNext } from "../../utils/playbackActions";
import type { MediaActions } from "./types";

const withErrorToast = (action: () => Promise<unknown>, message: string) => () => {
  void action().catch((error) => {
    const description = error instanceof Error ? error.message : undefined;
    toast.error(message, description ? { description } : undefined);
  });
};

export const getArtistActions = (artistId: string): MediaActions => ({
  onPlay: withErrorToast(() => playArtist(artistId), "Unable to play artist"),
  onPlayNext: withErrorToast(() => queueArtistNext(artistId), "Unable to queue artist next"),
  onAddToQueue: withErrorToast(() => addArtistToQueue(artistId), "Unable to add artist to queue"),
});

export const getAlbumActions = (albumId: string): MediaActions => ({
  onPlay: withErrorToast(() => playAlbum(albumId), "Unable to play album"),
  onPlayNext: withErrorToast(() => queueAlbumNext(albumId), "Unable to queue album next"),
  onAddToQueue: withErrorToast(() => addAlbumToQueue(albumId), "Unable to add album to queue"),
});
