import { EventEmitter } from 'node:events';

// Bus d'événements central : la pipeline publie ici, le dashboard (SSE) et les
// logs s'y abonnent. Découplé de la base et du serveur (aucune dépendance).
class Bus extends EventEmitter {}
export const bus = new Bus();
bus.setMaxListeners(50);

// Anneau des derniers événements (pour rejouer l'historique à la connexion du dashboard)
const RING = [];
const RING_MAX = 400;

export function publish(kind, data = {}) {
  const evt = { kind, ...data, ts: Date.now() };
  RING.push(evt);
  if (RING.length > RING_MAX) RING.shift();
  bus.emit('evt', evt);
  return evt;
}

export function recent() {
  return RING.slice();
}
