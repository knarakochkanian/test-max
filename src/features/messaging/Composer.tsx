import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button, ErrorNotice } from '../../shared/ui';
import { errorMessage, MAX_MESSAGE_LENGTH } from '../../shared/lib/validation';
export function Composer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const guard = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  function send() {
    if (busy || guard.current || !text.trim()) return;
    guard.current = true;
    setError('');
    void onSend(text)
      .then(() => setText(''))
      .catch((cause: unknown) =>
        setError(
          `${errorMessage(cause)} Текст сохранён. При сетевой ошибке проверьте MAX перед повторной отправкой.`,
        ),
      )
      .finally(() => {
        guard.current = false;
        textarea.current?.focus();
      });
  }
  return (
    <form
      className="border-t border-slate-200 bg-white p-4 sm:px-7"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      {error && (
        <div className="mb-3">
          <ErrorNotice>{error}</ErrorNotice>
        </div>
      )}
      <div className="flex items-end gap-3">
        <label className="sr-only" htmlFor="message">
          Сообщение
        </label>
        <textarea
          id="message"
          ref={textarea}
          className="input min-h-12 resize-none border-0 bg-slate-100"
          placeholder="Напишите сообщение…"
          value={text}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          readOnly={busy}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Button
          type="submit"
          aria-label="Отправить сообщение"
          busy={busy}
          disabled={!text.trim()}
          className="mb-1 size-12 shrink-0 !px-0"
        >
          {!busy && <Send size={20} aria-hidden="true" />}
        </Button>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>Enter — отправить · Shift + Enter — новая строка</span>
        <span>
          {text.length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  );
}
