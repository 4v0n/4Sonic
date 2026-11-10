import { useEffect, useState } from "react";
import { getImageAccentColor, HslColor, peekImageAccentColor } from "../utils/imageColor";

const useImageAccentColor = (url?: string): HslColor | undefined => {
  const [color, setColor] = useState<HslColor | undefined>(() => (url ? peekImageAccentColor(url) ?? undefined : undefined));

  useEffect(() => {
    if (!url) {
      setColor(undefined);
      return;
    }

    const known = peekImageAccentColor(url);
    if (known !== undefined) {
      setColor(known ?? undefined);
      return;
    }

    setColor(undefined);
    let cancelled = false;
    void getImageAccentColor(url).then((next) => {
      if (!cancelled) setColor(next ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
};

export default useImageAccentColor;
