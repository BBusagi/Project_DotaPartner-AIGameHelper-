const fs = require('fs');
const path = require('path');
const http = require('http');

const DEFAULT_GSI_PORT = 3001;
const DEFAULT_GSI_PATH = '/gsi';

function ensureDebugDir() {
  const dir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeLatestPayload(payload) {
  const dir = ensureDebugDir();
  const filePath = path.join(dir, 'gsi-latest.json');

  fs.writeFileSync(
    filePath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

function summarizePayload(payload) {
  const gameState = payload?.map?.game_state || 'unknown';
  const gameTime = payload?.map?.game_time ?? 'n/a';
  const heroName = payload?.hero?.name || 'unknown';
  const playerName = payload?.player?.name || payload?.player?.steamid || 'unknown';

  return {
    gameState,
    gameTime,
    heroName,
    playerName
  };
}

function createRequestHandler(onPayload) {
  return (request, response) => {
    if (request.method !== 'POST' || request.url !== DEFAULT_GSI_PATH) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }

    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        writeLatestPayload(payload);

        const summary = summarizePayload(payload);
        if (typeof onPayload === 'function') {
          onPayload(payload, summary);
        }

        console.log('[GSI] Payload received:', summary);
        console.log('[GSI] Full payload:');
        console.log(JSON.stringify(payload, null, 2));

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
      } catch (error) {
        console.error('[GSI] Failed to parse payload:', error.message);
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });

    request.on('error', (error) => {
      console.error('[GSI] Request stream error:', error.message);
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'Request stream error' }));
    });
  };
}

function startGSIServer(options = {}) {
  const port = options.port || DEFAULT_GSI_PORT;
  const onPayload = options.onPayload;
  const onListening = options.onListening;
  const onError = options.onError;
  const server = http.createServer(createRequestHandler(onPayload));
  server.__gsiPort = port;

  server.listen(port, '127.0.0.1', () => {
    console.log(`[GSI] Listening on http://127.0.0.1:${port}${DEFAULT_GSI_PATH}`);
    console.log('[GSI] Latest payload file: tmp/gsi-latest.json');
    if (typeof onListening === 'function') {
      onListening({ port, path: DEFAULT_GSI_PATH });
    }
  });

  server.on('error', (error) => {
    if (typeof onError === 'function') {
      onError(error);
    }

    if (error.code === 'EADDRINUSE') {
      console.error(
        `[GSI] Port ${port} is already in use. ` +
        'Another DotaPartner instance or another local service is already listening.'
      );
      return;
    }

    console.error('[GSI] Server error:', error.message);
  });

  return server;
}

module.exports = {
  DEFAULT_GSI_PATH,
  DEFAULT_GSI_PORT,
  summarizePayload,
  startGSIServer
};
