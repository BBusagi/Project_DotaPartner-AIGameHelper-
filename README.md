# DotaPartner

当前仓库的第一阶段目标是验证 Dota 客户端上层显示能力。

## 开发环境
- Node.js `22.20.0`
- npm `10.9.3`

- 当前项目使用 Electron `30.5.1`

## 当前目标

1. Overlay 窗口显示 `HelloWorld`
2. GSI 本地收包
3. Overlay 与 GSI 联动

## 本地运行
初始化
```cmd
npm install
npm start
```

启动 debugmodel：
```cmd
npm run start:debugmodel
```

当前应用启动后会同时做两件事：

- 打开置顶 Overlay 窗口
- 在 `http://127.0.0.1:3001/gsi` 启动本地 GSI 服务

端口说明：

- GSI 默认使用固定端口 `3001`
- 如果端口已经被占用，应用会明确报错
- 当前版本不会自动切换到别的端口，因为 Dota 的 GSI 配置文件也必须和端口保持一致

## 当前实现

- Electron 最小应用
- 始终置顶窗口
- 默认模式下，Overlay 使用递进式精简 UI
- 本地 GSI HTTP 服务，默认监听 `127.0.0.1:3001/gsi`
- 收到 GSI payload 后打印摘要和完整 JSON
- 最新一份 payload 会写入 `tmp/gsi-latest.json`
- 默认模式会按流程提示：
  - 等待启动 Dota
  - Dota 已启动，等待游戏数据
  - GSI 已连接，显示当前简要信息
- `--debugmodel` 模式会额外显示完整系统状态：
  - Dota 是否运行
  - GSI 是否监听
  - 当前是否已收到数据
  - 玩家名、英雄名、游戏状态、游戏时间
- 单实例保护，避免重复启动导致端口冲突
- `Ctrl+Shift+Q` 退出应用

## GSI 配置

项目内已经提供 Dota 2 的 GSI 配置模板：

`config/gamestate_integration_dotapartner.cfg`

你可以把它复制到 Dota 2 的配置目录：

```text
Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
```

已验证：

- `gamestate_integration_dotapartner.cfg` 需要放在 `cfg/gamestate_integration/` 子目录下，放在 `cfg/` 根目录时，当前环境下 Dota 不会发送 GSI 数据
- 当前环境下未额外配置 `-gamestateintegration` 启动参数，也可以正常收到 GSI payload

模板中的回调地址是：

```text
http://127.0.0.1:3001/gsi
```

## 当前验证方式

第二个目标的验证标准是：

- Electron 应用运行时，本地 `3001` 端口可接收 GSI POST
- 收到 payload 后控制台能打印内容
- `tmp/gsi-latest.json` 会更新为最近一次收到的 payload
- Dota 侧配置文件已放入 `game/dota/cfg/gamestate_integration/`

第三个目标的验证标准是：

- 默认模式下：
  - Dota 未启动时，只显示“启动 Dota”的下一步提示
  - Dota 已启动但还没数据时，只显示“等待游戏数据”
  - 收到 GSI 后显示当前英雄和时间等简要信息
- Debugmodel 模式下：
  - 会额外显示 `Dota`、`GSI`、`Data` 三项系统状态
  - 会显示玩家名、英雄名、游戏状态和游戏时间

## 说明

- 当前版本是技术验证，不是最终产品 UI
- 当前版本已经具备最小 GSI 收包能力
- 当前版本已经具备最小 GSI 到 Overlay 的联动能力
- 如果进程被强制杀掉，系统来不及优雅释放端口，此时仍需要手动结束残留进程
