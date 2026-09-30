import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Messenger, delay } from './model';
import { ApiError, type ChatApi, type Notification } from '../../shared/api';
const event = {
  receiptId: 1,
  body: {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'reply',
    timestamp: 100,
    senderData: { chatId: '42' },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: 'Ответ' },
    },
  },
};
function fakeApi() {
  return {
    state: vi.fn<ChatApi['state']>().mockResolvedValue('authorized'),
    contact: vi.fn<ChatApi['contact']>().mockResolvedValue('42'),
    send: vi.fn<ChatApi['send']>().mockResolvedValue('sent-id'),
    receive: vi.fn<ChatApi['receive']>().mockResolvedValue(null),
    acknowledge: vi.fn<ChatApi['acknowledge']>().mockResolvedValue(),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
describe('messaging lifecycle', () => {
  it('creates, reuses, selects and sends', async () => {
    const api = fakeApi();
    const model = new Messenger(api);
    const listener = vi.fn();
    const unsubscribe = model.subscribe(listener);
    await model.createChat('+7 (999) 123-45-67');
    await model.createChat('79991234567');
    expect(api.contact).toHaveBeenCalledTimes(1);
    await model.send(' hello ');
    expect(api.send).toHaveBeenCalledWith(
      '42',
      'hello',
      expect.any(AbortSignal),
    );
    expect(model.getSnapshot().chats[0]?.messages[0]?.status).toBe('queued');
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    model.select(null);
    await expect(model.send('hi')).rejects.toThrow('Выберите');
    model.dispose();
  });
  it('rejects invalid values and clears busy on failures', async () => {
    const api = fakeApi();
    const model = new Messenger(api);
    await expect(model.createChat('bad')).rejects.toThrow();
    api.contact.mockRejectedValueOnce(new Error('not found'));
    await expect(model.createChat('79991234567')).rejects.toThrow();
    expect(model.getSnapshot().creating).toBe(false);
    await model.createChat('79991234567');
    api.send.mockRejectedValueOnce(new Error('offline'));
    await expect(model.send('hi')).rejects.toThrow('offline');
    expect(model.getSnapshot().sending).toBe(false);
    await expect(model.send(' ')).rejects.toThrow();
    model.dispose();
  });
  it('prevents simultaneous creation and sending; pins destination', async () => {
    const api = fakeApi();
    const model = new Messenger(api);
    const contact = deferred<string>();
    api.contact.mockReturnValueOnce(contact.promise);
    const creating = model.createChat('79991234567');
    await model.createChat('79991234568');
    expect(api.contact).toHaveBeenCalledTimes(1);
    contact.resolve('42');
    await creating;
    const sent = deferred<string>();
    api.send.mockReturnValueOnce(sent.promise);
    const sending = model.send('hello');
    await model.send('duplicate');
    model.select(null);
    sent.resolve('id');
    await sending;
    expect(api.send).toHaveBeenCalledTimes(1);
    expect(model.getSnapshot().chats[0]?.messages).toHaveLength(1);
    model.dispose();
  });
  it('processes before ack, deduplicates after ack failure and recovers', async () => {
    const api = fakeApi();
    const model = new Messenger(api);
    api.receive.mockResolvedValueOnce(event).mockResolvedValueOnce(event);
    api.acknowledge.mockImplementationOnce(async () => {
      expect(model.getSnapshot().chats[0]?.messages).toHaveLength(1);
      throw new Error('ack failed');
    });
    model.startReceiving();
    await vi.advanceTimersByTimeAsync(1);
    expect(model.getSnapshot().receivingError).toBe('ack failed');
    await vi.advanceTimersByTimeAsync(2000);
    expect(model.getSnapshot().chats[0]?.messages).toHaveLength(1);
    expect(model.getSnapshot().receivingError).toBe('');
    model.dispose();
  });
  it('never overlaps receives and stops on cleanup', async () => {
    const api = fakeApi();
    const notification = deferred<Notification | null>();
    api.receive.mockReturnValueOnce(notification.promise);
    const model = new Messenger(api);
    const stop = model.startReceiving();
    await vi.advanceTimersByTimeAsync(60000);
    expect(api.receive).toHaveBeenCalledTimes(1);
    stop();
    notification.resolve(event);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.acknowledge).not.toHaveBeenCalled();
    expect(model.getSnapshot().chats).toHaveLength(0);
    model.dispose();
  });
  it('stops on authorization errors; manual restart works', async () => {
    const api = fakeApi();
    api.receive.mockRejectedValueOnce(new ApiError(401));
    const model = new Messenger(api);
    model.startReceiving();
    await vi.advanceTimersByTimeAsync(60000);
    expect(api.receive).toHaveBeenCalledTimes(1);
    model.startReceiving();
    await vi.advanceTimersByTimeAsync(1);
    expect(model.getSnapshot().receivingError).toBe('');
    model.dispose();
  });
  it('ignores late creation and send after disposal', async () => {
    const api = fakeApi();
    const pending = deferred<string>();
    api.contact.mockReturnValueOnce(pending.promise);
    const model = new Messenger(api);
    const creating = model.createChat('79991234567');
    model.dispose();
    pending.resolve('42');
    await creating;
    expect(model.getSnapshot().chats).toHaveLength(0);
    await model.createChat('79991234567');
    await model.send('hi');
    expect(api.send).not.toHaveBeenCalled();
  });
  it('merges a resolved contact with an incoming chat', async () => {
    const api = fakeApi();
    api.receive.mockResolvedValueOnce(event);
    const model = new Messenger(api);
    model.startReceiving();
    await vi.advanceTimersByTimeAsync(1);
    await model.createChat('79991234567');
    expect(model.getSnapshot().chats).toHaveLength(1);
    expect(model.getSnapshot().chats[0]?.phone).toBe('79991234567');
    model.dispose();
  });
  it('applies a delivery event arriving before send response', async () => {
    const api = fakeApi();
    const model = new Messenger(api);
    await model.createChat('79991234567');
    const sent = deferred<string>();
    api.send.mockReturnValueOnce(sent.promise);
    const sending = model.send('hi');
    api.receive.mockResolvedValueOnce({
      receiptId: 2,
      body: {
        typeWebhook: 'outgoingMessageStatus',
        chatId: '42',
        idMessage: 'sent-id',
        status: 'delivered',
      },
    });
    model.startReceiving();
    await vi.advanceTimersByTimeAsync(1);
    sent.resolve('sent-id');
    await sending;
    expect(model.getSnapshot().chats[0]?.messages[0]?.status).toBe('delivered');
    model.dispose();
  });
  it('handles abort during an in-flight rejection', async () => {
    const api = fakeApi();
    api.receive.mockImplementation(
      (signal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const model = new Messenger(api);
    model.startReceiving();
    model.dispose();
    await vi.advanceTimersByTimeAsync(1);
    expect(model.getSnapshot().receivingError).toBe('');
  });
  it('caps exponential backoff', async () => {
    const api = fakeApi();
    api.receive.mockRejectedValue(new Error('offline'));
    const model = new Messenger(api);
    model.startReceiving();
    await vi.advanceTimersByTimeAsync(120000);
    expect(api.receive.mock.calls.length).toBeLessThan(10);
    model.dispose();
  });
  it('delay is abortable before and during wait', async () => {
    const c = new AbortController();
    const promise = delay(5000, c.signal);
    c.abort();
    await promise;
    await delay(5000, c.signal);
    expect(vi.getTimerCount()).toBe(0);
  });
});
