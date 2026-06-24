import { useEffect, useState } from "react";

export type CatalogEntry = {
  id: string;
  label: string;
  file: string;
};

type Manifest = {
  targets: CatalogEntry[];
  responses: CatalogEntry[];
};

type Catalog = {
  targets: CatalogEntry[];
  responses: CatalogEntry[];
  loading: boolean;
};

let cached: Manifest | null = null;
let pending: Promise<Manifest> | null = null;

const fetchManifest = (): Promise<Manifest> => {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch("/measurements/manifest.json")
      .then((r) => r.json() as Promise<Manifest>)
      .then((data) => {
        cached = data;
        return data;
      })
      .catch((): Manifest => ({ targets: [], responses: [] }));
  }
  return pending as Promise<Manifest>;
};

export const useMeasurementCatalog = (): Catalog => {
  const [catalog, setCatalog] = useState<Manifest>({ targets: [], responses: [] });
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) {
      setCatalog(cached);
      setLoading(false);
      return;
    }
    fetchManifest().then((data) => {
      setCatalog(data);
      setLoading(false);
    });
  }, []);

  return { ...catalog, loading };
};

export const fetchMeasurementFile = async (
  category: "targets" | "responses",
  file: string,
): Promise<string> => {
  const res = await fetch(`/measurements/${category}/${file}`);
  if (!res.ok) throw new Error(`Failed to fetch ${file}: ${res.status}`);
  return res.text();
};
