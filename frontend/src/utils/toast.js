const listeners = new Set();
const pendingToasts = [];
const MAX_PENDING = 30;

const notifyListeners = (toast) => {
  if (!listeners.size) {
    if (pendingToasts.length >= MAX_PENDING) {
      pendingToasts.shift();
    }
    pendingToasts.push(toast);
    return;
  }

  listeners.forEach((listener) => listener(toast));
};

export const subscribeToToasts = (listener) => {
  listeners.add(listener);

  if (pendingToasts.length) {
    pendingToasts.splice(0).forEach((toast) => listener(toast));
  }

  return () => {
    listeners.delete(listener);
  };
};

export const showToast = ({
  message,
  type = "info",
  duration = 3500,
  actionLabel,
  onAction,
}) => {
  if (!message || typeof message !== "string") return;

  notifyListeners({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    type,
    duration,
    actionLabel,
    onAction,
  });
};

export const showErrorToast = (message, options = {}) => {
  showToast({ message, type: "error", ...options });
};

export const showSuccessToast = (message, options = {}) => {
  showToast({ message, type: "success", ...options });
};

export const showInfoToast = (message, options = {}) => {
  showToast({ message, type: "info", ...options });
};
