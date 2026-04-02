import { useEffect, useMemo } from "react";
import { resolveProfileBands, resolveProfilePreamp, useEqStore } from "../store/eqStore";
import { usePlaybackStore } from "../store/playbackStore";

export const useEqPlaybackSync = (): void => {
  const eqEnabled = useEqStore((state) => state.eqEnabled);
  const profiles = useEqStore((state) => state.profiles);
  const activeProfileId = useEqStore((state) => state.activeProfileId);
  const setEq = usePlaybackStore((state) => state.setEq);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId),
    [activeProfileId, profiles],
  );

  useEffect(() => {
    if (!eqEnabled || !activeProfile) {
      setEq({ bands: [], preampDb: 0 });
      return;
    }

    const activeBands = resolveProfileBands(activeProfile)
      .filter((band) => band.enabled)
      .map((band) => ({
        frequency: band.freq,
        q: band.q,
        gain: band.gain,
        type: band.type,
      }));

    setEq({
      bands: activeBands,
      preampDb: resolveProfilePreamp(activeProfile),
    });
  }, [activeProfile, eqEnabled, setEq]);
};

export default useEqPlaybackSync;
