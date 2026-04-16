# DotaPartner

当前版本用于验证 Dota 2 Overlay、GSI 本地收包和 Overlay 联动。

## 环境

- Windows 10 / 11
- Node.js `22.20.0`
- npm `10.9.3`

## 启动

首次安装依赖：

```cmd
npm install
```

正常启动：

```cmd
npm start
```

调试模式启动：

```cmd
npm run start:debugmodel
```

单独编译：

```cmd
npm run build
```

如果安装依赖后启动时报 `better-sqlite3` 与 Electron 版本不匹配，执行：

```cmd
npm run rebuild:native
```

## GSI 配置

项目内提供模板：

`config/gamestate_integration_dotapartner.cfg`

需要复制到 Dota 2 目录：

```text
Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
```

已验证：

- 配置文件需要放在 `cfg/gamestate_integration/` 子目录下
- 当前环境下不需要额外配置 `-gamestateintegration` 启动参数
- 回调地址固定为 `http://127.0.0.1:3001/gsi`

## 当前能力

- 启动置顶 Overlay 窗口
- 本地监听 `127.0.0.1:3001/gsi`
- 收到 GSI payload 后更新 Overlay
- 最新 payload 写入 `tmp/gsi-latest.json`
- `Ctrl+Shift+Q` 退出应用

## 最小排障

- `GSI listening on 3001` 但 `DATA no data`：
  先检查 GSI 配置文件是否放在 `game/dota/cfg/gamestate_integration/`
- 手动验证本地接收器：

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3001/gsi -ContentType "application/json" -Body '{"map":{"game_state":"DOTA_GAMERULES_STATE_GAME_IN_PROGRESS","game_time":123},"hero":{"name":"npc_dota_hero_axe"},"player":{"name":"test"}}'
```
