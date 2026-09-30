import { describe, expect, it } from 'vitest';
import { applyNotification, type Chat } from './model';
const event = {
  typeWebhook: 'incomingMessageReceived',
  idMessage: 'a',
  timestamp: 100,
  senderData: { chatId: '42', senderName: 'Анна' },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет' },
  },
};
describe('chat notification reducer', () => {
  it('creates incoming chat, converts timestamp, deduplicates', () => {
    const chats = applyNotification([], event);
    expect(chats[0]?.title).toBe('Анна');
    expect(chats[0]?.messages[0]?.timestamp).toBe(100000);
    expect(applyNotification(chats, event)).toBe(chats);
  });
  it('appends only to the matching chat', () => {
    const chats: Chat[] = [
      { id: 'other', title: 'Other', messages: [] },
      { id: '42', title: 'Contact', messages: [] },
    ];
    const result = applyNotification(chats, event);
    expect(result[0]).toBe(chats[0]);
    expect(result[1]?.messages).toHaveLength(1);
  });
  it('handles extended text and missing name', () => {
    const chats = applyNotification([], {
      ...event,
      senderData: { chatId: '42' },
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://example.com' },
      },
    });
    expect(chats[0]?.title).toBe('42');
    expect(chats[0]?.messages[0]?.text).toBe('https://example.com');
  });
  it.each([
    null,
    {},
    { ...event, messageData: { typeMessage: 'imageMessage' } },
    { ...event, messageData: { typeMessage: 'textMessage' } },
    { ...event, timestamp: Infinity },
  ])('ignores unsupported/malformed notification', (value) => {
    const chats: Chat[] = [];
    expect(applyNotification(chats, value)).toBe(chats);
  });
  it('updates outgoing status monotonically', () => {
    const chats: Chat[] = [
      { id: 'other', title: 'other', messages: [] },
      {
        id: '42',
        title: 'Contact',
        messages: [
          { id: 'a', text: 'hi', timestamp: 1, outgoing: true },
          { id: 'b', text: 'hi', timestamp: 2, outgoing: false },
        ],
      },
    ];
    const status = {
      typeWebhook: 'outgoingMessageStatus',
      chatId: '42',
      idMessage: 'a',
      status: 'read',
    };
    const updated = applyNotification(chats, status);
    expect(updated[1]?.messages[0]?.status).toBe('read');
    expect(
      applyNotification(updated, { ...status, status: 'sent' })[1]?.messages[0]
        ?.status,
    ).toBe('read');
    expect(updated[1]?.messages[1]).toBe(chats[1]?.messages[1]);
  });
});
