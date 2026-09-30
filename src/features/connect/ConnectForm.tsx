import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { createApi, type ChatApi } from '../../shared/api';
import { credentialsSchema, errorMessage } from '../../shared/lib/validation';
import { Brand, Button, ErrorNotice } from '../../shared/ui';
export function ConnectForm({
  onConnect,
}: {
  onConnect: (api: ChatApi) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-5 py-10">
      <section
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-10"
        aria-labelledby="connect-title"
      >
        <Brand />
        <div className="mb-8 mt-10">
          <p className="eyebrow">ВАШИ СООБЩЕНИЯ, БЛИЖЕ</p>
          <h1
            id="connect-title"
            className="mt-3 text-3xl font-semibold tracking-tight"
          >
            Войдите в чат
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Подключите свой инстанс GREEN-API,
            <br />
            чтобы общаться в MAX.
          </p>
        </div>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (request.current) return;
            const values = Object.fromEntries(
              new FormData(event.currentTarget),
            );
            const parsed = credentialsSchema.safeParse(values);
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Проверьте поля.');
              return;
            }
            const controller = new AbortController();
            request.current = controller;
            setBusy(true);
            setError('');
            const api = createApi(parsed.data);
            void api
              .state(controller.signal)
              .then((state) => {
                if (controller.signal.aborted) return;
                if (state !== 'authorized')
                  throw new Error(
                    'Инстанс не авторизован. Подключите MAX в кабинете GREEN-API.',
                  );
                onConnect(api);
              })
              .catch((cause: unknown) => {
                if (!controller.signal.aborted) setError(errorMessage(cause));
              })
              .finally(() => {
                if (!controller.signal.aborted) {
                  request.current = null;
                  setBusy(false);
                }
              });
          }}
        >
          <label className="field-label">
            apiUrl
            <input
              className="input"
              name="apiUrl"
              type="url"
              placeholder="https://3100.api.green-api.com"
              required
              autoComplete="url"
              disabled={busy}
            />
            <span className="field-hint">
              Скопируйте адрес API из личного кабинета.
            </span>
          </label>
          <label className="field-label">
            idInstance
            <input
              className="input"
              name="idInstance"
              inputMode="numeric"
              placeholder="Например, 3100123456"
              required
              autoComplete="off"
              disabled={busy}
            />
          </label>
          <label className="field-label">
            apiTokenInstance
            <input
              className="input"
              name="apiTokenInstance"
              type="password"
              placeholder="Ваш ключ доступа"
              required
              autoComplete="off"
              disabled={busy}
            />
          </label>
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <Button type="submit" busy={busy} className="w-full">
            {busy ? 'Подключение…' : 'Подключиться'}
            {!busy && <ArrowRight size={18} aria-hidden="true" />}
          </Button>
        </form>
        <p className="mt-6 flex gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck
            className="mt-0.5 shrink-0"
            size={16}
            aria-hidden="true"
          />
          Реквизиты хранятся только в памяти этой вкладки и отправляются
          напрямую в GREEN-API.
        </p>
        <a
          className="mt-6 block text-center text-sm font-medium text-indigo-700 hover:underline"
          href="https://console.green-api.com/"
          target="_blank"
          rel="noreferrer"
        >
          Открыть кабинет GREEN-API ↗
        </a>
      </section>
    </main>
  );
}
