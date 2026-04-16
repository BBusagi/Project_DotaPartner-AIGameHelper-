# DotaPartner

当前仓库的第一阶段目标是验证 Dota 客户端上层显示能力。

## 开发环境

当前仓库按以下环境开发和验证：

- Windows 10 / 11
- Node.js `22.20.0`
- npm `10.9.3`

说明：

- 当前项目使用 Electron `30.5.1`
- 不建议继续使用 Node `14.x` 运行本项目
- 如果机器上有多个 Node 版本，建议使用 `nvm` 切换到 `22.20.0`

切换示例：

```cmd
nvm use 22.20.0
```

## 当前目标

1. Overlay 窗口显示 `HelloWorld`
2. GSI 本地收包
3. Overlay 与 GSI 联动

## 本地运行

先确认版本：

```cmd
node -v
npm -v
```

预期版本：

```bash
v22.20.0
10.9.3
```

先安装依赖：

```cmd
npm install
```

启动第一个目标：

```cmd
npm start
```

当前应用启动后会同时做两件事：

- 打开置顶 Overlay 窗口
- 在 `http://127.0.0.1:3001/gsi` 启动本地 GSI 服务

端口说明：

- GSI 默认使用固定端口 `3001`
- 如果端口已经被占用，应用会明确报错
- 当前版本不会自动切换到别的端口，因为 Dota 的 GSI 配置文件也必须和端口保持一致

如果之前曾在旧版 Node 环境下安装过依赖，先清理再重装：

```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

## 当前实现

- Electron 最小应用
- 始终置顶窗口
- Overlay 页面显示 `HelloWorld`
- 本地 GSI HTTP 服务，默认监听 `127.0.0.1:3001/gsi`
- 收到 GSI payload 后打印摘要和完整 JSON
- 最新一份 payload 会写入 `tmp/gsi-latest.json`
- 单实例保护，避免重复启动导致端口冲突
- `Ctrl+Shift+Q` 退出应用

## GSI 配置

项目内已经提供 Dota 2 的 GSI 配置模板：

`config/gamestate_integration_dotapartner.cfg`

你可以把它复制到 Dota 2 的配置目录：

```text
Steam/steamapps/common/dota 2 beta/game/dota/cfg/
```

模板中的回调地址是：

```text
http://127.0.0.1:3001/gsi
```

## 当前验证方式

第二个目标的验证标准是：

- Electron 应用运行时，本地 `3001` 端口可接收 GSI POST
- 收到 payload 后控制台能打印内容
- `tmp/gsi-latest.json` 会更新为最近一次收到的 payload

## 说明

- 当前版本是技术验证，不是最终产品 UI
- 当前版本已经具备最小 GSI 收包能力
- 当前版本还没有把 GSI 数据显示到 Overlay，这会在第三个目标实现
- 如果进程被强制杀掉，系统来不及优雅释放端口，此时仍需要手动结束残留进程
