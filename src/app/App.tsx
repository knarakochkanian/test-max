import { Component, type ReactNode } from 'react';
import { MessengerPage } from '../pages/messenger';
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="grid min-h-dvh place-content-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Не удалось показать чат</h1>
        <p>Перезагрузите страницу, чтобы подключиться заново.</p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Перезагрузить
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  return (
    <ErrorBoundary>
      <MessengerPage />
    </ErrorBoundary>
  );
}
