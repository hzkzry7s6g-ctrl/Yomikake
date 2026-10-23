import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

const ToastContext = createContext<(message: string, undo?: () => void) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number>(undefined);

  const show = useCallback((message: string, undo?: () => void) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, undo });
    timer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              className="toast-undo"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              元に戻す
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
