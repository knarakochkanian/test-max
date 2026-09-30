import { useEffect, useRef } from 'react';
import { MessageCircle, Check, CheckCheck } from 'lucide-react';
import type { Chat, MessageStatus } from './model';
const statuses: Record<MessageStatus, string> = {
  queued: 'В очереди',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не доставлено',
};
const time = new Intl.DateTimeFormat('ru', {
  hour: '2-digit',
  minute: '2-digit',
});
export function MessageList({ chat }: { chat: Chat }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [chat.id, chat.messages.length]);
  return (
    <div
      role="log"
      aria-label="Сообщения чата"
      aria-live="polite"
      aria-relevant="additions text"
      className="chat-background flex-1 overflow-y-auto px-4 py-6 sm:px-7"
    >
      {chat.messages.length === 0 ? (
        <div className="grid h-full place-content-center text-center">
          <MessageCircle
            className="mx-auto mb-4 text-indigo-400"
            size={40}
            strokeWidth={1.4}
            aria-hidden="true"
          />
          <h2 className="font-semibold">Начните разговор</h2>
          <p className="mt-2 text-sm text-slate-500">
            Отправьте первое сообщение в MAX.
          </p>
        </div>
      ) : (
        chat.messages.map((message) => (
          <div
            key={message.id}
            className={`mb-3 flex ${message.outgoing ? 'justify-end' : 'justify-start'}`}
          >
            <article
              aria-label={
                message.outgoing ? 'Исходящее сообщение' : 'Входящее сообщение'
              }
              className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${message.outgoing ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-white text-slate-800'}`}
            >
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6">
                {message.text}
              </p>
              <div
                className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${message.outgoing ? 'text-indigo-100' : 'text-slate-500'}`}
              >
                <time dateTime={new Date(message.timestamp).toISOString()}>
                  {time.format(message.timestamp)}
                </time>
                {message.outgoing && (
                  <span className="flex items-center gap-1">
                    {statuses[message.status ?? 'queued']}
                    {message.status === 'delivered' ||
                    message.status === 'read' ? (
                      <CheckCheck size={13} aria-hidden="true" />
                    ) : (
                      <Check size={13} aria-hidden="true" />
                    )}
                  </span>
                )}
              </div>
            </article>
          </div>
        ))
      )}
      <div ref={end} />
    </div>
  );
}
