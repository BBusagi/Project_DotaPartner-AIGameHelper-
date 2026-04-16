# DotaPartner — AGENTS.md

> 本文档是 DotaPartner 的开发约束文档。当前仓库仍处于规划阶段，后续实现应以本文档中的 MVP 边界、数据契约和模块职责为准，而不是以早期概念稿中的理想形态为准。

---

## 1. 项目定位

### 1.1 产品定义

DotaPartner 是一个基于 AI 的 Dota 2 战略助教桌面应用。

它只做策略层建议，不做自动操作，不读取游戏内存，不注入游戏进程。系统通过 Valve 官方 GSI、OpenDota 等公开数据源，结合统计分析和 LLM，总结出赛前和局内阶段性建议。

### 1.2 当前开发目标

当前目标不是一次做完整 10 人战局教练，而是先验证最小可行链路。

当前初期目标固定为 3 步：

1. 验证 Dota 客户端上层显示能力：显示 `HelloWorld`
2. 验证 GSI 本地通讯能力：接收并打印 payload
3. 验证 Overlay 与 GSI 联动能力：把接收到的数据显示到 Overlay

### 1.3 MVP 边界

| 范围 | MVP 是否支持 | 说明 |
|------|--------------|------|
| Overlay 基础显示验证 | 是 | 第一目标，先显示 `HelloWorld` |
| GSI 本地收包验证 | 是 | 第二目标，先打通本地通讯 |
| Overlay + GSI 联动验证 | 是 | 第三目标，先做最小联动闭环 |
| 赛前 Ban/Pick 建议 | 是 | 在初期 3 步验证通过后继续推进 |
| 对线期建议（0-10 分钟） | 是 | 基于本机玩家 GSI 视角 |
| 中后期全局节奏判断 | 否 | GSI 无法稳定提供完整 10 人经济和地图信息，放到 Phase 2 |
| 赛后复盘 | 否 | 放到 Phase 2 |
| 完整游戏内 Overlay 悬浮窗产品化 | 否 | MVP 前期只做技术验证，不做完整交互产品 |
| 多数据源融合（Stratz 深度分析） | 否 | 放到 Phase 2 |

### 1.4 核心原则

- 数据驱动优先，人工规则只做小范围校正
- 本机玩家视角优先，避免假设能实时拿到完整 10 人数据
- 接口先收敛，再扩展能力
- 版本隔离必须明确，禁止跨 patch 混算统计

---

## 2. 架构总览

### 2.1 MVP 架构

```
┌─────────────────────────────────────────────────────┐
│                 Electron Renderer                   │
│      DraftView / LiveView / SettingsView            │
└──────────────────────┬──────────────────────────────┘
                       │ Electron IPC
┌──────────────────────▼──────────────────────────────┐
│                  Electron Main App                  │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ GSI Server  │  │ Analysis     │  │ AI Advisor │ │
│  │ HTTP :3001  │  │ Engine       │  │            │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                │                │        │
│  ┌──────▼────────────────▼────────────────▼──────┐ │
│  │                SQLite Database                │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      OpenDota     Steam API    Anthropic
```

### 2.2 架构约束

- MVP 只使用 `Electron IPC` 作为主进程和渲染进程通信方式
- 不在 MVP 中引入 Redis
- 所有实时状态以主进程内存态为准，SQLite 只负责持久化缓存和统计数据
- 如果未来需要外部 Web 客户端，再额外增加 WebSocket 层，不提前设计

---

## 3. 领域边界与数据现实

### 3.1 必须接受的现实约束

Valve GSI 对单机客户端可见信息是有限的。对于本项目，必须默认以下结论成立：

- 可以稳定获得当前客户端所在玩家的英雄、物品、等级、金钱、对局时间、选人信息
- 不可以假设能稳定获得完整 10 名玩家的实时经济、经验和装备
- 不可以把“全局战局优势判断”建立在 GSI 必然存在的字段之上

### 3.2 因此带来的产品收敛

MVP 的局内建议聚焦于：

- 当前玩家英雄的对线节奏
- 当前玩家装备节点
- 当前阵容的赛前强弱趋势
- 基于时间和阵容的阶段性提醒

MVP 不承诺：

- 实时团队总经济差
- 实时团队经验差
- 全图敌我建筑精确统计
- 完整肉山窗口建模

这些能力只在 Phase 2 具备额外数据源或额外建模方案后再引入。

补充说明：

- 初期允许先做纯技术验证型 Overlay，不要求第一版就具备完整 UI
- 初期 Overlay 的目标是“能稳定显示在 Dota 上层”，不是“功能完整”

---

## 4. 模块设计

### 4.1 数据采集模块 (`/src/data/`)

#### 4.1.1 GSI 接收器 (`gsi-server.ts`)

职责：

- 在本地启动 HTTP 服务，默认端口 `3001`
- 接收 Dota 2 客户端推送的 GSI JSON
- 将原始负载标准化为统一事件
- 向分析模块发出本机玩家视角事件

推荐 GSI 配置文件路径：

`Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration_dotapartner.cfg`

推荐配置：

```cfg
"DotaPartner"
{
    "uri"           "http://127.0.0.1:3001/gsi"
    "timeout"       "5.0"
    "buffer"        "0.5"
    "throttle"      "1.0"
    "heartbeat"     "30.0"
    "data"
    {
        "provider"      "1"
        "map"           "1"
        "player"        "1"
        "hero"          "1"
        "abilities"     "1"
        "items"         "1"
        "draft"         "1"
        "buildings"     "1"
    }
}
```

标准化事件接口：

```ts
type GSIEventType =
  | 'draft_update'
  | 'state_transition'
  | 'player_update'
  | 'hero_update'
  | 'inventory_update'
  | 'heartbeat';

interface GSIEvent<T = LocalGSIPayload> {
  type: GSIEventType;
  timestamp: number;
  perspective: 'local_player';
  data: T;
}

interface LocalGSIPayload {
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
      | 'DOTA_GAMERULES_STATE_POST_GAME';
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
  items?: Record<string, {
    name?: string;
    contains_rune?: string;
    can_cast?: boolean;
    cooldown?: number;
    charges?: number;
    purchaser?: number;
  }>;
  draft?: {
    activeteam?: number;
    pick?: boolean;
    activeteam_time_remaining?: number;
    radiant_bonus_time?: number;
    dire_bonus_time?: number;
    team2?: DraftTeam;
    team3?: DraftTeam;
  };
  buildings?: Record<string, {
    health?: number;
    max_health?: number;
  }>;
}

interface DraftTeam {
  [key: string]: Record<string, number | boolean>;
}
```

实现要求：

- 原始 GSI 必须原样记录到 debug 日志，便于后续修订字段映射
- 事件发射前必须做去抖和字段归一化
- 分析层禁止直接依赖原始 GSI JSON

#### 4.1.2 历史数据采集器 (`data-fetcher.ts`)

职责：

- 拉取全局英雄统计
- 拉取高分段公开比赛样本
- 按比赛 ID 补齐逐场详情
- 拉取当前玩家历史数据和英雄池

MVP 使用的 OpenDota 端点：

```ts
const OPENDOTA_BASE = 'https://api.opendota.com/api';

GET /heroStats
GET /heroes/{hero_id}/matchups
GET /heroes/{hero_id}/durations
GET /publicMatches?min_rank=80
GET /matches/{match_id}
GET /players/{account_id}
GET /players/{account_id}/heroes
GET /players/{account_id}/recentMatches
```

说明：

- `/publicMatches` 用来发现高分段比赛样本
- `/matches/{match_id}` 才是逐场详情的主要来源
- `/parsedMatches` 不作为 MVP 主数据源，只能作为“已解析比赛 ID 列表”的可选辅助来源

刷新策略：

```ts
interface DataRefreshConfig {
  heroStats: { intervalHours: 24 };
  heroMatchups: { intervalHours: 24 };
  heroDurations: { intervalHours: 24 };
  publicMatchSeed: {
    intervalHours: 6;
    minRank: 80;
    lookbackDays: 21;
  };
  matchDetailsBackfill: {
    batchSize: 25;
    maxRequestsPerMinute: 50;
  };
  playerProfile: {
    trigger: 'on_app_start';
  };
}
```

#### 4.1.3 Steam 身份映射

问题：

- GSI 中是 `steamid`，通常为 SteamID64
- OpenDota 玩家接口使用 `account_id`

因此必须显式定义映射层，禁止在业务代码中散落转换逻辑。

```ts
interface PlayerIdentity {
  steamId64: string;
  accountId: number;
  source: 'formula' | 'steam_api' | 'cached';
  resolvedAt: string;
}
```

默认转换规则：

`account_id = Number(steamid64) - 76561197960265728`

实现要求：

- 启动时优先从缓存读取
- 缓存没有时才做转换或调用外部接口校验
- 后续所有 OpenDota 调用只使用 `account_id`

---

### 4.2 数据分析模块 (`/src/analysis/`)

#### 4.2.1 英雄分析器 (`hero-analyzer.ts`)

职责：

- 基于最近 21 天的高分段样本，计算英雄克制、时长曲线和基础趋势
- 对低样本结果计算置信度
- 产出可给选人分析直接消费的结构化数据

```ts
type HeroId = number;
type HeroPair = `${number}:${number}`;

interface HeroMatchupStat {
  winRate: number;
  sampleSize: number;
  confidence: number;
}

interface HeroDurationCurve {
  timeSlots: Array<{
    minute: number;
    winRate: number;
    sampleSize: number;
  }>;
  peakTiming: number;
  falloffTiming: number | null;
  archetype: 'early' | 'mid' | 'late' | 'flat';
}

interface HeroTrend {
  heroId: HeroId;
  pickRate: number;
  banRate: number;
  winRate: number;
  winRateChange: number;
  trending: 'rising' | 'falling' | 'stable';
}

interface HeroAnalysis {
  matchupMatrix: Map<HeroId, Map<HeroId, HeroMatchupStat>>;
  durationCurves: Map<HeroId, HeroDurationCurve>;
  synergyMatrix: Map<HeroPair, {
    combinedWinRate: number;
    sampleSize: number;
    confidence: number;
  }>;
  metaTrends: HeroTrend[];
}
```

约束：

- `laneWinRate` 不属于 MVP 核心字段，只有数据源足够可靠时才新增
- 所有统计结果必须携带 `sampleSize`
- 低于阈值的组合默认不进入推荐主路径

#### 4.2.2 阵容分析器 (`draft-analyzer.ts`)

职责：

- 评估双方已选阵容的强弱
- 结合玩家英雄池生成推荐英雄
- 输出明确的“建议视角”

```ts
type TeamSide = 'radiant' | 'dire';

interface PlayerHeroStat {
  heroId: HeroId;
  games: number;
  winRate: number;
  comfort: number;
}

interface CompositionTraits {
  pushPower: number;
  teamfightPower: number;
  splitPushPower: number;
  pickOffPower: number;
  latePotential: number;
  laneDominance: number;
}

interface DraftRecommendation {
  heroId: HeroId;
  reason: string;
  expectedWinRate: number;
  playerComfort: number;
  compositeScore: number;
}

interface DraftResult {
  perspectiveTeam: TeamSide;
  radiantScore: number;
  direScore: number;
  radiantTraits: CompositionTraits;
  direTraits: CompositionTraits;
  recommendations: DraftRecommendation[];
  timingAdvantage: {
    earlyGame: TeamSide | 'even';
    midGame: TeamSide | 'even';
    lateGame: TeamSide | 'even';
    optimalGameLengthForPerspective: number | null;
  };
}

interface DraftAnalyzer {
  analyze(input: {
    perspectiveTeam: TeamSide;
    radiantPicks: HeroId[];
    direPicks: HeroId[];
    playerHeroPool?: PlayerHeroStat[];
  }): DraftResult;
}
```

约束：

- `recommendations` 始终针对 `perspectiveTeam`
- 所有推荐分数必须可解释，至少拆解为统计分和熟练度分

#### 4.2.3 实时局势分析器 (`game-analyzer.ts`)

职责：

- 基于本机玩家 GSI 生成“局部可信”的对线期快照
- 检测当前玩家的关键装备和等级节点
- 提供 AI 层可消费的低歧义上下文

```ts
type GamePhase = 'draft' | 'laning' | 'transition' | 'post_game';

interface LaningSnapshot {
  gameTime: number;
  phase: GamePhase;
  perspectiveTeam: TeamSide | null;
  localHeroId: HeroId | null;
  localLevel: number | null;
  localGold: number | null;
  gpm: number | null;
  xpm: number | null;
  lastHits: number | null;
  denies: number | null;
  inventory: string[];
  keyEvents: Array<{
    type: 'level_power_spike' | 'key_item' | 'death' | 'low_resource' | 'timing_reminder';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  assessment: {
    laneState: 'ahead' | 'even' | 'behind' | 'unknown';
    urgency: number;
  };
}
```

明确不做：

- 不在 MVP 中输出 `teamGoldAdvantage`
- 不在 MVP 中输出 `teamXPAdvantage`
- 不在 MVP 中输出全队建筑计数
- 不在 MVP 中输出“稳赢/必输”这类高幻觉结论

#### 4.2.4 玩家风格分析器 (`player-analyzer.ts`)

职责：

- 从玩家最近比赛中提取英雄池和风格特征
- 为赛前推荐提供 `comfort` 权重

```ts
interface PlayerProfile {
  steamId64: string;
  accountId: number;
  playstyle: {
    aggression: number;
    farmFocus: number;
    earlyGameImpact: number;
    versatility: number;
    consistency: number;
  };
  heroPool: Array<{
    heroId: HeroId;
    games: number;
    winRate: number;
    comfort: number;
    recentPerformance: number;
  }>;
  rolePreference: {
    carry: number;
    mid: number;
    offlane: number;
    softSupport: number;
    hardSupport: number;
  };
}
```

---

### 4.3 AI 推理模块 (`/src/ai/`)

#### 4.3.1 建议生成器 (`advisor.ts`)

职责：

- 接收分析层产物
- 调用 LLM 输出结构化建议
- 对建议去重和节流

建议不要直接返回裸字符串，而是返回结构化建议对象，便于 UI 渲染和历史记录。

```ts
interface AdviceItem {
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

interface AdviceBundle {
  topic: 'draft' | 'laning' | 'alert';
  generatedAt: string;
  items: AdviceItem[];
  rawText: string;
}

interface AdvisorConfig {
  model: string;
  maxTokens: 800;
  temperature: 0.3;
}

class Advisor {
  async getDraftAdvice(
    draft: DraftResult,
    playerProfile: PlayerProfile
  ): Promise<AdviceBundle>;

  async getLaningAdvice(
    snapshot: LaningSnapshot,
    draft: DraftResult | null,
    playerProfile: PlayerProfile | null,
    previousAdvice?: string[]
  ): Promise<AdviceBundle>;
}
```

系统提示原则：

- 使用中文输出
- 一次最多 3 条建议
- 必须给出可执行动作
- 必须避免伪造全局信息
- 当输入信息不足时，允许输出“保持观察/信息不足”

节流策略：

```ts
interface AdvisorThrottleConfig {
  draftPhase: { trigger: 'on_change' };
  laningPhase: { minIntervalMs: 120000 };
  criticalLocalEvent: { immediate: true };
}
```

---

### 4.4 数据存储 (`/src/db/`)

#### 4.4.1 Schema 设计要求

数据库必须具备以下能力：

- 能标记数据属于哪个 patch
- 能标记数据窗口起止时间
- 能缓存 SteamID64 和 account_id 的映射
- 能记录建议历史，便于后续去重和回放

建议 schema：

```sql
CREATE TABLE heroes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  localized_name TEXT NOT NULL,
  primary_attr TEXT,
  attack_type TEXT,
  roles_json TEXT NOT NULL
);

CREATE TABLE steam_identity_map (
  steam_id64 TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  resolved_at DATETIME NOT NULL
);

CREATE TABLE stat_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  patch TEXT NOT NULL,
  window_start DATETIME NOT NULL,
  window_end DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hero_matchups (
  stat_window_id INTEGER NOT NULL,
  hero_id INTEGER NOT NULL,
  against_hero_id INTEGER NOT NULL,
  win_rate REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  confidence REAL NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id, against_hero_id)
);

CREATE TABLE hero_synergies (
  stat_window_id INTEGER NOT NULL,
  hero_id_1 INTEGER NOT NULL,
  hero_id_2 INTEGER NOT NULL,
  combined_win_rate REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  confidence REAL NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id_1, hero_id_2)
);

CREATE TABLE hero_duration_curves (
  stat_window_id INTEGER NOT NULL,
  hero_id INTEGER NOT NULL,
  minute_bucket INTEGER NOT NULL,
  win_rate REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id, minute_bucket)
);

CREATE TABLE meta_stats (
  stat_window_id INTEGER NOT NULL,
  hero_id INTEGER NOT NULL,
  pick_rate REAL NOT NULL,
  ban_rate REAL NOT NULL,
  win_rate REAL NOT NULL,
  win_rate_prev_week REAL,
  trending TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_window_id, hero_id)
);

CREATE TABLE player_cache (
  steam_id64 TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  profile_json TEXT NOT NULL,
  hero_pool_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE match_samples (
  match_id BIGINT PRIMARY KEY,
  patch TEXT,
  avg_rank_tier INTEGER,
  duration INTEGER,
  radiant_win BOOLEAN,
  radiant_heroes_json TEXT NOT NULL,
  dire_heroes_json TEXT NOT NULL,
  match_json TEXT NOT NULL,
  start_time DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advice_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  match_id TEXT,
  game_time INTEGER,
  advice_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. 前端展示层 (`/src/ui/`)

### 5.1 MVP 技术选型

- Electron + React + TypeScript
- Tailwind CSS
- Zustand
- Electron IPC

### 5.2 初期页面结构

初期验证阶段：

```
App
└── OverlayHelloWorld
```

在完成前 3 个初期目标后，再扩展到 MVP 页面结构：

```
App
├── DraftView
│   ├── HeroGrid
│   ├── DraftSummary
│   └── AdvicePanel
├── LiveView
│   ├── StatusBar
│   ├── LocalHeroPanel
│   └── AdvicePanel
└── SettingsView
    ├── APIKeys
    ├── PlayerLink
    └── Preferences
```

### 5.3 Electron 安全约束

MVP 不使用 `nodeIntegration: true`。

推荐配置：

```ts
const mainWindow = new BrowserWindow({
  width: 1280,
  height: 840,
  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

说明：

- 技术验证型 Overlay 在初期目标中立即实现
- 完整产品化 Overlay 能力仍放在 Phase 2

---

## 6. 项目结构

```text
dotapartner/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── electron-builder.json
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── preload.ts
│   │   └── ipc.ts
│   ├── data/
│   │   ├── gsi-server.ts
│   │   ├── data-fetcher.ts
│   │   ├── data-refresh.ts
│   │   └── types.ts
│   ├── analysis/
│   │   ├── hero-analyzer.ts
│   │   ├── draft-analyzer.ts
│   │   ├── game-analyzer.ts
│   │   ├── player-analyzer.ts
│   │   └── stat-utils.ts
│   ├── ai/
│   │   ├── advisor.ts
│   │   ├── prompts.ts
│   │   └── throttle.ts
│   ├── db/
│   │   ├── schema.sql
│   │   ├── database.ts
│   │   └── migrations/
│   └── ui/
│       ├── App.tsx
│       ├── views/
│       ├── components/
│       ├── stores/
│       └── styles/
├── scripts/
│   ├── fetch-initial-data.ts
│   └── compute-stats.ts
└── config/
    └── gamestate_integration_dotapartner.cfg
```

---

## 7. 开发路线图

### 7.1 路线原则

- 先打通数据闭环，再做 UI 丰富度
- 先做 deterministic 分析，再接入 LLM 建议
- 每个 milestone 都必须有可演示结果，不接受“代码已写完但无法跑通”
- 未完成前置 milestone，不开启后续扩展功能

### 7.2 推荐节奏

如果按单人开发节奏推进，建议先完成 3 个初期 milestone，再进入完整 MVP，整体以 6-8 周为目标：

| Milestone | 周期 | 目标 |
|-----------|------|------|
| M0 | 1-2 天 | Overlay HelloWorld 验证 |
| M1 | 1-2 天 | GSI 本地收包验证 |
| M2 | 1-2 天 | Overlay 与 GSI 联动验证 |
| M3 | 2-3 天 | 项目脚手架和开发基线 |
| M4 | 4-5 天 | 数据库与身份映射闭环 |
| M5 | 4-6 天 | OpenDota 采集和统计原料入库 |
| M6 | 4-5 天 | GSI 实时输入和本机玩家快照 |
| M7 | 5-7 天 | Draft/Laning 分析与建议链路 |
| M8 | 4-6 天 | MVP UI 集成与端到端联调 |
| M9 | 3-5 天 | 稳定性、日志、打包和发布准备 |

### 7.3 Milestone 详情

#### M0 — Overlay HelloWorld 验证

目标：

- 启动一个 Electron 置顶窗口
- 验证窗口能显示在 Dota 客户端上层
- 窗口内容固定显示 `HelloWorld`

交付物：

- 最小 Electron 应用
- 置顶 Overlay 窗口
- `HelloWorld` 静态渲染

验收标准：

- 本地运行后可以看到窗口显示 `HelloWorld`
- 窗口具备 `alwaysOnTop`
- 在 Dota 客户端打开时可人工验证是否能浮在上层

#### M1 — GSI 本地收包验证

目标：

- 建立本地 HTTP 服务
- 接收 GSI payload
- 打印和留存原始数据

交付物：

- 最小 GSI server
- 原始 payload 日志
- GSI 模板配置文件

验收标准：

- 本地 HTTP 服务可接收 POST 请求
- 能把 payload 打到控制台或日志文件

依赖：

- M0

#### M2 — Overlay 与 GSI 联动验证

目标：

- 把 GSI 收到的最小字段传给 Overlay
- Overlay 渲染实时文本

交付物：

- 主进程到渲染进程的联动链路
- 实时文本更新示例

验收标准：

- 模拟或真实 GSI 数据变化时，Overlay 文本会更新

依赖：

- M0
- M1

#### M3 — 项目基线

目标：

- 初始化 Electron + React + TypeScript 项目结构
- 建立 `src/main`、`src/ui`、`src/data`、`src/analysis`、`src/ai`、`src/db`
- 配置 lint、format、基础 tsconfig、环境变量加载
- 建立 preload + IPC 基础通信

交付物：

- 可启动的空白 Electron 主窗口
- 基础目录和占位模块
- `.env.example`
- README 启动说明

验收标准：

- 本地执行开发命令后可以打开应用窗口
- 渲染进程可以通过 preload 调用主进程的一个测试 IPC

#### M4 — 数据底座

目标：

- 落地 SQLite 封装
- 建立 schema 和 migration 机制
- 完成 `steamid64 -> account_id` 映射层
- 完成玩家缓存表和 stat window 表

交付物：

- `database.ts`
- `schema.sql` 或初始 migration
- `identity` 解析模块

验收标准：

- 首次启动可自动初始化数据库
- 给定一个 `steamid64`，可以产出并缓存 `account_id`
- 所有基础表可被正确创建

依赖：

- M3

#### M5 — 统计原料采集

目标：

- 对接 OpenDota 基础端点
- 拉取 `heroStats`、`matchups`、`durations`
- 通过 `publicMatches` 获取高分段样本
- 通过 `matches/{match_id}` 回填逐场详情到 `match_samples`

交付物：

- `data-fetcher.ts`
- `data-refresh.ts`
- 首次数据初始化脚本

验收标准：

- 可以成功写入英雄基础数据
- 可以写入至少一批高分段比赛样本
- 可以从数据库读出某个英雄的 matchup 和 duration 原始统计

依赖：

- M4

#### M6 — 实时输入链路

目标：

- 实现 GSI HTTP 服务
- 标准化 GSI 事件
- 基于本机玩家视角生成 `LaningSnapshot`
- 建立 debug 日志和原始 payload 留存

交付物：

- `gsi-server.ts`
- `types.ts`
- `game-analyzer.ts` 的初版快照逻辑

验收标准：

- 本地 HTTP 服务可接收 Dota GSI 请求
- 模拟 payload 可生成标准化事件
- 可以稳定输出本机玩家对线期快照

依赖：

- M3

#### M7 — 分析和建议主链路

目标：

- 实现 `hero-analyzer.ts`
- 实现 `draft-analyzer.ts`
- 实现 `player-analyzer.ts`
- 接入 `advisor.ts`，输出结构化建议

交付物：

- 赛前推荐逻辑
- 对线期建议逻辑
- LLM prompt 和节流模块

验收标准：

- 给定 mock draft 输入，可以输出 `DraftResult`
- 给定 `LaningSnapshot`，可以输出结构化建议
- 同一状态下不会高频重复触发相同建议

依赖：

- M2
- M5
- M6

#### M8 — UI 集成与 MVP 演示

目标：

- 完成 `DraftView`
- 完成 `LiveView`
- 完成 `SettingsView`
- 打通 UI -> IPC -> analysis/ai -> UI 回显的链路

交付物：

- 可演示的 MVP 界面
- 建议面板、状态栏、玩家设置

验收标准：

- 在无真实比赛时可以通过 mock 数据演示完整流程
- 在真实 GSI 接入时可以看到实时状态更新
- Draft 和 Live 两个主视图都能稳定显示建议

依赖：

- M1
- M4
- M6
- M7

#### M9 — 发布准备

目标：

- 补齐错误处理、日志和配置校验
- 增加基础集成测试或 smoke test
- 增加打包配置
- 输出 MVP 使用说明

交付物：

- 打包脚本
- 日志与错误提示机制
- 运行与调试文档

验收标准：

- 缺失 API key 时能给出明确提示
- 数据采集失败不会导致应用直接崩溃
- 可以构建出可分发的桌面安装包或 unpacked 产物

依赖：

- M8

### 7.4 Phase 对应关系

#### Phase 1 — MVP

包含：

- M0
- M1
- M2
- M3
- M4
- M5
- M6
- M7
- M8
- M9

Phase 1 完成定义：

- 可以完成从 Overlay HelloWorld、GSI 收包、Overlay 联动验证，到玩家身份绑定、统计数据初始化、GSI 接入、赛前建议生成和对线期建议展示的全链路演示

#### Phase 2 — 扩展

候选范围：

- Stratz 集成
- 更多装备与时间节点提醒
- Overlay 悬浮窗
- 赛后复盘
- 建议历史回顾
- 更强的中后期建模

Phase 2 开启条件：

- Phase 1 已稳定可运行
- 已完成至少一次真实对局验证
- 已确认 GSI 与 OpenDota 的现有数据闭环足够稳定

#### Phase 3 — 优化

候选范围：

- 建议质量评估
- 人工规则管理
- 多语言支持
- 更细粒度的个性化推荐
- 性能优化和成本优化

### 7.5 当前建议的执行顺序

1. 先完成 `M0 + M1 + M2`，确认技术验证链路可行
2. 然后完成 `M3 + M4`，建立不会返工的基础设施
3. 再并行推进 `M5` 和 `M6`
4. 在 `M5 + M6` 完成后集中做 `M7`
5. `M7` 跑通后再做 `M8`
6. 最后收口 `M9`

### 7.6 每个 Milestone 必须产出的文档

- 范围说明：这次做什么，不做什么
- 接口清单：新增模块、类型、IPC、表结构
- 验收记录：如何验证已完成
- 风险记录：有哪些已知缺口留到下一阶段

---

## 8. 环境与依赖

### 8.1 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 20+ |
| 语言 | TypeScript 5.x |
| 桌面框架 | Electron 30+ |
| 前端 | React 18 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 数据库 | better-sqlite3 |
| GSI HTTP 服务 | Express |
| HTTP 客户端 | axios |
| LLM SDK | `@anthropic-ai/sdk` |
| 构建 | electron-builder |

### 8.2 环境变量

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENDOTA_API_KEY=
STEAM_API_KEY=
```

---

## 9. 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 产品边界 | 先做赛前 + 对线期 | 这是当前最容易形成数据闭环的范围 |
| 战局视角 | 本机玩家视角 | GSI 对完整 10 人实时信息支持不足 |
| 存储 | SQLite | 本地桌面应用，部署成本最低 |
| 进程通信 | IPC | Electron 单体应用不需要先引入 WebSocket |
| 数据窗口 | 最近 21 天 | 平衡 patch 时效性和样本量 |
| 统计隔离 | 按 patch 和窗口存储 | 避免跨版本混算 |
| 建议输出 | 结构化对象 + 原始文本 | 既方便渲染，也方便追踪和回放 |

---

## 10. 注意事项

- 合规性优先：只使用 Valve 官方 GSI 和公开 API
- 不要在文档或代码里假设能拿到完整 10 人实时经济
- 低样本统计必须降权或剔除
- 每条 AI 建议都必须可追溯到输入上下文
- 大版本更新后，旧 `stat_window` 需要显式失效或降级
