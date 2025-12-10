import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cn from "../../utils/cn";

const loadedImages = new Set<string>();

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "className"> {
  className?: string;
  imgClassName?: string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = "",
  className,
  imgClassName,
  placeholder,
  fallback,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const shouldEagerLoad = useMemo(() => (src ? loadedImages.has(src) : false), [src]);

  useEffect(() => {
    setIsLoaded(shouldEagerLoad);
    setHasError(false);
  }, [shouldEagerLoad, src]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !src || shouldEagerLoad) {
      setIsVisible(Boolean(src));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldEagerLoad, src]);

  const handleLoad = useCallback(() => {
    if (src) {
      loadedImages.add(src);
    }
    setIsLoaded(true);
    setHasError(false);
  }, [src]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      {isVisible && src && !hasError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn("h-full w-full object-cover", imgClassName)}
          {...props}
        />
      ) : null}
      {!isLoaded && !hasError ? (
        <div className="absolute inset-0">
          {placeholder ?? <div className="h-full w-full bg-(--surface2)" />}
        </div>
      ) : null}
      {hasError && fallback ? (
        <div className="absolute inset-0">
          {fallback}
        </div>
      ) : null}
    </div>
  );
};

export default LazyImage;
