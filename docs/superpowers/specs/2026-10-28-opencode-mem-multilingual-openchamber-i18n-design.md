# 双语 README 与 OpenChamber 国际化设计

## 背景与需求

已批准的设计覆盖两个仓库，分别交付但共同验收。需求编号用于追踪：

- **R1** 修正扩展 README 中 opencode-mem 链接为 `https://github.com/yulimfish/opencode-mem`。
- **R2** 扩展仓库保留英文 `README.md`，新增 `README.zh-CN.md`；opencode-mem 保留中文 `README.md`，新增 `README.en.md`；各仓库顶部语言链接互通。翻译完整覆盖各自现有文档，不虚构功能或兼容性。
- **R3** 比较官方扩展开发能力，适度更新：`@openchamber/sdk` 从 `1.24.2` 精确升级到 `2.5.2`，更新锁文件并重建两个 bundle；保留 `apiVersion: 1`、现有 `openchamber-guest-bundle` 命令和 `engines.openchamber: >=1.24.0`，除非实际运行证据证明需要变更。2.5.2 的 statusSection、guestStatusViewSchema、onSessions.links 不属于本功能范围。
- **R4** 扩展 UI 随宿主语言：使用初始 host `ready` snapshot 的 `locale` 初始化；`zh-*`（含大小写变体及 `zh`）使用中文，其余英语。处理每个之后实际送达的 `ready` snapshot，并同步已打开的 UI（含对话框/抽屉、日期和数字）。SDK 2.5.2/docs 未证明宿主语言设置变化一定触发新 snapshot，因此不添加不存在的 event、不轮询，也不声称动态设置切换已实测。若 host 未刷新 snapshot，界面保持最近收到的语言；重新打开/刷新是否获取新语言也未实测。
- **R5** 安全交付：保护两个仓库既有变更；opencode-mem 原 main 工作区的 `D AGENTS.md` 不恢复、不覆盖；在独立 feature worktree 上依照其 HEAD 中的 AGENTS 指令工作；不提交、推送、发布或改写历史。
- **R6** 以测试、构建和有条件的宿主实测提供证据；未满足实机前提时明确标记 source-only / runtime unverified，不能把源码测试描述成实际宿主通过。

## 对比与决定

1. **文档：**单 README 混合双语减少文件但阅读与维护成本高；每语言独立文件、顶部相对链接可完整翻译且保持现有默认语言。选择后者（R1、R2）。版本、安装、迁移与安全警告均以原 README 为事实源，而不是从新 SDK 推断运行兼容性。
2. **SDK：**只修文案不升级不能满足 R3；跟进所有 2.5.2 新接口会扩大范围。选择精确升级 SDK 和重建产物，保持已声明的宿主最低版本，针对已用接口测试；API 新增项仅比较记录，不引入。官方 npm/文档检索摘要表明 2.5.2 与现有 bundle 方法，2.5.2 changelog 可读取；npm/host 文档直接抓取曾超时或 403，须在实施时核对实际包与宿主源码，不把摘要当运行证明。
3. **语言：**固定首次 locale 简单但不能反映后续实际送达的 ready snapshot；自行假设事件或轮询宿主配置没有契约保障。选择现有 `host.onReady` 契约：以初始 snapshot 初始化，并处理每个实际送达的后续 ready snapshot；活动弹层应原位更新可见文案、无障碍标签和日期，不关闭、不丢用户输入或选中数据，业务数据本身不翻译。SDK 2.5.2/docs 未证明宿主语言设置变化必然触发新 snapshot；不添加不存在的 event、不轮询、不声称动态设置切换实测。若 host 未刷新 snapshot，界面保持最近收到的语言；重新打开/刷新是否获取新语言也未实测。

## 设计和边界

`panel/main.ts` 将经过验证的宿主 locale 导入状态并触发现有 view 更新；中文和英文各自使用一致的区域日期与数字格式。无效日期保留原始值，缺失值不展示；格式化只作用于人可读的日期、计数、百分数等，ID、用户内容、版本及 API 请求值保持原样。弹层更新包括表单、校验提示、确认框、详情抽屉，以及焦点、关闭和异步完成后的当前语言；不得重放确认操作。重复通知不得导致重复加载、重复监听或破坏输入。注销所有新增监听。

现有 `panel/detail.ts` 已有无效日期回退；`panel/profile-view.ts` 当前直接显示 `lastAnalyzedAt`。`panel/i18n.ts` 已有两语言词典。保持现有布局和组件层级，不增加第三语言、遥测、宿主 API 特性或额外依赖，不改变业务服务协议或用户数据。

## 验收标准与验证映射

| 需求 | 可验收结果 / 证据 |
| --- | --- |
| R1 | 扩展两份 README 所有项目 opencode-mem 链接指向个人 fork；链接检查和人工对照。 |
| R2 | 四份 README 默认语言正确、顶部双向相对链接可解析；原有标题、命令、警告、架构和安全边界均忠实翻译；逐节对照及链接检查。 |
| R3 | package、锁文件为 SDK 2.5.2；清单版本和两条构建命令保持；`bun run check` 成功并生成最新两个 bundle；记录官方变更、可核实范围和兼容性限制。对 1.24.0 和 2.5.2 的实际兼容性不因构建成功推断。 |
| R4 | 单测覆盖 `zh-CN`、`zh-TW`、大小写、非中文；验证已证实通知驱动持续更新、弹层保留状态、相关数字日期和无效值；条件许可时于 panel 和 page 宿主实测切换。无法证明通知时报告阻塞/未验证，不造事件。 |
| R5 | 两工作树各自检查 branch/status/diff；另一仓库只在干净、非 main 的独立 worktree 修改两份 README；原工作区 `D AGENTS.md` 保持。没有 stage/commit/push。 |
| R6 | 记录命令、结果、版本、实际设备/登录/权限/授权前置和未验证项；只有实际宿主运行证据才支持兼容性声明。 |

## 风险与假设

用户已批准方向并授权总控推进，无需常规用户审阅。SDK 2.5.2/docs 未证明宿主语言设置变化一定触发新的 ready snapshot；代码契约仅覆盖初始 ready snapshot 和每个之后实际送达的 ready snapshot。若 host 未发送新 snapshot，界面会保持最近收到的语言；重新打开/刷新是否获取新语言未实测。不得自行添加 event、轮询或宣称动态 locale 设置切换已实测。旧宿主能否运行 SDK 2.5.2 bundle 也尚未证实：这些是验证风险，不是变更最低版本的理由。验证设备应已连接、解锁、前台，系统权限有效，操作他人设备或进程须有显式授权；不满足时不启动或接管进程，标 runtime unverified。涉及 SDK 网络安装只由后续实施者在当前任务授权范围内执行；本设计阶段不安装。

资料：<https://www.npmjs.com/package/@openchamber/sdk>、<https://docs.openchamber.dev/sdk/>、<https://docs.openchamber.dev/sdk/host/>、<https://openchamber.dev/changelog/2.5.2>。
