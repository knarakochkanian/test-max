import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { Composer } from '../features/messaging';
afterEach(() => vi.unstubAllGlobals());
async function fillLogin() {
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText('apiUrl', { exact: false }),
    'https://3100.api.green-api.com',
  );
  await user.type(screen.getByLabelText('idInstance'), '123');
  await user.type(screen.getByLabelText('apiTokenInstance'), 'fake-token');
  return user;
}
it('full flow: connect, create, send, receive literal HTML safely, logout', async () => {
  let receiveCount = 0;
  const fetch = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/getStateInstance/'))
      return new Response('{"stateInstance":"authorized"}');
    if (url.includes('/checkAccount/'))
      return new Response('{"exist":true,"chatId":"42"}');
    if (url.includes('/sendMessage/'))
      return new Response('{"idMessage":"sent"}');
    if (url.includes('/deleteNotification/'))
      return new Response('{"result":true}');
    receiveCount++;
    return new Response(
      JSON.stringify(
        receiveCount === 1
          ? {
              receiptId: 1,
              body: {
                typeWebhook: 'incomingMessageReceived',
                idMessage: 'reply',
                timestamp: 100,
                senderData: { chatId: '42', senderName: 'Анна' },
                messageData: {
                  typeMessage: 'textMessage',
                  textMessageData: {
                    textMessage: '<img src=x onerror=alert(1)>',
                  },
                },
              },
            }
          : null,
      ),
    );
  });
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Подключиться' }));
  await screen.findByLabelText('Новый чат');
  await user.type(screen.getByLabelText('Новый чат'), '+7 999 1234567');
  await user.click(screen.getByRole('button', { name: 'Создать чат' }));
  await screen.findByLabelText('Сообщение');
  await user.type(screen.getByLabelText('Сообщение'), 'Привет!');
  await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
  await screen.findByText('В очереди');
  expect(screen.getByRole('log')).toHaveTextContent(
    '<img src=x onerror=alert(1)>',
  );
  expect(document.querySelector('img')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Выйти' }));
  expect(
    screen.getByRole('heading', { name: 'Войдите в чат' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('apiTokenInstance')).toHaveValue('');
});
it('shows unauthorized instance and allows retry', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response('{"stateInstance":"notAuthorized"}')),
  );
  render(<App />);
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Подключиться' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Инстанс не авторизован',
  );
  expect(screen.getByRole('button', { name: 'Подключиться' })).toBeEnabled();
});
it('blocks untrusted API host without network requests', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  const user = await fillLogin();
  await user.clear(screen.getByLabelText('apiUrl', { exact: false }));
  await user.type(
    screen.getByLabelText('apiUrl', { exact: false }),
    'https://evil.com',
  );
  await user.click(screen.getByRole('button', { name: 'Подключиться' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTPS');
  expect(fetch).not.toHaveBeenCalled();
});
it('composer retains failed draft and prevents duplicate submission', async () => {
  let reject!: (reason: Error) => void;
  const send = vi.fn().mockImplementation(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      }),
  );
  render(<Composer busy={false} onSend={send} />);
  const user = userEvent.setup();
  const input = screen.getByLabelText('Сообщение');
  await user.type(input, 'hello');
  await user.keyboard('{Enter}{Enter}');
  expect(send).toHaveBeenCalledTimes(1);
  reject(new Error('Offline'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  expect(input).toHaveValue('hello');
  expect(input).toHaveFocus();
});
it('composer supports newline and IME without premature submit', async () => {
  const send = vi.fn().mockResolvedValue(undefined);
  render(<Composer busy={false} onSend={send} />);
  const user = userEvent.setup();
  const input = screen.getByLabelText('Сообщение');
  await user.type(input, 'one');
  await user.keyboard('{Shift>}{Enter}{/Shift}two');
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
  expect(send).not.toHaveBeenCalled();
  expect(input).toHaveValue('one\ntwo');
  await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
  await waitFor(() => expect(input).toHaveValue(''));
});
