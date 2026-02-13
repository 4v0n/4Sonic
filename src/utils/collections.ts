export const indexBy = <T, K>(items: T[], keyFn: (item: T) => K): Map<K, T> => {
  const map = new Map<K, T>();
  items.forEach((item) => {
    map.set(keyFn(item), item);
  });
  return map;
};

export const groupBy = <T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> => {
  const map = new Map<K, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  });
  return map;
};

export const uniqueBy = <T, K>(items: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  const result: T[] = [];
  items.forEach((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

export const sortBy = <T>(items: T[], compare: (a: T, b: T) => number): T[] => {
  return [...items].sort(compare);
};

export const sortByKey = <T, K extends string | number>(items: T[], keyFn: (item: T) => K): T[] => {
  return [...items].sort((left, right) => {
    const leftKey = keyFn(left);
    const rightKey = keyFn(right);
    if (leftKey === rightKey) return 0;
    return leftKey > rightKey ? 1 : -1;
  });
};
