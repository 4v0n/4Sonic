import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import cn from "../../utils/cn";
import { imageCache } from "../../services/image/imageCache";
import { useScrollContainer } from "../layout/ScrollContainer";

const loadedImages = new Set<string>();

const failedImages = new Map<string, number>();
const FAILED_RETRY_AFTER_MS = 5 * 60 * 1000;

const hasFailedRecently = (src?: string): boolean => {
  if (!src) return false;
  const failedAt = failedImages.get(src);
  if (failedAt === undefined) return false;
  if (Date.now() - failedAt > FAILED_RETRY_AFTER_MS) {
    failedImages.delete(src);
    return false;
  }
  return true;
};

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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cacheRetryRef = useRef(false);
  const scrollRoot = useScrollContainer();

  const memoryUrl = src ? imageCache.peekObjectUrl(src) : undefined;
  const shouldEagerLoad = Boolean(src) && (memoryUrl !== undefined || loadedImages.has(src as string));

  const [isVisible, setIsVisible] = useState(shouldEagerLoad);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(() => hasFailedRecently(src));
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>();

  const previousSrcRef = useRef(src);
  useEffect(() => {
    if (previousSrcRef.current === src) {
      return;
    }
    previousSrcRef.current = src;
    setIsLoaded(false);
    setHasError(hasFailedRecently(src));
    setResolvedSrc(undefined);
    setIsVisible(Boolean(src) && (loadedImages.has(src as string) || imageCache.peekObjectUrl(src as string) !== undefined));
    cacheRetryRef.current = false;
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, [src]);

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
      { root: scrollRoot, rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollRoot, shouldEagerLoad, src]);

  useEffect(() => {
    if (!isVisible || !src || hasFailedRecently(src)) {
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
    if (src && resolvedSrc !== src && !cacheRetryRef.current) {
      cacheRetryRef.current = true;
      setIsLoaded(false);
      setHasError(false);
      setResolvedSrc(src);
      void imageCache.invalidate(src);
      return;
    }
    if (src) {
      failedImages.set(src, Date.now());
    }
    setHasError(true);
  }, [resolvedSrc, src]);

  const displaySrc = resolvedSrc ?? memoryUrl;
  const showImage = isVisible && Boolean(displaySrc) && !hasError;

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!isLoaded && img && img.complete && img.naturalWidth > 0) {
      handleLoad();
    }
  }, [displaySrc, handleLoad, isLoaded, showImage]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      {showImage ? (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt}
          decoding={memoryUrl !== undefined ? "sync" : "async"}
          onLoad={handleLoad}
          onError={handleError}
          className={cn("h-full w-full object-cover", imgClassName)}
          {...props}
        />
      ) : null}
      {!isLoaded && !hasError ? (
        <div className="absolute inset-0">
          {placeholder ?? <div className="h-full w-full bg-surface2" />}
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
