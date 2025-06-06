import { PlayArrowIcon, QueueMusicRoundedIcon, RepeatIcon, ShuffleIcon, SkipNextIcon, SkipPreviousIcon, VolumeUpIcon } from "../../constants/icons";
import IconButton from "../ui/IconButton";

const BottomBar = () => {
  return (
    <footer className="h-24 p-4 flex items-center justify-between border-t">
      <div className="flex items-center w-1/3">
        Cover
        <div className="ml-3">
          <p className="text-sm font-medium truncate">SongTitle</p>
          <p className="text-sm truncate">SongArtist</p>
        </div>
      </div>

      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center space-x-4 mb-2">
          <IconButton>
            <ShuffleIcon fontSize="small" />
          </IconButton>
          <IconButton>
            <SkipPreviousIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="large"
            className="bg-(--text) hover:bg-(--primary2)"
          >
            <PlayArrowIcon fontSize="small" className="text-(--text-inverted)" />
          </IconButton>
          <IconButton>
            <SkipNextIcon fontSize="small" />
          </IconButton>
          <IconButton>
            <RepeatIcon fontSize="small" />
          </IconButton>
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
        <IconButton>
          <QueueMusicRoundedIcon />
        </IconButton>
        <IconButton>
          <VolumeUpIcon />
        </IconButton>
      </div>
    </footer>
  );
};

export default BottomBar;