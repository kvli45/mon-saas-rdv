export function log(...args) {
  const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  console.log(`[${ts}]`, ...args);
}

export function logError(...args) {
  const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  console.error(`[${ts}] ❌`, ...args);
}
