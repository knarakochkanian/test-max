import { applyNotification, type Chat } from '../../entities/chat';
import { ApiError, type ChatApi } from '../../shared/api';
import {
  errorMessage,
  normalizePhone,
  validateMessage,
} from '../../shared/lib/validation';

export interface MessengerState {
  chats: Chat[];
  activeId: string | null;
  receivingError: string;
  sending: boolean;
  creating: boolean;
}
export class Messenger {
  private snapshot: MessengerState = {
    chats: [],
    activeId: null,
    receivingError: '',
    sending: false,
    creating: false,
  };
  private listeners = new Set<() => void>();
  private lifetime = new AbortController();
  private pollController?: AbortController;
  private pendingStatuses: unknown[] = [];
  constructor(private readonly api: ChatApi) {}
  getSnapshot = (): MessengerState => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private update(patch: Partial<MessengerState>): void {
    if (this.lifetime.signal.aborted) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  select = (activeId: string | null): void => {
    this.update({ activeId });
  };
  async createChat(rawPhone: string): Promise<void> {
    if (this.snapshot.creating || this.lifetime.signal.aborted) return;
    const phone = normalizePhone(rawPhone);
    const existing = this.snapshot.chats.find((chat) => chat.phone === phone);
    if (existing) {
      this.select(existing.id);
      return;
    }
    this.update({ creating: true });
    try {
      const id = await this.api.contact(phone, this.lifetime.signal);
      const chats = this.snapshot.chats.some((chat) => chat.id === id)
        ? this.snapshot.chats.map((chat) =>
            chat.id === id ? { ...chat, phone, title: `+${phone}` } : chat,
          )
        : [
            ...this.snapshot.chats,
            { id, title: `+${phone}`, phone, messages: [] },
          ];
      this.update({ chats, activeId: id });
    } finally {
      this.update({ creating: false });
    }
  }
  async send(rawText: string): Promise<void> {
    if (this.snapshot.sending || this.lifetime.signal.aborted) return;
    const text = validateMessage(rawText);
    const chatId = this.snapshot.activeId;
    if (!chatId) throw new Error('Выберите чат.');
    this.update({ sending: true });
    try {
      const id = await this.api.send(chatId, text, this.lifetime.signal);
      let chats = this.snapshot.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id,
                  text,
                  timestamp: Date.now(),
                  outgoing: true,
                  status: 'queued' as const,
                },
              ],
            }
          : chat,
      );
      for (const status of this.pendingStatuses)
        chats = applyNotification(chats, status);
      this.update({ chats });
    } finally {
      this.pendingStatuses = [];
      this.update({ sending: false });
    }
  }
  startReceiving = (): (() => void) => {
    this.pollController?.abort();
    const controller = new AbortController();
    this.pollController = controller;
    const signal = AbortSignal.any([controller.signal, this.lifetime.signal]);
    void this.poll(signal);
    return () => controller.abort();
  };
  dispose = (): void => {
    this.lifetime.abort();
    this.pollController?.abort();
    this.listeners.clear();
  };
  private async poll(signal: AbortSignal): Promise<void> {
    let failures = 0;
    while (!signal.aborted) {
      try {
        const notification = await this.api.receive(signal);
        if (signal.aborted) return;
        if (notification) {
          if (this.snapshot.sending)
            this.pendingStatuses.push(notification.body);
          this.update({
            chats: applyNotification(this.snapshot.chats, notification.body),
          });
          await this.api.acknowledge(notification.receiptId, signal);
        }
        failures = 0;
        this.update({ receivingError: '' });
        await delay(250, signal);
      } catch (error) {
        if (signal.aborted) return;
        this.update({ receivingError: errorMessage(error) });
        if (error instanceof ApiError && [401, 403].includes(error.status))
          return;
        failures++;
        await delay(
          Math.min(1000 * 2 ** Math.min(failures, 5), 30_000),
          signal,
        );
      }
    }
  }
}
export function delay(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', finish, { once: true });
  });
}
