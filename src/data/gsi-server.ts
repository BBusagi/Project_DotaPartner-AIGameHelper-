import fs from 'fs';
import http, { IncomingMessage, Server, ServerResponse } from 'http';
import path from 'path';
import type { GSIEvent, GSISummary, LocalGSIPayload } from './types';

export const DEFAULT_GSI_PORT = 3001;
export const DEFAULT_GSI_PATH = '/gsi';

export interface GSIServerOptions {
  port?: number;
  onError?: (error: Error & { code?: string }) => void;
  onEvent?: (event: GSIEvent, summary: GSISummary) => void;
  onListening?: (info: { path: string; port: number }) => void;
}

export interface GSIServer extends Server {
  __gsiPort?: number;
}

function ensureDebugDir(): string {
  const dir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeLatestPayload(payload: LocalGSIPayload): void {
  const dir = ensureDebugDir();
  const filePath = path.join(dir, 'gsi-latest.json');
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function normalizePayload(payload: unknown): LocalGSIPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  return payload as LocalGSIPayload;
}

function inferEventType(payload: LocalGSIPayload): GSIEvent['type'] {
  if (payload.draft) {
    return 'draft_update';
  }

  if (payload.items) {
    return 'inventory_update';
  }

  if (payload.hero) {
    return 'hero_update';
  }

  if (payload.player) {
    return 'player_update';
  }

  if (payload.map?.game_state) {
    return 'state_transition';
  }

  return 'heartbeat';
}

export function summarizePayload(payload: LocalGSIPayload): GSISummary {
  return {
    gameState: payload.map?.game_state ?? 'unknown',
    gameTime: payload.map?.game_time ?? null,
    heroName: payload.hero?.name ?? 'unknown',
    playerName: payload.player?.name ?? payload.player?.steamid ?? 'unknown'
  };
}

function createEvent(payload: LocalGSIPayload): GSIEvent {
  return {
    type: inferEventType(payload),
    timestamp: Date.now(),
    perspective: 'local_player',
    data: payload
  };
}

function createRequestHandler(
  onEvent?: GSIServerOptions['onEvent']
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    if (request.method !== 'POST' || request.url !== DEFAULT_GSI_PATH) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }

    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const payload = normalizePayload(parsed);

        writeLatestPayload(payload);

        const event = createEvent(payload);
        const summary = summarizePayload(payload);

        onEvent?.(event, summary);

        console.log('[GSI] Event received:', {
          type: event.type,
          ...summary
        });
        console.log('[GSI] Full payload:');
        console.log(JSON.stringify(payload, null, 2));

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown parse error';
        console.error('[GSI] Failed to parse payload:', message);
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });

    request.on('error', (error) => {
      console.error('[GSI] Request stream error:', error.message);
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({ ok: false, error: 'Request stream error' })
      );
    });
  };
}

export function startGSIServer(options: GSIServerOptions = {}): GSIServer {
  const port = options.port ?? DEFAULT_GSI_PORT;
  const server = http.createServer(
    createRequestHandler(options.onEvent)
  ) as GSIServer;

  server.__gsiPort = port;

  server.listen(port, '127.0.0.1', () => {
    console.log(`[GSI] Listening on http://127.0.0.1:${port}${DEFAULT_GSI_PATH}`);
    console.log('[GSI] Latest payload file: tmp/gsi-latest.json');
    options.onListening?.({ port, path: DEFAULT_GSI_PATH });
  });

  server.on('error', (error: Error & { code?: string }) => {
    options.onError?.(error);

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

