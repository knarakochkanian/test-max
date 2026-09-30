import { useEffect, useRef, useState } from 'react';
import { ConnectForm } from '../../features/connect';
import { Messenger } from '../../features/messaging';
import { MessengerView } from '../../widgets/messenger';
export function MessengerPage() {
  const [model, setModel] = useState<Messenger | null>(null);
  const current = useRef<Messenger | null>(null);
  useEffect(() => () => current.current?.dispose(), []);
  if (!model)
    return (
      <ConnectForm
        onConnect={(api) => {
          const session = new Messenger(api);
          current.current = session;
          setModel(session);
        }}
      />
    );
  return (
    <MessengerView
      model={model}
      onLogout={() => {
        model.dispose();
        current.current = null;
        setModel(null);
      }}
    />
  );
}
