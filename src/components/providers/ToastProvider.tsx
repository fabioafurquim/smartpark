'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<
  ToastVariant,
  {
    container: string;
    icon: ReactNode;
  }
> = {
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-950',
    icon: <XCircle className="h-5 w-5 text-red-600" />,
  },
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-950',
    icon: <Info className="h-5 w-5 text-blue-600" />,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeout = timeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ duration = 4500, variant = 'info', ...options }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((current) => [...current, { id, variant, duration, ...options }]);

      const timeout = setTimeout(() => {
        dismissToast(id);
      }, duration);

      timeouts.current.set(id, timeout);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-full sm:max-w-sm">
        {toasts.map((toast) => {
          const style = toastStyles[toast.variant || 'info'];

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur',
                'animate-in slide-in-from-bottom-3 fade-in duration-200 sm:slide-in-from-top-3',
                style.container
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{style.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-sm opacity-90">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
