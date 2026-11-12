export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const formatTotalDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${Math.max(1, minutes)} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
};
