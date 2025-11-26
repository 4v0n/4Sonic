import { PlayArrowIcon, QueueMusicRoundedIcon, RepeatIcon, ShuffleIcon, SkipNextIcon, SkipPreviousIcon, VolumeUpIcon } from "../../constants/icons";
import Button from "../ui/Button";
import { useRightSidebarStore } from "../../store/rightSidebarStore";

const BottomBar = () => {
  const toggleQueue = useRightSidebarStore((state) => state.toggle);

  return (
    <footer className="sticky bottom-0 z-30 h-24 p-4 flex items-center justify-between border-t border-(--surface1) bg-(--surface0) shadow">
      <div className="flex items-center w-1/3">
        Cover
        <div className="ml-3">
          <p className="text-sm font-medium truncate">SongTitle</p>
          <p className="text-sm truncate">SongArtist</p>
        </div>
      </div>

      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center space-x-4 mb-2">
          <Button icon={<ShuffleIcon fontSize="small" />} className="shadow-none" />
          <Button icon={<SkipPreviousIcon fontSize="small" />} className="shadow-none" />
          <Button
            size="large"
            className="bg-(--text) hover:bg-(--primary2) shadow-none"
            icon={<PlayArrowIcon fontSize="small" className="text-(--text-inverted)" />}
          />
          <Button icon={<SkipNextIcon fontSize="small" />} className="shadow-none" />
          <Button icon={<RepeatIcon fontSize="small" />} className="shadow-none" />
        </div>
        <div className="flex items-center w-full max-w-md space-x-2">
          <span className="text-xs tabular-nums">
            7:27
          </span>
          <div className="flex-grow h-1 rounded-full cursor-pointer group">
            <div
              className="h-1 rounded-full bg-black transition-colors"
              style={{ width: 100 }}
            />
          </div>
          <span className="text-xs tabular-nums">7:27</span>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 w-1/3">
        <Button
          icon={<QueueMusicRoundedIcon />}
          className="shadow-none"
          onClick={() => toggleQueue("queue")}
          aria-label="Toggle queue sidebar"
        />
        <Button icon={<VolumeUpIcon />} className="shadow-none" />
      </div>
    </footer>
  );
};

export default BottomBar;
