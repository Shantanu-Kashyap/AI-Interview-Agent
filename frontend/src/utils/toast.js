const listeners = new Set();
const pendingToasts = [];

const notifyListeners = (toast) => {
  if (!listeners.size) {
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
}) => {
  notifyListeners({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    type,
    duration,
  });
};

export const showErrorToast = (message) => {
  showToast({ message, type: "error" });
};

export const showSuccessToast = (message) => {
  showToast({ message, type: "success" });
};
