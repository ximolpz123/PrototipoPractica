/**
 * eventEmitter.ts
 * Simple event bus for cross-module communication (e.g., API -> App).
 * Used to trigger logout from the Axios 401 interceptor without needing
 * React context, which is unavailable in service modules.
 */

type Listener = () => void;

const listeners: Record<string, Listener[]> = {};

export const eventEmitter = {
  on: (event: string, listener: Listener) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(listener);
  },
  off: (event: string, listener: Listener) => {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(l => l !== listener);
  },
  emit: (event: string) => {
    if (!listeners[event]) return;
    listeners[event].forEach(l => l());
  },
};
