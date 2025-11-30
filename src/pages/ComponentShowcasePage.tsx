import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Checkbox from "../components/ui/Checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/RadioGroup";
import Toggle from "../components/ui/Toggle";
import { AlbumIcon, SettingsIcon, PersonIcon, LogoutIcon, SearchIcon } from "../constants/icons";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/ToggleGroup";
import { KeybindInput } from "../components/ui/KeybindInput";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/Dialog";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "../components/ui/ContextMenu";
import Dropdown, { MenuOption } from "../components/ui/Dropdown";
import ThemeToggle from "../components/ui/ThemeToggle";
import TextInput from "../components/ui/TextInput";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "../components/ui/Popover";
import Select from "../components/ui/Select";
import Switch from "../components/ui/Switch";
import { useThemeContext } from "../context/ThemeContext";
import { ToastPosition, useUiPreferencesStore } from "../store/uiPreferencesStore";
import MediaCard from "../components/ui/MediaCard";
import { useAuthStore } from "../store/authStore";
import { SubsonicAlbumDetail, SubsonicArtistDetail, SubsonicSong } from "../types/subsonic";
import { playSong } from "../store/playbackStore";

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="rounded-2xl border border-(--surface2) bg-(--surface0) p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-(--text)">{title}</h2>
        {description ? <p className="text-sm text-(--text-grey)">{description}</p> : null}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const ColorSwatch = ({ token, label }: { token: string; label?: string }) => (
  <div className="flex flex-col gap-2 rounded-xl border border-(--surface2) bg-(--surface0) p-3">
    <div
      className="h-12 rounded-lg border border-(--surface2)"
      style={{ backgroundColor: `var(--${token})` }}
    />
    <div className="flex items-center justify-between text-xs text-(--text-grey)">
      <span className="font-mono text-[11px] text-(--text)">{`--${token}`}</span>
      {label ? <span>{label}</span> : null}
    </div>
  </div>
);

const ARTIST_ID = "6JCzuakmXaoYTFOLHxW95K";
const ALBUM_ID = "6wjcr9S3g1Vq76fvyQQJY3";
const SONG_ID = "2g86dzL72duiY56gZETV2w";

interface MediaSamplesState {
  artist?: SubsonicArtistDetail;
  album?: SubsonicAlbumDetail;
  song?: SubsonicSong;
  loading: boolean;
  error?: string;
}

const ComponentShowcasePage = () => {

  const { theme, themes } = useThemeContext();
  const session = useAuthStore((state) => state.session);
  const client = session?.client;
  const [isChecked, setIsChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option-one");
  const [selectValue, setSelectValue] = useState("light");
  const [switchOn, setSwitchOn] = useState(true);
  const [keybind, setKeybind] = useState("⌘ + K");
  const [textValue, setTextValue] = useState("Navidrome server");
  const [mediaSamples, setMediaSamples] = useState<MediaSamplesState>({ loading: true });
  const toastPosition = useUiPreferencesStore((state) => state.toastPosition);
  const setToastPosition = useUiPreferencesStore((state) => state.setToastPosition);
  const activeThemeLabel = useMemo(
    () => themes.find((option) => option.id === theme)?.label ?? theme,
    [theme, themes],
  );
  const toastPositionOptions = useMemo(
    () => ([
      { label: "Top left", value: "top-left" as ToastPosition },
      { label: "Top center", value: "top-center" as ToastPosition },
      { label: "Top right", value: "top-right" as ToastPosition },
      { label: "Bottom left", value: "bottom-left" as ToastPosition },
      { label: "Bottom center", value: "bottom-center" as ToastPosition },
      { label: "Bottom right", value: "bottom-right" as ToastPosition },
    ]),
    [],
  );
  const paletteSections = useMemo(() => ([
    {
      title: "Primary ramp",
      description: "Brand greens used for emphasis and key actions.",
      tokens: ["primary0", "primary1", "primary2", "primary3", "primary4", "primary5"],
    },
    {
      title: "Surface ramp",
      description: "Layered backgrounds for panels, cards, and separators.",
      tokens: ["surface0", "surface1", "surface2", "surface3", "surface4", "surface5"],
    },
    {
      title: "Tonal ramp",
      description: "Subtle, desaturated surfaces for neutral emphasis blocks.",
      tokens: ["surface-tonal0", "surface-tonal1", "surface-tonal2", "surface-tonal3", "surface-tonal4", "surface-tonal5"],
    },
    {
      title: "Semantic ramp",
      description: "Feedback colors for success, warning, danger, and info.",
      tokens: ["success0", "success1", "success2", "warning0", "warning1", "warning2", "danger0", "danger1", "danger2", "info0", "info1", "info2"],
    },
  ]), []);

  useEffect(() => {
    if (!client) {
      return;
    }

    let cancelled = false;

    const fetchSamples = async () => {
      setMediaSamples((previous) => ({ ...previous, loading: true, error: undefined }));

      try {
        const [artistResponse, albumResponse, songResponse] = await Promise.all([
          client.getArtist(ARTIST_ID),
          client.getAlbum(ALBUM_ID),
          client.getSong(SONG_ID),
        ]);

        if (cancelled) {
          return;
        }

        setMediaSamples({
          loading: false,
          artist: artistResponse.artist,
          album: albumResponse.album,
          song: songResponse.song,
          error: undefined,
        });
      } catch (error) {
        if (!cancelled) {
          setMediaSamples((previous) => ({
            ...previous,
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load sample media",
          }));
        }
      }
    };

    void fetchSamples();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const albumMeta = useMemo(() => {
    if (!mediaSamples.album) return "";
    const songs = mediaSamples.album.songCount ?? mediaSamples.album.song?.length;
    const yearPart = mediaSamples.album.year ? String(mediaSamples.album.year) : undefined;
    const songPart = songs ? `${songs} song${songs === 1 ? "" : "s"}` : undefined;
    return [yearPart, songPart].filter(Boolean).join(" • ");
  }, [mediaSamples.album]);

  const songMeta = useMemo(() => {
    if (!mediaSamples.song && !mediaSamples.album) return "";
    const albumName = mediaSamples.song?.album ?? mediaSamples.album?.name;
    const yearPart = mediaSamples.song?.year ?? mediaSamples.album?.year;
    const yearString = yearPart ? String(yearPart) : undefined;
    return [albumName, yearString].filter(Boolean).join(" • ");
  }, [mediaSamples.album, mediaSamples.song]);

  const artistMeta = useMemo(() => {
    if (!mediaSamples.artist?.albumCount) return "";
    return `${mediaSamples.artist.albumCount} album${mediaSamples.artist.albumCount === 1 ? "" : "s"}`;
  }, [mediaSamples.artist]);

  const artistCover = useMemo(() => {
    if (mediaSamples.artist?.artistImageUrl) {
      return mediaSamples.artist.artistImageUrl;
    }
    return client?.getCoverArtUrl(mediaSamples.artist?.coverArt, { size: 512 });
  }, [client, mediaSamples.artist]);

  const albumCover = useMemo(
    () => client?.getCoverArtUrl(mediaSamples.album?.coverArt, { size: 512 }),
    [client, mediaSamples.album?.coverArt],
  );

  const songCover = useMemo(
    () => client?.getCoverArtUrl(mediaSamples.song?.coverArt ?? mediaSamples.album?.coverArt, { size: 512 }),
    [client, mediaSamples.album?.coverArt, mediaSamples.song?.coverArt],
  );

  const handlePlaySampleSong = async () => {
    if (!mediaSamples.song?.id) {
      toast.error("Song not loaded yet");
      return;
    }
    try {
      await playSong(mediaSamples.song.id);
      toast.success(`Playing ${mediaSamples.song.title}`);
    } catch (error) {
      const description = error instanceof Error ? error.message : undefined;
      toast.error("Unable to play song", description ? { description } : undefined);
    }
  };

  const dropdownOptions: MenuOption[] = [
    { label: "Profile", onClick: () => alert("Profile"), icon: <PersonIcon fontSize="small" /> },
    { label: "Settings", onClick: () => alert("Settings"), icon: <SettingsIcon fontSize="small" /> },
    { isDivider: true },
    { label: "Logout", onClick: () => alert("Logout"), icon: <LogoutIcon fontSize="small" /> },
  ];

  const selectOptions = [
    { label: "Light", value: "light" },
    { label: "Dimmed (long label example)", value: "dimmed" },
    { label: "Dark", value: "dark" },
  ];

  return (
    <div className="space-y-10 p-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold text-(--text)">Component Showcase</h1>
        <p className="text-(--text-grey) max-w-3xl">
          A quick look at the primitives available in this project. Each card shows a live component with the styles they ship with.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 space-y-6">
          <Section
            title="Media Cards"
            description="Artist, album, and song presentations with hover play affordances."
          >
            {mediaSamples.error ? (
              <p className="text-sm text-(--danger1)">Unable to load media samples: {mediaSamples.error}</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              <MediaCard
                kind="artist"
                title={mediaSamples.artist?.name}
                subtitle={artistMeta}
                coverUrl={artistCover}
                isLoading={mediaSamples.loading && !mediaSamples.artist}
                onPlay={() => toast(`Play artist: ${mediaSamples.artist?.name ?? "Artist"}`)}
                className="w-full max-w-none"
              />
              <MediaCard
                kind="album"
                title={mediaSamples.album?.name}
                subtitle={mediaSamples.album?.artist}
                coverUrl={albumCover}
                isLoading={mediaSamples.loading && !mediaSamples.album}
                onPlay={() => toast.success(`Play album: ${mediaSamples.album?.name ?? "Album"}`)}
                className="w-full max-w-none"
              />
              <MediaCard
                kind="song"
                title={mediaSamples.song?.title}
                subtitle={mediaSamples.song?.artist ?? mediaSamples.album?.artist}
                meta={mediaSamples.song?.album ?? mediaSamples.album?.name}
                coverUrl={songCover}
                isLoading={mediaSamples.loading && !mediaSamples.song}
                onPlay={handlePlaySampleSong}
                className="w-full max-w-none"
              />
            </div>
            <div className="space-y-3">
              <MediaCard
                layout="row"
                kind="album"
                title={mediaSamples.album?.name}
                subtitle={mediaSamples.album?.artist}
                meta={albumMeta}
                coverUrl={albumCover}
                isLoading={mediaSamples.loading && !mediaSamples.album}
                onPlay={() => toast.success(`Play album: ${mediaSamples.album?.name ?? "Album"}`)}
                className="w-full"
              />
              <MediaCard
                layout="row"
                kind="song"
                title={mediaSamples.song?.title}
                subtitle={mediaSamples.song?.artist ?? mediaSamples.album?.artist}
                meta={songMeta}
                coverUrl={songCover}
                isLoading={mediaSamples.loading && !mediaSamples.song}
                onPlay={handlePlaySampleSong}
                className="w-full"
              />
            </div>
            <p className="text-xs text-(--text-grey)">
              Using artist {ARTIST_ID}, album {ALBUM_ID}, and song {SONG_ID} from your Navidrome server.
            </p>
          </Section>

          <Section title="Theme & Palette" description={`Currently using the ${activeThemeLabel} theme.`}>
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <span className="text-sm text-(--text-grey)">Toggle themes and inspect the tokens below.</span>
            </div>
            <div className="space-y-8">
              {paletteSections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-(--text)">{section.title}</h3>
                    <p className="text-sm text-(--text-grey)">{section.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                    {section.tokens.map((token) => (
                      <ColorSwatch key={token} token={token} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Inputs & Toggles" description="Text input, checkbox, radio, toggle, grouped toggles and keybind input.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-(--text-grey)">Text input</p>
                <TextInput
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  placeholder="Enter any text"
                />
                <p className="text-xs text-(--text-grey)">Current value: {textValue || "Empty"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-(--text-grey)">With leading icon</p>
                <TextInput startIcon={<SearchIcon />} placeholder="Search library" />
                <TextInput placeholder="Disabled state" disabled value="Input disabled" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={isChecked} onCheckedChange={setIsChecked} id="cb-1" />
                  <label htmlFor="cb-1">Enable notifications</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={isChecked} onCheckedChange={setIsChecked} disabled id="cb-2" />
                  <label htmlFor="cb-2" className="text-(--text-grey)">Disabled state</label>
                </div>
              </div>
              <div className="space-y-2">
                <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="option-one" id="radio-one" />
                    <label htmlFor="radio-one">Option One</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="option-two" id="radio-two" />
                    <label htmlFor="radio-two">Option Two</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="option-three" disabled id="radio-three" />
                    <label htmlFor="radio-three" className="text-(--text-grey)">Disabled Option</label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Toggle pressed={isChecked} onPressedChange={setIsChecked} aria-label="Toggle default">
                <AlbumIcon />
              </Toggle>
              <Toggle pressed={isChecked} onPressedChange={setIsChecked} aria-label="Toggle outline" variant="outline">
                <AlbumIcon />
              </Toggle>
              <ToggleGroup value={radioValue} onValueChange={setRadioValue} type="single">
                <ToggleGroupItem value="option-one"><AlbumIcon/></ToggleGroupItem>
                <ToggleGroupItem value="option-two"><AlbumIcon /></ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-(--text-grey)">Keybind input</p>
              <KeybindInput value={keybind} onValueChange={setKeybind} />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-(--text-grey)">Switch</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Enable downloads" />
                  <span className="text-(--text)">Enable downloads</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch size="lg" aria-label="Large switch" />
                  <span className="text-(--text)">Large size</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-(--text-grey)">
                  <Switch disabled aria-label="Disabled switch" />
                  <span>Disabled</span>
                </label>
              </div>
              <p className="text-xs text-(--text-grey)">Switch is {switchOn ? "on" : "off"}.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-(--text-grey)">Select</p>
              <div className="flex flex-wrap gap-3">
                <Select
                  size="small"
                  value={selectValue}
                  onValueChange={setSelectValue}
                  options={selectOptions}
                />
                <Select
                  size="small"
                  value={selectValue}
                  onValueChange={setSelectValue}
                  options={selectOptions}
                  leftIcon={<SearchIcon />}
                  placeholder="Search theme"
                />
                <Select
                  size="small"
                  value={selectValue}
                  onValueChange={setSelectValue}
                  options={selectOptions}
                  disabled
                  icon={<SettingsIcon fontSize="small" />}
                />
              </div>
              <p className="text-xs text-(--text-grey)">Current value: {selectValue}</p>
            </div>
          </Section>

          <Section title="Buttons & Dropdown" description="Button variants and the dropdown built on the same trigger.">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="primary"><AlbumIcon />Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex items-center gap-3">
              <Dropdown
                buttonAriaLabel="User menu"
                triggerContent={<><PersonIcon className="h-5 w-5" />Menu</>}
                options={dropdownOptions}
                dropdownPlacement="bottom-left"
              />
              <Dropdown
                buttonAriaLabel="Icon only dropdown"
                triggerContent={<SettingsIcon className="h-5 w-5" />}
                options={dropdownOptions}
                dropdownPlacement="bottom-left"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Popover</Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-(--text)">Popover content</p>
                    <p className="text-sm text-(--text-grey)">
                      Use this for quick tips or ancillary actions anchored to a trigger.
                    </p>
                    <div className="flex gap-2">
                      <PopoverClose asChild>
                        <Button size="small" variant="primary">Confirm</Button>
                      </PopoverClose>
                      <PopoverClose asChild>
                        <Button size="small" variant="ghost">Dismiss</Button>
                      </PopoverClose>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </Section>

          <Section title="Dialog" description="Overlay, portal, and content styling from Radix primitives.">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>This action cannot be undone. This will permanently delete the item.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                  <DialogClose asChild><Button variant="destructive">Delete</Button></DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <Section title="Toasts" description="Sonner-powered notifications that follow the current theme.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => toast("Playback started", { description: "You can move or mute this later." })}>Show toast</Button>
                <Button variant="primary" onClick={() => toast.success("Playlist synced", { description: "All tracks are ready to go." })}>Success</Button>
                <Button variant="destructive" onClick={() => toast.error("Connection lost", { description: "We will retry shortly." })}>Error</Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-(--text-grey)">Toast position (persisted for future settings)</p>
                <Select
                  size="small"
                  value={toastPosition}
                  onValueChange={(value) => setToastPosition(value as ToastPosition)}
                  options={toastPositionOptions}
                  fullWidth
                />
              </div>
            </div>
          </Section>

          <Section title="Spinners" description="Loading indicators at different sizes.">
            <div className="flex flex-wrap items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
              <Spinner showLabel label="Loading data..." />
            </div>
          </Section>

          <Section title="Context Menu" description="Right-click the area to open the menu with nested items.">
            <ContextMenu>
              <ContextMenuTrigger>
                <div className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed border-(--surface2) bg-(--surface0) text-sm text-(--text-grey)">
                  Right click here
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => alert("Profile selected")}>Profile</ContextMenuItem>
                <ContextMenuItem onSelect={() => alert("Billing selected")}>Billing</ContextMenuItem>
                <ContextMenuItem onSelect={() => alert("Team selected")}>Team</ContextMenuItem>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem onSelect={() => alert("Email shared")}>Email</ContextMenuItem>
                    <ContextMenuItem onSelect={() => alert("Messages shared")}>Messages</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => alert("More options...")}>More...</ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => alert("Logout")}>
                  <SettingsIcon />
                  <span>Logout</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcasePage;
