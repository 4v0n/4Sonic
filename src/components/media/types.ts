export interface MediaActions {
  onPlay?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
}

export const hasMediaActions = (actions?: MediaActions): actions is MediaActions =>
  Boolean(actions?.onPlay || actions?.onPlayNext || actions?.onAddToQueue);
