import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApi } from './green-api';
const credentials = {
  apiUrl: 'https://3100.api.green-api.com/',
  idInstance: '123',
  apiTokenInstance: 'test-token',
};
const signal = new AbortController().signal;
function respond(value: unknown, status = 200) {
  const mock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(value), { status }));
  vi.stubGlobal('fetch', mock);
  return mock;
}
afterEach(() => vi.unstubAllGlobals());
describe('GREEN-API contract', () => {
  it('checks state', async () => {
    respond({ stateInstance: 'authorized' });
    expect(await createApi(credentials).state(signal)).toBe('authorized');
  });
  it('resolves MAX ID from a phone', async () => {
    const fetch = respond({ exist: true, chatId: '42' });
    expect(await createApi(credentials).contact('79991234567', signal)).toBe(
      '42',
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/checkAccount/test-token'),
      expect.objectContaining({
        body: '{"phoneNumber":79991234567}',
        method: 'POST',
      }),
    );
  });
  it.each([{ exist: false }, { exist: true, chatId: '' }, { status: false }])(
    'handles unknown contact %j',
    async (value) => {
      respond(value);
      await expect(
        createApi(credentials).contact('79991234567', signal),
      ).rejects.toThrow();
    },
  );
  it('sends text to resolved ID', async () => {
    const fetch = respond({ idMessage: 'abc' });
    expect(await createApi(credentials).send('42', 'Hello', signal)).toBe(
      'abc',
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://3100.api.green-api.com/waInstance123/sendMessage/test-token',
      expect.objectContaining({
        body: '{"chatId":"42","message":"Hello"}',
        credentials: 'omit',
        redirect: 'error',
      }),
    );
  });
  it('receives and acknowledges', async () => {
    respond({ receiptId: 12, body: {} });
    expect(await createApi(credentials).receive(signal)).toEqual({
      receiptId: 12,
      body: {},
    });
    const fetch = respond({ result: true });
    await createApi(credentials).acknowledge(12, signal);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/deleteNotification/test-token/12'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  it('accepts empty queue, rejects malformed envelope and failed ack', async () => {
    respond(null);
    expect(await createApi(credentials).receive(signal)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    expect(await createApi(credentials).receive(signal)).toBeNull();
    respond({ body: {} });
    await expect(createApi(credentials).receive(signal)).rejects.toThrow();
    respond({ result: false });
    await expect(createApi(credentials).acknowledge(1, signal)).rejects.toThrow(
      'подтвердить',
    );
  });
  it.each([401, 403, 429, 469, 500])('sanitizes HTTP %s', async (status) => {
    respond({ secret: 'private' }, status);
    await expect(createApi(credentials).state(signal)).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(new ApiError(status).message).not.toContain('private');
  });
  it('sanitizes network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret URL')));
    await expect(createApi(credentials).state(signal)).rejects.toThrow(
      'Нет ответа',
    );
  });
  it('preserves cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error()));
    await expect(
      createApi(credentials).state(controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('rejects non-JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>oops</html>')),
    );
    await expect(createApi(credentials).state(signal)).rejects.toThrow(
      'некорректный',
    );
  });
});
