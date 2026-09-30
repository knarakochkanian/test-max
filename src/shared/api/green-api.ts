import { z } from 'zod';
import { credentialsSchema, type Credentials } from '../lib/validation';

const envelope = z.object({
  receiptId: z.number().int().positive(),
  body: z.unknown(),
});
export type Notification = z.infer<typeof envelope>;
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401 || status === 403
        ? 'Доступ отклонён. Проверьте реквизиты и состояние инстанса.'
        : status === 429 || status === 469
          ? 'Превышен лимит запросов. Повторите позже.'
          : `GREEN-API недоступен (HTTP ${status}). Попробуйте позже.`,
    );
  }
}
export interface ChatApi {
  state(signal: AbortSignal): Promise<string>;
  contact(phone: string, signal: AbortSignal): Promise<string>;
  send(chatId: string, message: string, signal: AbortSignal): Promise<string>;
  receive(signal: AbortSignal): Promise<Notification | null>;
  acknowledge(receiptId: number, signal: AbortSignal): Promise<void>;
}
export function createApi(input: Credentials): ChatApi {
  const credentials = credentialsSchema.parse(input);
  async function request(
    method: string,
    signal: AbortSignal,
    body?: object,
    suffix = '',
    verb = body ? 'POST' : 'GET',
  ): Promise<unknown> {
    const url = `${credentials.apiUrl.replace(/\/$/, '')}/waInstance${credentials.idInstance}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}${suffix}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: verb,
        signal: AbortSignal.any([signal, AbortSignal.timeout(45_000)]),
        ...(body
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
      });
    } catch {
      if (signal.aborted) throw new DOMException('Отменено', 'AbortError');
      throw new Error('Нет ответа от GREEN-API. Проверьте сеть и apiUrl.');
    }
    if (!response.ok) throw new ApiError(response.status);
    const text = await response.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('GREEN-API вернул некорректный ответ.');
    }
  }
  return {
    async state(signal) {
      return z
        .object({ stateInstance: z.string() })
        .parse(await request('getStateInstance', signal)).stateInstance;
    },
    async contact(phone, signal) {
      const result = z
        .object({ exist: z.boolean(), chatId: z.string().optional() })
        .safeParse(
          await request('checkAccount', signal, { phoneNumber: Number(phone) }),
        );
      if (!result.success)
        throw new Error(
          'Не удалось проверить номер. Проверьте авторизацию и лимиты инстанса.',
        );
      if (!result.data.exist || !result.data.chatId)
        throw new Error('Аккаунт MAX не найден или поиск по номеру запрещён.');
      return result.data.chatId;
    },
    async send(chatId, message, signal) {
      return z
        .object({ idMessage: z.string().min(1) })
        .parse(await request('sendMessage', signal, { chatId, message }))
        .idMessage;
    },
    async receive(signal) {
      const value = await request(
        'receiveNotification',
        signal,
        undefined,
        '?receiveTimeout=30',
      );
      return value === null ? null : envelope.parse(value);
    },
    async acknowledge(receiptId, signal) {
      const result = z
        .object({ result: z.boolean() })
        .parse(
          await request(
            'deleteNotification',
            signal,
            undefined,
            `/${receiptId}`,
            'DELETE',
          ),
        );
      if (!result.result)
        throw new Error('Не удалось подтвердить получение уведомления.');
    },
  };
}
