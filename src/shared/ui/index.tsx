import { MessageCircle, LoaderCircle, AlertCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white">
        <MessageCircle size={26} aria-hidden="true" />
      </span>
      <span className="text-xl font-bold tracking-tight">
        MAX
        <span className="ml-2 text-sm font-normal text-slate-500">
          / GREEN-API
        </span>
      </span>
    </div>
  );
}
export function Button({
  children,
  busy,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`primary-button ${className}`}
    >
      {busy && (
        <LoaderCircle
          size={18}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
    >
      {name.startsWith('+') ? name.slice(-2) : name.slice(0, 2).toUpperCase()}
    </span>
  );
}
