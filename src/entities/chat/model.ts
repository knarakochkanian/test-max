import { z } from 'zod';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export interface Message {
  id: string;
  text: string;
  timestamp: number;
  outgoing: boolean;
  status?: MessageStatus;
}
export interface Chat {
  id: string;
  title: string;
  phone?: string;
  messages: Message[];
}
const incoming = z.object({
  typeWebhook: z.literal('incomingMessageReceived'),
  idMessage: z.string(),
  timestamp: z.number().finite().nonnegative().max(8.64e12),
  senderData: z.object({
    chatId: z.string(),
    senderName: z.string().optional(),
    senderPhoneNumber: z.union([z.number(), z.string()]).optional(),
  }),
  messageData: z.object({
    typeMessage: z.string(),
    textMessageData: z.object({ textMessage: z.string() }).optional(),
    extendedTextMessageData: z.object({ text: z.string() }).optional(),
  }),
});
const status = z.object({
  typeWebhook: z.literal('outgoingMessageStatus'),
  chatId: z.string(),
  idMessage: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
});
const rank: Record<MessageStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};
export function applyNotification(chats: Chat[], body: unknown): Chat[] {
  const delivery = status.safeParse(body);
  if (delivery.success) {
    const event = delivery.data;
    return chats.map((chat) =>
      chat.id === event.chatId
        ? {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === event.idMessage &&
              message.outgoing &&
              rank[event.status] > rank[message.status ?? 'queued']
                ? { ...message, status: event.status }
                : message,
            ),
          }
        : chat,
    );
  }
  const parsed = incoming.safeParse(body);
  if (!parsed.success) return chats;
  const event = parsed.data;
  const text =
    event.messageData.typeMessage === 'textMessage'
      ? event.messageData.textMessageData?.textMessage
      : event.messageData.typeMessage === 'extendedTextMessage'
        ? event.messageData.extendedTextMessageData?.text
        : undefined;
  if (text === undefined) return chats;
  const message: Message = {
    id: event.idMessage,
    text,
    timestamp: event.timestamp * 1000,
    outgoing: false,
  };
  const exists = chats.find((chat) => chat.id === event.senderData.chatId);
  if (exists?.messages.some((item) => item.id === message.id)) return chats;
  if (!exists)
    return [
      ...chats,
      {
        id: event.senderData.chatId,
        title: event.senderData.senderName || event.senderData.chatId,
        messages: [message],
      },
    ];
  return chats.map((chat) =>
    chat.id === exists.id
      ? { ...chat, messages: [...chat.messages, message] }
      : chat,
  );
}
