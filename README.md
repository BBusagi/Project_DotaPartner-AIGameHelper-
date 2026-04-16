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
- `Ctrl+Shift+Q` 退出应用

## 说明

- 当前版本是技术验证，不是最终产品 UI
- 当前版本还没有接入 GSI
