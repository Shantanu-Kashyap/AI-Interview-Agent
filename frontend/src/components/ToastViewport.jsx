import React, { useEffect, useState } from "react";
import { subscribeToToasts } from "../utils/toast";

const toastStyleByType = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  error: "border-rose-300 bg-rose-50 text-rose-800",
  info: "border-sky-300 bg-sky-50 text-sky-800",
};

const ToastViewport = () => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast].slice(-4));

      window.setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration ?? 3500);
    });

    return unsubscribe;
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed top-4 right-4 flex w-[92vw] max-w-sm flex-col gap-2 sm:top-6 sm:right-6"
      style={{ zIndex: 1200 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-[toast-enter_220ms_ease-out] ${toastStyleByType[toast.type] || toastStyleByType.info}`}
        >
          <div className="flex items-start gap-3">
            <p className="text-sm font-medium leading-relaxed flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-base leading-none opacity-70 hover:opacity-100"
              aria-label="Close notification"
            >
              x
            </button>
          </div>
          {toast.actionLabel && typeof toast.onAction === "function" && (
            <button
              type="button"
              onClick={() => {
                toast.onAction();
                removeToast(toast.id);
              }}
              className="mt-2 text-xs font-semibold underline underline-offset-2"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ToastViewport;
