import React, { useEffect, useState } from "react";
import { subscribeToToasts } from "../utils/toast";

const toastStyleByType = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  error: "border-rose-300 bg-rose-50 text-rose-800",
  info: "border-sky-300 bg-sky-50 text-sky-800",
};

const ToastViewport = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
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
          <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export default ToastViewport;
