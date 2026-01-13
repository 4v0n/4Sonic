import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type WasapiDevice = {
  id: string;
  name: string;
  is_default: boolean;
};

type SinkableElement = HTMLMediaElement & { setSinkId?: (sinkId: string) => Promise<void> };

export type AudioOutputOption = {
  id: string;
  label: string;
  sinkId: string | null;
  isDefault?: boolean;
};

const isWindowsEnvironment = () => typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);

const canSelectSink = (): boolean => {
  if (typeof document === "undefined") return false;
  const el = document.createElement("audio") as SinkableElement;
  return typeof el.setSinkId === "function";
};

const getMediaOutputMap = async () => {
  const map = new Map<string, { sinkId: string; label: string }>();
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return map;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices
      .filter((device) => device.kind === "audiooutput")
      .forEach((device, index) => {
        const label = device.label || `Audio output ${index + 1}`;
        map.set(label.toLowerCase(), { sinkId: device.deviceId, label });
      });
  } catch (error) {
    console.debug("Unable to enumerate media devices", error);
  }
  return map;
};

export const useWindowsAudioDevices = () => {
  const [isWindows, setIsWindows] = useState(isWindowsEnvironment());
  const [devices, setDevices] = useState<AudioOutputOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const windows = isWindowsEnvironment();
    setIsWindows(windows);
    if (!windows) {
      setDevices([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const sinkMap = await getMediaOutputMap();
      let wasapiDevices: WasapiDevice[] = [];

      try {
        wasapiDevices = await invoke<WasapiDevice[]>("list_audio_outputs");
      } catch (invokeError) {
        console.debug("WASAPI device listing failed; falling back to media devices", invokeError);
      }

      const findSinkForName = (name: string) => {
        const lowered = name.toLowerCase();
        return Array.from(sinkMap.values()).find((entry) => {
          const entryName = entry.label.toLowerCase();
          return entryName === lowered || entryName.includes(lowered) || lowered.includes(entryName);
        });
      };

      let mapped: AudioOutputOption[] = wasapiDevices.map((device, index) => {
        const sink = findSinkForName(device.name);
        return {
          id: device.id || `wasapi-${index}`,
          label: `${device.name}${device.is_default ? " (default)" : ""}`,
          sinkId: sink?.sinkId ?? null,
          isDefault: device.is_default,
        };
      });

      if (!mapped.length && sinkMap.size > 0) {
        mapped = Array.from(sinkMap.values()).map((entry, index) => ({
          id: entry.sinkId || `sink-${index}`,
          label: entry.label || `Audio output ${index + 1}`,
          sinkId: entry.sinkId,
          isDefault: index === 0,
        }));
      }

      setDevices(mapped);
      if (!mapped.length) {
        setError("No audio outputs detected on Windows.");
      }
    } catch (unknown) {
      setError(unknown instanceof Error ? unknown.message : "Unable to list audio outputs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const supportsSinkSelection = useMemo(() => canSelectSink(), []);

  return {
    isWindows,
    devices,
    loading,
    error,
    refresh,
    supportsSinkSelection,
  };
};
