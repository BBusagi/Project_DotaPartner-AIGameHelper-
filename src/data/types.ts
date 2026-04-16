export type GSIEventType =
  | 'draft_update'
  | 'state_transition'
  | 'player_update'
  | 'hero_update'
  | 'inventory_update'
  | 'heartbeat';

export interface DraftTeam {
  [key: string]: Record<string, number | boolean>;
}

export interface LocalGSIPayload {
  provider?: {
    name?: string;
    appid?: number;
    version?: number;
    timestamp?: number;
  };
  map?: {
    matchid?: string;
    game_time?: number;
    clock_time?: number;
    daytime?: boolean;
    game_state?:
      | 'DOTA_GAMERULES_STATE_HERO_SELECTION'
      | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
      | 'DOTA_GAMERULES_STATE_POST_GAME'
      | string;
    paused?: boolean;
    win_team?: string;
    customgamename?: string;
  };
  player?: {
    steamid?: string;
    name?: string;
    team_name?: string;
    activity?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    last_hits?: number;
    denies?: number;
    kill_streak?: number;
    commands_issued?: number;
    kill_list?: Record<string, number>;
    gold?: number;
    gold_reliable?: number;
    gold_unreliable?: number;
    gpm?: number;
    xpm?: number;
  };
  hero?: {
    id?: number;
    name?: string;
    level?: number;
    alive?: boolean;
    respawn_seconds?: number;
    buyback_cost?: number;
    buyback_cooldown?: number;
    health?: number;
    max_health?: number;
    health_percent?: number;
    mana?: number;
    max_mana?: number;
    mana_percent?: number;
  };
  items?: Record<
    string,
    {
      name?: string;
      contains_rune?: string;
      can_cast?: boolean;
      cooldown?: number;
      charges?: number;
      purchaser?: number;
    }
  >;
  draft?: {
    activeteam?: number;
    pick?: boolean;
    activeteam_time_remaining?: number;
    radiant_bonus_time?: number;
    dire_bonus_time?: number;
    team2?: DraftTeam;
    team3?: DraftTeam;
  };
  buildings?: Record<
    string,
    {
      health?: number;
      max_health?: number;
    }
  >;
}

export interface GSIEvent<T = LocalGSIPayload> {
  type: GSIEventType;
  timestamp: number;
  perspective: 'local_player';
  data: T;
}

export interface GSISummary {
  gameState: string;
  gameTime: number | null;
  heroName: string;
  playerName: string;
}

export interface OverlaySystemState {
  dotaRunning: boolean;
  gsiListening: boolean;
  hasData: boolean;
  gsiPort: number;
}

export interface OverlayState {
  connected: boolean;
  lastUpdated: string | null;
  system: OverlaySystemState;
  summary: GSISummary;
}

