import { publish } from './bus.js';

export function log(...args) {
  const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  console.log(`[${ts}]`, ...args);
  publish('log', { level: 'info', msg: args.join(' ') });
}

export function logError(...args) {
  const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  console.error(`[${ts}] ❌`, ...args);
  publish('log', { level: 'error', msg: args.join(' ') });
}
