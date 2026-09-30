import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, ErrorNotice } from '../../shared/ui';
import { errorMessage } from '../../shared/lib/validation';
export function NewChat({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (phone: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-3 border-b border-slate-100 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        void onCreate(phone)
          .then(() => setPhone(''))
          .catch((cause: unknown) => setError(errorMessage(cause)));
      }}
    >
      <label className="field-label text-xs">
        Новый чат
        <input
          className="input"
          type="tel"
          autoComplete="tel"
          placeholder="+7 (999) 123-45-67"
          aria-describedby="phone-hint"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={busy}
          required
        />
      </label>
      <p id="phone-hint" className="text-xs text-slate-500">
        Номер получателя в MAX · РФ или РБ
      </p>
      <Button busy={busy} type="submit" className="w-full">
        <Plus size={17} aria-hidden="true" />
        {busy ? 'Поиск аккаунта…' : 'Создать чат'}
      </Button>
      {error && <ErrorNotice>{error}</ErrorNotice>}
    </form>
  );
}
