import React from "react";
import cn from "../../utils/cn";
import LazyImage from "./LazyImage";

export const CoverFallback = ({ rounded, className }: { rounded?: boolean; className?: string }) => (
  <div
    className={cn(
      "h-full w-full bg-gradient-to-br from-(--surface-tonal1) via-(--surface-tonal2) to-(--surface-tonal3)",
      rounded ? "rounded-lg" : "",
      className,
    )}
  />
);

type CoverImageProps = React.ComponentProps<typeof LazyImage> & {
  rounded?: boolean;
};

const CoverImage: React.FC<CoverImageProps> = ({
  src,
  alt = "",
  rounded = false,
  className,
  imgClassName,
  placeholder,
  fallback,
  ...rest
}) => {
  const resolvedPlaceholder = placeholder ?? <CoverFallback rounded={rounded} />;
  const resolvedFallback = fallback ?? <CoverFallback rounded={rounded} />;

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn("relative h-full w-full overflow-hidden", rounded ? "rounded-lg" : "", className)}
      imgClassName={imgClassName}
      placeholder={resolvedPlaceholder}
      fallback={resolvedFallback}
      {...rest}
    />
  );
};

export default React.memo(CoverImage);
