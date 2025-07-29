// Lightweight browser/logger utility
// Usage: import logger from '@/utils/logger'; logger.info('message');

const endpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function send(level, message, stack = '') {
  try {
    // Fire-and-forget; don't await to avoid blocking UI
    fetch(`${endpoint}/client-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, stack }),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to send log', err);
  }
}

const logger = {
  debug: (...args) => {
    // eslint-disable-next-line no-console
    console.debug(...args);
  },
  info: (...args) => {
    // eslint-disable-next-line no-console
    console.info(...args);
    send('info', args.map(String).join(' '));
  },
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
    send('warn', args.map(String).join(' '));
  },
  error: (err, ...rest) => {
    // eslint-disable-next-line no-console
    console.error(err, ...rest);
    if (err instanceof Error) {
      send('error', err.message, err.stack);
    } else {
      send('error', rest.map(String).join(' '));
    }
  },
};

// Expose to window for easier debugging in the browser console
if (typeof window !== 'undefined') {
  window.logger = logger;
}

export default logger;
