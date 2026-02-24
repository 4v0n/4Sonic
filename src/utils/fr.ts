export type DataPoint = {
  freq: number;
  spl: number;
};


export const parseFRFile = (text: string): DataPoint[] => {
  const lines = text.split("\n");
  const data: DataPoint[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const freq = Number.parseFloat(parts[0]);
      const spl = Number.parseFloat(parts[1]);
      if (!Number.isNaN(freq) && !Number.isNaN(spl)) {
        data.push({ freq, spl });
      }
    }
  }

  return data.sort((a, b) => a.freq - b.freq);
};

/**
 * Applies a simple moving average smoothing to the data.
 * @param data sorted frequency data
 * @param windowSize number of points to average
 */
export const smoothData = (data: DataPoint[], windowSize: number = 5): DataPoint[] => {
  if (data.length < windowSize) return data;

  const smoothed: DataPoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i += 1) {
    let sum = 0;
    let count = 0;

    for (let j = i - halfWindow; j <= i + halfWindow; j += 1) {
      if (j >= 0 && j < data.length) {
        sum += data[j].spl;
        count += 1;
      }
    }

    smoothed.push({
      freq: data[i].freq,
      spl: sum / count,
    });
  }

  return smoothed;
};
