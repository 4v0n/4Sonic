import { useEffect, useRef, useState } from "react";
import { CloseIcon, PauseIcon, PlayArrowIcon, QueueMusicRoundedIcon, RepeatIcon, RepeatOneIcon, ShuffleIcon, SkipNextIcon, SkipPreviousIcon, VolumeDownIcon, VolumeMuteIcon, VolumeOffIcon, VolumeUpIcon } from "../../constants/icons";
import Button from "../ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover";
import { useRightSidebarStore } from "../../store/rightSidebarStore";
import { RightSidebarContent } from "./RightSideBar";
import { usePlaybackStore } from "../../store/playbackStore";
import { useUiPreferencesStore } from "../../store/uiPreferencesStore";
import BackgroundAreaVisualizer from "../visualizer/BackgroundAreaVisualizer";
import useAudioVisualizerData from "../../hooks/useAudioVisualizerData";
import { formatTime } from "../../utils/time";

type BottomBarProps = { isRightCompact?: boolean };

interface ProgressSliderProps {
  position: number;
  duration: number;
  disabled?: boolean;
  onScrubStart: () => void;
  onScrub: (time: number) => void;
  onScrubEnd: (time: number) => void;
}

const ProgressSlider = ({ position, duration, disabled, onScrubStart, onScrub, onScrubEnd }: ProgressSliderProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const getTimeFromClientX = (clientX: number): number => {
    if (!barRef.current || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return ratio * duration;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button === 2) return;
    const nextTime = getTimeFromClientX(event.clientX);
    draggingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    setIsDragging(true);
    onScrubStart();
    onScrub(nextTime);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  useEffect(() => {
    if (!isDragging) return;

    const endScrub = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const nextTime = getTimeFromClientX(event.clientX);
      onScrubEnd(nextTime);
      setIsDragging(false);
      if (activePointerIdRef.current !== null && barRef.current?.hasPointerCapture(activePointerIdRef.current)) {
        barRef.current.releasePointerCapture(activePointerIdRef.current);
      }
      activePointerIdRef.current = null;
    };

    const handleMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      if (event.buttons === 0) {
        endScrub(event);
        return;
      }
      const nextTime = getTimeFromClientX(event.clientX);
      onScrub(nextTime);
    };
    const handleUp = (event: PointerEvent) => {
      endScrub(event);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDragging, onScrub, onScrubEnd, duration]);

  const progressRatio = duration > 0 ? Math.min(position, duration) / duration : 0;

  return (
    <div className="flex items-center w-full max-w-md space-x-2">
      <span className="text-xs tabular-nums text-(--text-grey)">
        {formatTime(position)}
      </span>
      <div
        ref={barRef}
        className={`relative flex-grow h-2 rounded-full cursor-pointer bg-(--surface2) transition ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-(--surface3)"}`}
        onPointerDown={handlePointerDown}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={position}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-(--primary0)"
          style={{ width: `${progressRatio * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 translate-x-[-6px] rounded-full bg-white shadow transition"
          style={{ left: `${progressRatio * 100}%`, opacity: disabled ? 0 : 1 }}
        />
      </div>
      <span className="text-xs tabular-nums text-(--text-grey)">{formatTime(duration)}</span>
    </div>
  );
};

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onChange: (value: number) => void;
  onToggleMute: () => void;
  onScroll: (delta: number) => void;
}

const VolumeControl = ({ volume, isMuted, onChange, onToggleMute, onScroll }: VolumeControlProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverPopup, setIsOverPopup] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const effectiveVolume = isMuted ? 0 : volume;

  const selectIcon = () => {
    if (effectiveVolume === 0 || isMuted) return <VolumeOffIcon />;
    if (effectiveVolume < 0.33) return <VolumeMuteIcon />;
    if (effectiveVolume < 0.66) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  const getVolumeFromY = (clientY: number): number => {
    if (!sliderRef.current) return effectiveVolume;
    const rect = sliderRef.current.getBoundingClientRect();
    const ratio = 1 - Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    return ratio;
  };

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const requestHide = () => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      if (!isDragging && !isOverPopup) {
        setIsHovering(false);
      }
    }, 200);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const next = getVolumeFromY(event.clientY);
    onChange(next);
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (event: PointerEvent) => {
      const next = getVolumeFromY(event.clientY);
      onChange(next);
    };
    const handleUp = () => {
      setIsDragging(false);
      setIsOverPopup(false);
      setIsHovering(false);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, onChange, getVolumeFromY]);

  useEffect(() => () => clearHideTimeout(), []);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => {
        clearHideTimeout();
        setIsHovering(true);
      }}
      onMouseLeave={() => {
        setIsOverPopup(false);
        requestHide();
      }}
      onWheel={(event) => {
        const step = event.deltaY < 0 ? 0.05 : -0.05;
        onScroll(step);
      }}
    >
      <Button className="shadow-none" aria-label="Toggle mute" onClick={onToggleMute}>
        {selectIcon()}
      </Button>
      <div
        className={`absolute bottom-12 right-0 origin-bottom transition-all duration-150 ${
          isHovering || isDragging || isOverPopup ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
        }`}
        onMouseEnter={() => {
          clearHideTimeout();
          setIsOverPopup(true);
          setIsHovering(true);
        }}
        onMouseLeave={() => {
          setIsOverPopup(false);
          requestHide();
        }}
      >
        <div className="flex h-28 w-10 items-center justify-center rounded-lg border border-(--surface2) bg-(--surface1) p-2 shadow-lg">
          <div
            ref={sliderRef}
            className="relative h-full w-2 cursor-pointer rounded-full bg-(--surface2)"
            onPointerDown={handlePointerDown}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-(--primary0)"
              style={{ height: `${effectiveVolume * 100}%` }}
            />
            <div
              className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-(--surface3) bg-white shadow"
              style={{ bottom: `${effectiveVolume * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const BottomBar = ({ isRightCompact = false }: BottomBarProps) => {
  const toggleQueue = useRightSidebarStore((state) => state.toggle);
  const openQueue = useRightSidebarStore((state) => state.open);
  const closeQueue = useRightSidebarStore((state) => state.close);
  const isQueueOpen = useRightSidebarStore((state) => state.isOpen);
  const rightView = useRightSidebarStore((state) => state.view);

  const currentSong = usePlaybackStore((state) => state.currentSong);
  const coverArtUrl = usePlaybackStore((state) => state.coverArtUrl);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const isLoading = usePlaybackStore((state) => state.isLoading);
  const position = usePlaybackStore((state) => state.position);
  const duration = usePlaybackStore((state) => state.duration);
  const shuffle = usePlaybackStore((state) => state.shuffle);
  const repeat = usePlaybackStore((state) => state.repeat);
  const isScrubbing = usePlaybackStore((state) => state.isScrubbing);
  const volume = usePlaybackStore((state) => state.volume);
  const isMuted = usePlaybackStore((state) => state.isMuted);
  const visualizerColor = useUiPreferencesStore((state) => state.visualizerColor);
  const visualizerOpacity = useUiPreferencesStore((state) => state.visualizerOpacity);
  const visualizerBlur = useUiPreferencesStore((state) => state.visualizerBlur);
  const visualizerHeight = useUiPreferencesStore((state) => state.visualizerHeight);
  const visualizerData = useAudioVisualizerData();

  const togglePlayPause = usePlaybackStore((state) => state.togglePlayPause);
  const seek = usePlaybackStore((state) => state.seek);
  const beginScrub = usePlaybackStore((state) => state.beginScrub);
  const endScrub = usePlaybackStore((state) => state.endScrub);
  const toggleShuffle = usePlaybackStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlaybackStore((state) => state.cycleRepeat);
  const setVolume = usePlaybackStore((state) => state.setVolume);
  const changeVolumeBy = usePlaybackStore((state) => state.changeVolumeBy);
  const toggleMute = usePlaybackStore((state) => state.toggleMute);
  const playNext = usePlaybackStore((state) => state.playNext);
  const playPrevious = usePlaybackStore((state) => state.playPrevious);

  const samplingRate = currentSong?.samplingRate;
  const bitDepth = currentSong?.bitDepth;
  const qualityFormat = currentSong?.suffix ? currentSong.suffix.toUpperCase() : undefined;
  const formattedSampleRate = samplingRate
    ? (() => {
      const khz = samplingRate / 1000;
      const decimals = Number.isInteger(khz) ? 0 : 1;
      return `${khz.toFixed(decimals)} kHz`;
    })()
    : undefined;
  const qualityText = [qualityFormat, formattedSampleRate, bitDepth ? `${bitDepth}-bit` : null]
    .filter(Boolean)
    .join(" • ");

  const queueButton = (
    <Button
      className={`shadow-none ${isQueueOpen ? "bg-(--surface2)" : ""}`}
      onClick={isRightCompact ? undefined : () => toggleQueue("queue")}
      aria-label="Toggle queue sidebar"
    >
      <QueueMusicRoundedIcon />
    </Button>
  );

  const playbackReady = Boolean(currentSong);
  const scrubDisabled = !playbackReady || duration <= 0;

  const handlePrevious = () => {
    if (!playbackReady) return;
    const restartThresholdSeconds = 3;
    if (position > restartThresholdSeconds) {
      seek(0);
      return;
    }
    void playPrevious();
  };

  const handleNext = () => {
    if (!playbackReady) return;
    void playNext();
  };

  const effectiveVolume = isMuted ? 0 : volume;
  const visualizerHeightPercent = Math.min(1, Math.max(0, visualizerHeight * effectiveVolume));

  return (
    <footer className="sticky bottom-0 z-30 h-24 p-4 border-t border-(--surface1) bg-(--surface0) shadow">
      <div
        className="pointer-events-none absolute left-0 right-0 bottom-0 z-0 overflow-visible"
        style={{ height: `${visualizerHeightPercent * 100}%` }}
      >
        <BackgroundAreaVisualizer frequencyData={visualizerData} color={visualizerColor} opacity={visualizerOpacity} blur={visualizerBlur} />
      </div>
      <div className="relative z-10 flex h-full w-full items-center justify-between">
        <div className="flex items-center w-1/3 min-w-0 gap-3">
          <div className="h-18 w-18 overflow-hidden rounded-lg border border-(--surface2) bg-(--surface1)">
            {coverArtUrl ? (
              <img src={coverArtUrl} alt={currentSong?.title ?? "Cover"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-(--surface2)" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{currentSong?.title ?? "Nothing playing"}</p>
            <p className="text-xs text-(--text-grey) truncate">
              {currentSong?.artist ?? "Select a song to start"}
            </p>
            {qualityText ? (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[11px] text-(--text-grey) truncate">{qualityText}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-center w-1/3">
          <div className="flex items-center space-x-3 mb-2">
            <Button
              className={`shadow-none ${shuffle ? "bg-(--surface2)" : ""}`}
              aria-label="Toggle shuffle"
              onClick={() => toggleShuffle()}
              disabled={!currentSong}
            >
              <ShuffleIcon fontSize="small" />
            </Button>
            <Button className="shadow-none" disabled={!playbackReady} onClick={handlePrevious}>
              <SkipPreviousIcon fontSize="small" />
            </Button>
            <Button
              size="large"
              className="bg-(--text) hover:bg-(--primary2) shadow-none"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => void togglePlayPause()}
              disabled={!currentSong || isLoading}
            >
              {isPlaying && !isScrubbing ? (
                <PauseIcon fontSize="small" className="text-(--text-inverted)" />
              ) : (
                <PlayArrowIcon fontSize="small" className="text-(--text-inverted)" />
              )}
            </Button>
            <Button className="shadow-none" disabled={!playbackReady} onClick={handleNext}>
              <SkipNextIcon fontSize="small" />
            </Button>
            <Button
              className={`shadow-none ${repeat !== "off" ? "bg-(--surface2)" : ""}`}
              aria-label="Toggle repeat"
              onClick={() => cycleRepeat()}
              disabled={!currentSong}
            >
              {repeat === "one" ? <RepeatOneIcon fontSize="small" /> : <RepeatIcon fontSize="small" />}
            </Button>
          </div>
          <ProgressSlider
            position={position}
            duration={duration}
            disabled={scrubDisabled}
            onScrubStart={() => beginScrub()}
            onScrub={(time) => seek(time)}
            onScrubEnd={(time) => endScrub(time)}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 w-1/3">
          {isRightCompact ? (
            <Popover
              open={isQueueOpen}
              onOpenChange={(open) => {
                if (open) {
                  openQueue("queue");
                } else {
                  closeQueue();
                }
              }}
            >
              <PopoverTrigger asChild>{queueButton}</PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                sideOffset={12}
                className="w-[340px] max-h-[70vh] overflow-auto"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-(--surface2) mb-3">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <QueueMusicRoundedIcon fontSize="small" />
                    <span className="capitalize">{rightView}</span>
                  </div>
                  <Button variant="ghost" size="small" className="shadow-none" onClick={closeQueue} aria-label="Close queue popover">
                    <CloseIcon fontSize="small" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <RightSidebarContent view={rightView} />
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            queueButton
          )}
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onChange={(value) => setVolume(value)}
            onToggleMute={toggleMute}
            onScroll={(delta) => changeVolumeBy(delta)}
          />
        </div>
      </div>
    </footer>
  );
};

export default BottomBar;
