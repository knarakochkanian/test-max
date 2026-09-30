import { z } from 'zod';

export const MAX_MESSAGE_LENGTH = 4000;
export const credentialsSchema = z.object({
  apiUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        /^(?:[a-z0-9-]+\.)?api\.green-api\.com$/.test(url.hostname) &&
        !url.port &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        (url.pathname === '/' || url.pathname === '')
      );
    }, 'Используйте HTTPS apiUrl из кабинета GREEN-API (домен api.green-api.com).'),
  idInstance: z
    .string()
    .trim()
    .regex(/^\d+$/, 'idInstance должен содержать только цифры.'),
  apiTokenInstance: z
    .string()
    .trim()
    .min(1, 'Введите apiTokenInstance.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Токен содержит недопустимые символы.'),
});
export type Credentials = z.infer<typeof credentialsSchema>;
export function normalizePhone(value: string): string {
  if (!/^\+?[\d\s()-]+$/.test(value.trim()))
    throw new Error('Введите номер РФ (+7) или РБ (+375).');
  const digits = value.replace(/\D/g, '');
  if (!/^(7\d{10}|375\d{9})$/.test(digits))
    throw new Error('Введите номер РФ (+7 и 10 цифр) или РБ (+375 и 9 цифр).');
  return digits;
}
export function validateMessage(value: string): string {
  const text = value.trim();
  if (!text) throw new Error('Напишите сообщение.');
  if (text.length > MAX_MESSAGE_LENGTH)
    throw new Error('Сообщение не должно превышать 4000 символов.');
  return text;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Неизвестная ошибка. Попробуйте ещё раз.';
}
