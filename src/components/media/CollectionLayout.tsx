import React from "react";
import cn from "../../utils/cn";
import { hsla, type HslColor } from "../../utils/imageColor";
import CoverImage from "../ui/CoverImage";

export interface CollectionLayoutProps {
  title: string;
  meta?: React.ReactNode;
  coverUrl?: string;
  accentColor?: HslColor;
  actionBar?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const CollectionLayout = ({
  title,
  meta,
  coverUrl,
  accentColor,
  actionBar,
  aside,
  children,
  className,
}: CollectionLayoutProps) => (
  <div className={cn("@container relative isolate", className)}>
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-4 -top-4 -z-10 h-96 transition-[background] duration-500 sm:-inset-x-6 sm:-top-6"
      style={{
        background: accentColor
          ? `linear-gradient(to bottom, ${hsla(accentColor, 0.28)}, transparent)`
          : undefined,
      }}
    />

    <div className="grid gap-x-10 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex items-end gap-5">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-md shadow-lg @md:h-40 @md:w-40 @4xl:hidden">
            <CoverImage src={coverUrl} alt={title} className="h-full w-full" />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="break-words text-3xl font-extrabold leading-tight text-text @2xl:text-5xl">{title}</h1>
            {meta ? <div className="text-sm text-text-grey">{meta}</div> : null}
          </div>
        </header>

        {actionBar}
        {children}
      </div>

      <aside className="flex min-w-0 flex-col gap-6 @4xl:sticky @4xl:top-0 @4xl:self-start">
        <div className="hidden aspect-square w-full overflow-hidden rounded-lg bg-surface0 shadow-lg @4xl:block">
          <CoverImage src={coverUrl} alt={title} className="h-full w-full" />
        </div>
        {aside}
      </aside>
    </div>
  </div>
);

export const MetaList = ({ items }: { items: React.ReactNode[] }) => {
  const visible = items.filter((item) => item !== null && item !== undefined && item !== false && item !== "");
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {visible.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <span aria-hidden>•</span> : null}
          <span className="flex items-center gap-1">{item}</span>
        </React.Fragment>
      ))}
    </p>
  );
};

export default CollectionLayout;
