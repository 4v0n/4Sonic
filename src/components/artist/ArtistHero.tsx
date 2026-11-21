import React from "react";
import { PersonIcon } from "../../constants/icons";
import cn from "../../utils/cn";
import { hsla, type HslColor } from "../../utils/imageColor";
import CoverImage from "../ui/CoverImage";
import MediaActionButtons from "../media/MediaActionButtons";

export interface ArtistHeroProps {
  name: string;
  imageUrl?: string;
  bannerUrl?: string;
  color?: HslColor;
  meta?: React.ReactNode;
  onPlay?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
}

const avatarFallback = (
  <div className="flex h-full w-full items-center justify-center bg-surface3 text-text-grey [&>svg]:h-1/2 [&>svg]:w-1/2">
    <PersonIcon />
  </div>
);

const HeroBackground = ({ bannerUrl, color }: Pick<ArtistHeroProps, "bannerUrl" | "color">) => {
  const solid = (
    <div
      className={cn("h-full w-full transition-[background-color] duration-500", !color && "bg-surface2")}
      style={color ? { backgroundColor: hsla(color, 0.35) } : undefined}
    />
  );

  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      {bannerUrl ? (
        <CoverImage
          src={bannerUrl}
          alt=""
          className="h-full w-full"
          imgClassName="object-cover object-[center_25%]"
          placeholder={solid}
          fallback={solid}
        />
      ) : solid}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface0/80" />
    </div>
  );
};

const ArtistHero = ({ name, imageUrl, bannerUrl, color, meta, onPlay, onPlayNext, onAddToQueue }: ArtistHeroProps) => (
  <header className="relative isolate">
    <HeroBackground bannerUrl={bannerUrl} color={color} />

    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5 px-4 pb-6 pt-10 sm:px-9 @2xl:pt-14">
      <div className="flex min-w-0 items-end gap-6">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg shadow-xl @2xl:h-44 @2xl:w-44">
          <CoverImage
            src={imageUrl}
            alt={name}
            className="h-full w-full"
            placeholder={avatarFallback}
            fallback={avatarFallback}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3 pb-2">
          <h1 className="break-words text-4xl font-black leading-none text-text @2xl:text-6xl">{name}</h1>
          {meta ? <div className="text-sm font-medium text-text">{meta}</div> : null}
        </div>
      </div>

      <MediaActionButtons
        title={name}
        onPlay={onPlay}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        size="large"
        className="pb-2"
      />
    </div>
  </header>
);

export default ArtistHero;
