import CoverImage from "../ui/CoverImage";
import { PersonIcon } from "../../constants/icons";

const RELEASE_TYPE_LABELS: Record<string, string | null> = {
  album: null,
  single: "Single",
  ep: "EP",
  compilation: "Compilation",
  live: "Live",
  remix: "Remix",
  soundtrack: "Soundtrack",
  demo: "Demo",
  "dj-mix": "DJ Mix",
  mixtape: "Mixtape",
  "mixtape/street": "Mixtape",
  spokenword: "Spoken Word",
  interview: "Interview",
  audiobook: "Audiobook",
  other: null,
};

export const formatReleaseTypes = (types: string[] = [], isCompilation = false) => {
  const labels = types.map((type) => {
    const key = type.toLowerCase();
    return key in RELEASE_TYPE_LABELS ? RELEASE_TYPE_LABELS[key] : type;
  });
  if (isCompilation) labels.push("Compilation");
  return Array.from(new Set(labels.filter((label): label is string => Boolean(label))));
};

export const CollectionTags = ({ tags }: { tags: string[] }) =>
  tags.length > 0 ? (
    <ul className="flex flex-wrap gap-2" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full border border-surface4 px-3 py-1 text-sm text-text-grey">
          {tag}
        </li>
      ))}
    </ul>
  ) : null;

export const CollectionDetails = ({ lines }: { lines: (string | undefined)[] }) => {
  const visible = lines.filter((line): line is string => Boolean(line));
  return visible.length > 0 ? (
    <div className="flex flex-col gap-0.5 text-sm text-text-grey">
      {visible.map((line) => <p key={line} className="truncate">{line}</p>)}
    </div>
  ) : null;
};

export interface CollectionArtist {
  key: string;
  name: string;
  imageUrl?: string;
  onClick?: () => void;
}

const artistFallback = (
  <div className="flex h-full w-full items-center justify-center bg-surface2 text-text-grey">
    <PersonIcon />
  </div>
);

export const ArtistList = ({ artists }: { artists: CollectionArtist[] }) =>
  artists.length > 0 ? (
    <ul className="flex flex-col gap-1" aria-label="Artists">
      {artists.map((artist) => {
        const content = (
          <>
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
              <CoverImage
                src={artist.imageUrl}
                alt={artist.name}
                className="h-full w-full"
                placeholder={artistFallback}
                fallback={artistFallback}
              />
            </div>
            <span className="min-w-0 truncate text-sm font-medium text-text">{artist.name}</span>
          </>
        );
        return (
          <li key={artist.key}>
            {artist.onClick ? (
              <button
                type="button"
                onClick={artist.onClick}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-surface2"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 p-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  ) : null;
