export const toErrorMessage = (error: unknown, fallback = "Something went wrong"): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

export const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (typeof error === "object" && "name" in error) {
    return (error as { name?: string }).name === "AbortError";
  }
  return false;
};

export const safeAsync = async <T>(promise: Promise<T>, fallback?: T): Promise<T | undefined> => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};
