import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cn from "../../utils/cn";
import { imageCache } from "../../services/image/imageCache";

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
  const cleanupRef = useRef<(() => void) | null>(null);
  const cacheRetryRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>();

  const shouldEagerLoad = useMemo(() => (src ? loadedImages.has(src) : false), [src]);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setResolvedSrc(undefined);
    setIsVisible(Boolean(src) && shouldEagerLoad);
    cacheRetryRef.current = false;
    cleanupRef.current?.();
    cleanupRef.current = null;
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

  useEffect(() => {
    if (!isVisible || !src) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const source = await imageCache.getImageSource(src);
        if (cancelled) {
          source.cleanup?.();
          return;
        }

        cleanupRef.current?.();
        cleanupRef.current = source.cleanup ?? null;
        setResolvedSrc(source.url);
        source.cachePromise?.catch(() => undefined);
      } catch {
        if (!cancelled) {
          setResolvedSrc(src);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVisible, src]);

  useEffect(() => () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const handleLoad = useCallback(() => {
    if (src) {
      loadedImages.add(src);
    }
    setIsLoaded(true);
    setHasError(false);
  }, [src]);

  const handleError = useCallback(() => {
    if (src && resolvedSrc && resolvedSrc !== src && !cacheRetryRef.current) {
      cacheRetryRef.current = true;
      setIsLoaded(false);
      setHasError(false);
      setResolvedSrc(src);
      void imageCache.invalidate(src);
      return;
    }
    setHasError(true);
  }, [resolvedSrc, src]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      {isVisible && resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
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
