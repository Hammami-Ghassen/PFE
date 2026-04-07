import { runRefreshQueue } from './axiosRetryQueue';

describe('runRefreshQueue', () => {
  it('deduplicates concurrent refresh calls', async () => {
    let callCount = 0;
    const refreshAction = jest.fn(async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'new-token';
    });

    const [a, b] = await Promise.all([
      runRefreshQueue(refreshAction),
      runRefreshQueue(refreshAction),
    ]);

    expect(a).toBe('new-token');
    expect(b).toBe('new-token');
    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(callCount).toBe(1);
  });

  it('clears queue state after failure so next attempt can run', async () => {
    const failing = jest.fn(async () => {
      throw new Error('refresh failed');
    });

    await expect(runRefreshQueue(failing)).rejects.toThrow('refresh failed');
    await expect(runRefreshQueue(failing)).rejects.toThrow('refresh failed');

    expect(failing).toHaveBeenCalledTimes(2);
  });
});
