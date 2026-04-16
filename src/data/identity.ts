import type { DatabaseContext } from '../db/database';

const STEAM_ACCOUNT_ID_OFFSET = 76561197960265728n;

export interface PlayerIdentity {
  steamId64: string;
  accountId: number;
  source: 'formula' | 'steam_api' | 'cached';
  resolvedAt: string;
}

function assertSteamId64(steamId64: string): bigint {
  if (!/^\d+$/.test(steamId64)) {
    throw new Error(`Invalid steamId64: ${steamId64}`);
  }

  return BigInt(steamId64);
}

function convertSteamId64ToAccountId(steamId64: string): number {
  const parsedSteamId = assertSteamId64(steamId64);
  const accountId = parsedSteamId - STEAM_ACCOUNT_ID_OFFSET;

  if (accountId < 0n || accountId > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`SteamID64 is out of account_id range: ${steamId64}`);
  }

  return Number(accountId);
}

export function resolvePlayerIdentity(
  dbContext: DatabaseContext,
  steamId64: string
): PlayerIdentity {
  const selectStatement = dbContext.db.prepare<
    [string],
    {
      account_id: number;
      resolved_at: string;
      source: PlayerIdentity['source'];
    } | undefined
  >(
    `SELECT account_id, source, resolved_at
     FROM steam_identity_map
     WHERE steam_id64 = ?`
  );

  const cached = selectStatement.get(steamId64);
  if (cached) {
    return {
      steamId64,
      accountId: cached.account_id,
      source: 'cached',
      resolvedAt: cached.resolved_at
    };
  }

  const resolvedAt = new Date().toISOString();
  const identity: PlayerIdentity = {
    steamId64,
    accountId: convertSteamId64ToAccountId(steamId64),
    source: 'formula',
    resolvedAt
  };

  const upsertStatement = dbContext.db.prepare(
    `INSERT INTO steam_identity_map (steam_id64, account_id, source, resolved_at)
     VALUES (@steamId64, @accountId, @source, @resolvedAt)
     ON CONFLICT(steam_id64) DO UPDATE SET
       account_id = excluded.account_id,
       source = excluded.source,
       resolved_at = excluded.resolved_at`
  );

  upsertStatement.run(identity);

  return identity;
}

