import { useEffect, useSyncExternalStore } from 'react';
import { ArrowLeft, LogOut, MessageCircle } from 'lucide-react';
import { Messenger, NewChat, Composer } from '../../features/messaging';
import { MessageList } from '../../entities/chat';
import { Avatar, Brand, ErrorNotice } from '../../shared/ui';
export function MessengerView({
  model,
  onLogout,
}: {
  model: Messenger;
  onLogout: () => void;
}) {
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const active = state.chats.find((chat) => chat.id === state.activeId);
  useEffect(() => model.startReceiving(), [model]);
  return (
    <main className="h-dvh bg-slate-100 p-0 md:p-5 xl:p-8">
      <div className="mx-auto flex h-full max-w-7xl overflow-hidden bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-xl md:shadow-slate-200/60">
        <aside
          aria-label="Чаты"
          className={`${active ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 md:w-80 lg:w-90`}
        >
          <header className="flex items-center justify-between border-b border-slate-100 p-5">
            <Brand />
            <button
              className="icon-button"
              aria-label="Выйти"
              title="Выйти"
              onClick={onLogout}
            >
              <LogOut size={19} aria-hidden="true" />
            </button>
          </header>
          {state.receivingError && !active && (
            <div className="space-y-2 bg-white p-3">
              <ErrorNotice>{state.receivingError}</ErrorNotice>
              <button
                className="text-sm font-semibold text-indigo-700 underline"
                onClick={() => model.startReceiving()}
              >
                Повторить подключение
              </button>
            </div>
          )}
          <NewChat
            busy={state.creating || state.sending}
            onCreate={(phone) => model.createChat(phone)}
          />
          <div className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Сообщения{' '}
            <span className="ml-1 text-slate-400">{state.chats.length}</span>
          </div>
          <nav className="flex-1 overflow-y-auto p-2" aria-label="Список чатов">
            {state.chats.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm leading-6 text-slate-500">
                Здесь появятся ваши чаты.
                <br />
                Введите номер, чтобы начать.
              </p>
            ) : (
              state.chats.map((chat) => (
                <button
                  key={chat.id}
                  disabled={state.sending}
                  onClick={() => model.select(chat.id)}
                  aria-current={chat.id === active?.id ? 'true' : undefined}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${chat.id === active?.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <Avatar name={chat.title} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {chat.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {chat.messages.at(-1)?.text ?? 'Начните разговор'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </nav>
          <footer className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            <span
              className={`mr-2 inline-block size-2 rounded-full ${state.receivingError ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
            {state.receivingError
              ? 'Получение приостановлено'
              : 'Подключено к GREEN-API'}
          </footer>
        </aside>
        <section
          aria-label="Переписка"
          className={`${active ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#f3f4fa]`}
        >
          {state.receivingError && active && (
            <div className="space-y-2 bg-white p-3">
              <ErrorNotice>{state.receivingError}</ErrorNotice>
              <button
                className="text-sm font-semibold text-indigo-700 underline"
                onClick={() => model.startReceiving()}
              >
                Повторить подключение
              </button>
            </div>
          )}
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-7">
                <button
                  className="icon-button md:hidden"
                  aria-label="Назад к чатам"
                  disabled={state.sending}
                  onClick={() => model.select(null)}
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar name={active.title} />
                <div>
                  <h1 className="text-sm font-semibold">{active.title}</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    MAX · текстовые сообщения
                  </p>
                </div>
              </header>
              <MessageList chat={active} />
              <Composer
                key={active.id}
                busy={state.sending}
                onSend={(text) => model.send(text)}
              />
            </>
          ) : (
            <div className="chat-background grid flex-1 place-content-center p-8 text-center">
              <span className="mx-auto mb-6 grid size-20 place-items-center rounded-3xl bg-white shadow-sm">
                <MessageCircle
                  size={38}
                  strokeWidth={1.4}
                  className="text-indigo-500"
                  aria-hidden="true"
                />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Разговор начинается здесь
              </h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">
                Создайте чат по номеру телефона
                <br />и отправьте первое сообщение в MAX.
              </p>
              <span className="mt-8 text-xs text-slate-400">
                Личные чаты · Только текст · В реальном времени
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
