import { showErrorToast } from "./toast";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const asText = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
};

const fromResponseData = (data) => {
  if (!data) return "";

  if (typeof data === "string") {
    return asText(data);
  }

  if (typeof data === "object") {
    return asText(data.message) || asText(data.error);
  }

  return "";
};

export const getHumanReadableError = (error, fallbackMessage = GENERIC_ERROR_MESSAGE) => {
  const status = error?.response?.status;
  const serverMessage = fromResponseData(error?.response?.data);

  if (serverMessage) {
    return serverMessage;
  }

  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please try again in a moment.";
  }

  if (!error?.response) {
    return "Unable to connect to server. Please check your internet and try again.";
  }

  if (status === 400) return "Please check your input and try again.";
  if (status === 401) return "Please sign in again to continue.";
  if (status === 403) return "You are not allowed to perform this action.";
  if (status === 404) return "Requested data was not found.";
  if (status === 429) return "Too many requests right now. Please wait a bit and retry.";
  if (status >= 500) return "Server is having trouble right now. Please try again shortly.";

  return fallbackMessage || GENERIC_ERROR_MESSAGE;
};

export const showApiError = (error, fallbackMessage, toastOptions) => {
  const message = getHumanReadableError(error, fallbackMessage);
  showErrorToast(message, toastOptions);
  return message;
};
