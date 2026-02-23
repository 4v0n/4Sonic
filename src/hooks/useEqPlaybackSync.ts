import { useEffect, useMemo } from "react";
import { useEqStore } from "../store/eqStore";
import { usePlaybackStore } from "../store/playbackStore";

export const useEqPlaybackSync = (): void => {
  const profiles = useEqStore((state) => state.profiles);
  const activeProfileId = useEqStore((state) => state.activeProfileId);
  const setEq = usePlaybackStore((state) => state.setEq);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId),
    [activeProfileId, profiles],
  );

  useEffect(() => {
    if (!activeProfile || activeProfile.mode !== "ten-band") {
      setEq([]);
      return;
    }

    const activeBands = activeProfile.bands
      .filter((band) => band.enabled)
      .map((band) => ({
        frequency: band.freq,
        q: band.q,
        gain: band.gain,
        type: "peaking" as BiquadFilterType,
      }));

    setEq(activeBands);
  }, [activeProfile, setEq]);
};

export default useEqPlaybackSync;
