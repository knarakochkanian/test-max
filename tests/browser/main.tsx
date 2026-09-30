// Local-only browser fixture. Not included in the production entry or build.
// All API requests are intercepted; no credentials or messages leave the browser.
import { createRoot } from 'react-dom/client';
import { App } from '../../src/app/App';
import '../../src/app/styles.css';
let messageCounter = 0;
const queue: unknown[] = [];
window.fetch = async (_input, init) => {
  const url = String(_input);
  const json = (value: unknown) => new Response(JSON.stringify(value));
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (url.includes('/getStateInstance/'))
    return json({ stateInstance: 'authorized' });
  if (url.includes('/checkAccount/'))
    return json({ exist: true, chatId: '42' });
  if (url.includes('/sendMessage/')) {
    const id = String(++messageCounter);
    queue.push({
      receiptId: messageCounter,
      body: {
        typeWebhook: 'incomingMessageReceived',
        idMessage: `reply-${id}`,
        timestamp: Date.now() / 1000,
        senderData: { chatId: '42', senderName: 'Тестовый контакт' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: {
            textMessage:
              'Привет! Сообщение получено. Это локальный тестовый ответ.',
          },
        },
      },
    });
    return json({ idMessage: id });
  }
  if (url.includes('/receiveNotification/')) return json(queue[0] ?? null);
  if (url.includes('/deleteNotification/')) {
    queue.shift();
    return json({ result: true });
  }
  return new Response(null, { status: 404 });
};
createRoot(document.getElementById('root')!).render(<App />);
