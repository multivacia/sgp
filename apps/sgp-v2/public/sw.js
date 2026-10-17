// Service worker mínimo: só torna o SGP+ V2 instalável. Não guarda dados em cache (sem modo offline nesta fase).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
