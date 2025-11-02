type ToastType = 'success' | 'error' | 'info'

function notify(type: ToastType, message: string) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    // Best-effort: console + alert fallback
    console.log(`[${type.toUpperCase()}] ${message}`);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

export const toast = {
  success: (msg: string) => notify('success', msg),
  error: (msg: string) => notify('error', msg),
  info: (msg: string) => notify('info', msg),
};
