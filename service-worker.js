// ============================================================================
// Service worker da porta do Refrigerista
// ============================================================================
// A versao anterior respondia `caches.match(req) || fetch(req)` — cache
// primeiro, para tudo. Enquanto isto era so uma calculadora offline, o efeito
// era invisivel. Agora nao: milhares de pessoas tem esta pagina instalada como
// atalho na tela inicial, e com a estrategia antiga elas continuariam abrindo a
// calculadora velha do cache para sempre, sem nunca ver a porta do iClima.
//
// O que mudou:
//   1. CACHE_NAME novo -> o conteudo antigo e descartado na ativacao.
//   2. Navegacao (abrir a pagina) vira NETWORK-FIRST: tenta a rede, e so cai no
//      cache se estiver sem internet. Assim toda atualizacao futura chega no
//      primeiro acesso online, e nao depende de mais um deploy de emergencia.
//   3. skipWaiting + clients.claim -> a versao nova assume no ato, em vez de
//      esperar a pessoa fechar todas as abas (num app instalado, isso pode
//      levar semanas).
//
// Mesmo assim existe um limite que nao da para contornar por codigo: o
// navegador so rebusca o proprio arquivo do service worker de tempos em tempos
// (ate 24h). A porta nao chega em todo mundo no mesmo minuto.
// ============================================================================

const CACHE_NAME = 'refrigerista-porta-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
];

self.addEventListener('install', (event) => {
  // Nao espera as abas antigas fecharem.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll falha inteiro se um CDN estiver fora do ar; um a um e tolerante.
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => null))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))),
      )
      // Assume o controle das paginas ja abertas.
      .then(() => self.clients.claim()),
  );
});

// A pagina pede a troca imediata quando detecta versao nova esperando.
self.addEventListener('message', (event) => {
  if (event.data && event.data.tipo === 'ASSUMIR_AGORA') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // Chamadas ao Supabase nunca passam pelo cache: a resposta de
  // resolver_identificador tem que ser sempre a de agora.
  if (req.url.includes('supabase.co')) return;

  const ehNavegacao =
    req.mode === 'navigate' ||
    (req.destination === 'document') ||
    (req.headers.get('accept') || '').includes('text/html');

  if (ehNavegacao) {
    // NETWORK-FIRST: a versao publicada ganha do que esta guardado.
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copia));
          return resp;
        })
        .catch(() =>
          caches
            .match('./index.html')
            .then((r) => r || caches.match(req))
            .then(
              (r) =>
                r ||
                new Response(
                  '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px"><div><h1 style="font-size:18px">Sem conexão</h1><p style="font-size:14px;color:#94a3b8">Abra de novo quando estiver com internet.</p></div>',
                  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                ),
            ),
        ),
    );
    return;
  }

  // Demais recursos (fontes, CSS, icones): cache primeiro, que e barato e
  // esses arquivos nao mudam.
  event.respondWith(
    caches.match(req).then(
      (cacheado) =>
        cacheado ||
        fetch(req).then((resp) => {
          if (resp && resp.status === 200) {
            const copia = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copia));
          }
          return resp;
        }),
    ),
  );
});
