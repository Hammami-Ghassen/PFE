let refreshPromise = null;

// Keeps a single in-flight refresh request and queues concurrent retries behind it.
export const runRefreshQueue = async (refreshAction) => {
  if (!refreshPromise) {
    refreshPromise = Promise.resolve()
      .then(refreshAction)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};
