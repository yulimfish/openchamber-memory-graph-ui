# openchamber-memory-graph-ui

**简体中文** | [English](README.md)

一个 [OpenChamber](https://openchamber.dev) 扩展，可将本地
[`opencode-mem`](https://github.com/yulimfish/opencode-mem) 记忆库接入 OpenChamber，
以侧栏面板和全屏页面的形式提供浏览、搜索、编辑和删除记忆、探索稳定的交互式
记忆与提示词图谱，以及查看分组用户画像的功能。

- **面板 + 页面**：紧凑的侧栏面板用于快速查找；全屏页面（OpenChamber → *扩展页面*）
  是主要的图谱工作区。
- **仅限本地**：所有通信都通过经过身份验证的内置本地服务连接到
  `http://127.0.0.1:4747`。不需要账户、无遥测、无 CDN 资源。

## 与 opencode-mem 配合使用

[`opencode-mem`](https://github.com/yulimfish/opencode-mem) 是记忆系统核心：它负责存储、
捕获、检索/注入，以及独立的完整管理 Web UI。本扩展是其 OpenChamber 配套扩展，
提供一个可在当前上下文中浏览、搜索、管理记忆和探索图谱的界面。它通过经过身份验证的
本地 API 使用相同的记忆数据；不会创建单独的数据存储，也不会取代插件的核心行为。
两个界面可单独使用，也可同时使用。

## 前置条件

- OpenChamber ≥ 1.24.0（桌面版或 Web 版）
- 正在运行并启用了 `opencode-mem` 插件的 OpenCode，且设置了 `webServerEnabled: true`
  （默认端口为 `4747`）
- 扩展的 **local-service** 权限（安装时请求一次）

`>=1.24.0` 是扩展清单中声明的最低版本。当前基于 SDK 2.5.2 构建的产物尚未在
OpenChamber 1.24.0 或 1.24.2 运行时验证。

## 安装

1. 在 OpenChamber 中打开 **设置 → 扩展**。
2. 将以下地址之一粘贴到 *文件夹、ZIP 或 URL*，然后选择 **添加**：

   ```text
   https://github.com/yulimfish/openchamber-memory-graph-ui.git
   ```

   或用于开发的本地检出目录：

   ```text
   /Users/you/path/to/openchamber-memory-graph-ui
   ```

3. 批准唯一一项权限：**运行本地服务** → *允许并启用*。

右侧侧栏会出现 **Memory Graph** 图标；会话列表上方的 **扩展页面** 中会出现全屏页面。

## 构建（开发）

```bash
bun install
bun run check   # bun test && tsc --noEmit && build panel + service
```

构建产物（`panel/main.js`、`service/main.js`）已提交，因此通过 Git 或文件夹安装时无需构建。
编辑 TypeScript 源文件后，请重新构建这些产物。

## 架构

```text
┌──────────────────────────── OpenChamber ────────────────────────────┐
│  panel/index.html (sandboxed guest, panel or page surface)         │
│    panel/main.ts      host lifecycle, shell, load/poll             │
│    panel/memory-view  list / search / CRUD / maintenance           │
│    panel/graph-model  pure graph construction + filters            │
│    panel/graph-view   vis-network lifecycle, stable reveal         │
│    panel/profile-view grouped profile + manual refresh             │
│    panel/state.ts     reducer, request generations                 │
│    panel/api.ts       typed client over host.serviceRequest()      │
│              │  host.serviceRequest({ path: "/memory-api/…" })     │
│              ▼                                                     │
│  service/main.ts (bundled Node local service, host runtime)        │
│    · binds 127.0.0.1:${OPENCHAMBER_SERVICE_PORT} only              │
│    · requires Authorization: Bearer ${OPENCHAMBER_SERVICE_TOKEN}   │
│    · service/proxy.ts: fixed origin, endpoint+method allowlist,    │
│      20 s timeout, 2 MiB request cap, traversal rejection          │
│    · reads ~/.opencode-mem/.auth-token internally only             │
│              │  x-opencode-mem-token                                │
│              ▼                                                     │
│  opencode-mem Web API — http://127.0.0.1:4747                      │
│    /api/{stats,tags,memories,search,user-profile,cleanup,…}        │
└─────────────────────────────────────────────────────────────────────┘
```

## 安全边界

- 面板**永远不会**接触上游凭据。服务仅暴露 `/health` 和 `/memory-api/*`；面板本身只通过
  `host.serviceRequest()` 调用 `/memory-api/*`。
- 服务不接受来自面板的任意来源、路径、方法或标头：请求会根据显式允许列表进行验证，
  并基于固定的 `http://127.0.0.1:4747` 来源重新构造。迁移端点不会对外暴露。
- 专用的 `opencode-mem` 令牌只会在服务进程内部从仅用户可访问的文件中读取，并且只作为
  `x-opencode-mem-token` 转发。它不会被记录、持久化、返回或渲染。
- 请求体超过 2 MiB 或包含任何 `Transfer-Encoding` 时会被拒绝；每个路由（包括 `/health`）
  都要求提供 OpenChamber bearer token。

## 故障排查

| 所见状态 | 含义 | 解决方法 |
|---|---|---|
| 需要本地服务权限 | OpenChamber 尚未批准内置服务 | 前往 设置 → 扩展，检查并批准 local-service 权限，然后选择 **重试** |
| opencode-mem 不可用 | `127.0.0.1:4747` 上没有服务响应 | 保持 OpenCode 运行并启用 `webServerEnabled: true`，然后选择 **重试** |
| opencode-mem 授权失败 | 专用令牌文件缺失或被拒绝 | 重启 OpenCode，让 `opencode-mem` 重新写入 `~/.opencode-mem/.auth-token`，然后选择 **重试** |
| 记忆请求失败 | 上游或服务返回了意外响应 | 检查 OpenCode 日志，然后选择一次 **重试** |
| 列表为空 | 当前搜索/筛选条件没有匹配的记忆 | 清除搜索条件或添加一条记忆 |

## 手动验证

已执行的自动化检查和待完成的交互式清单见
[`docs/2026-09-22-manual-verification.md`](docs/2026-09-22-manual-verification.md)。
与本地上游服务之间的 HTTP 契约记录在
[`docs/2026-09-22-opencode-mem-http-contract.md`](docs/2026-09-22-opencode-mem-http-contract.md)。

## 许可证

MIT · 联系方式：epeiuss@waterflames.cn
