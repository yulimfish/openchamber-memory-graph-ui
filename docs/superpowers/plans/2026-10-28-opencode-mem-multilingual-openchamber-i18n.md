# 双语 README 与 OpenChamber 国际化 Implementation Plan

> **For agentic workers:** Use the installed `swarm-cluster` skill for approved parallel work, or follow the current environment's in-session plan execution workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为两个仓库交付忠实双语 README、升级扩展 SDK，并使扩展遵循已核实的宿主语言机制。

**Architecture:** 两仓库的文档与扩展 SDK、UI 四条工作流分离，写入文件互不重叠；最后基于合并后的 SDK 和 UI 构建并验证 bundle。UI 通过既有状态更新和经证实的宿主通知更新界面及活动弹层，不改变布局或数据协议。

**Tech Stack:** TypeScript、Bun、`@openchamber/sdk` 2.5.2、Markdown、Git worktree。

**Spec:** `docs/superpowers/specs/2026-10-28-opencode-mem-multilingual-openchamber-i18n-design.md`

## Global Constraints

- 扩展：英文 `README.md`、中文 `README.zh-CN.md`；opencode-mem：中文 `README.md`、英文 `README.en.md`；各仓库顶部互链。
- 扩展 opencode-mem 链接 `https://github.com/yulimfish/opencode-mem`；仅以已有 README 为事实，不发明兼容性。
- SDK 精确 `2.5.2`；`apiVersion: 1`、`engines.openchamber: >=1.24.0` 和现有 bundle 命令保持，除非实际 runtime evidence 证明必须调整，须先向总控升级问题而非默默改。
- UI 以初始 host `ready` snapshot 的 `locale` 初始化，并处理每个之后实际送达的 `ready` snapshot；`zh-*`/`zh` 为中文，其余英文，活动弹层原位同步而不丢输入、焦点或操作状态。SDK 2.5.2/docs 未证明宿主语言设置变化一定触发新 snapshot；不添加不存在的 event、不轮询、不声称动态切换已实测。未收到新 snapshot 时界面保持最近收到的语言；重新打开/刷新是否取得新语言也未实测。
- 不添加第三语言、UI 布局重排、无关 SDK 新特性、提交、推送、发布或历史改写。
- 当前 worktree 为扩展 feature 分支；opencode-mem 原 main 工作区 `D AGENTS.md` 是用户改动，始终保留；其独立 feature worktree 必须遵循自身 `AGENTS.md`。
- UI 实测仅在设备已连接、解锁、前台、必要权限有效且他人设备/进程有显式授权时执行；否则标记 source-only / runtime unverified。

## Review Focus

- 未知或大小写混合 locale：`zh-TW` 和 `ZH-cn` 中文，`fr-FR` 英文；Task 4 测试。
- 打开表单有未保存输入时语言改变：保留值、焦点、弹窗和校验状态；Task 4 测试。
- 删除确认或图谱详情在语言切换时打开：标签和日期更新，不触发动作；Task 4 测试。
- 时间值无效、缺失或数字为零：原样回退或省略缺失，零仍可见；Task 4 测试。
- 新 SDK 编译成功但旧宿主可能不兼容；host 语言设置变化是否触发新的 ready snapshot 未证实。Task 4 的 R4 source contract 仅要求响应初始 snapshot 和每个实际送达的 snapshot；Task 5 记录宿主运行证据或未验证，不推断未送达的动态更新。

## 文件所有权、调度和基线

W9 先以独立上下文审核本 Spec/Plan，通过后总控为下面 B1–B5 分配实际 Work ID；这些标签是任务边界，不是 Work ID。B1、B2、B3 可并行；B4 在 B3 验证并交接宿主 locale 机制证据后启动，不能与 B3 独立执行。B3 不构建、不改 README；B4 不改 manifest、锁文件和 bundle。B5 等 B1–B4 完成，且变更已安全汇入同一扩展 worktree、opencode-mem 独立 worktree 结果已记录后执行。若共享 worktree，明确以文件所有权隔离；若使用不同 worktree，先核对合入方式和未提交改动，禁止强覆盖。每个 worker 接收完整 brief、准确文件边界及结尾 sentinel，返回证据；不自行 commit。

扩展工作树：`/Users/yulimfish/.local/share/opencode/worktree/9d754b9d928e02658b0f54cb517002216ef04cf3/readme-ui-i18n`，分支 `openchamber/readme-ui-i18n`。各 worker 动手前执行 `git branch --show-current; git status --short --untracked-files=all; git diff --stat; git diff`，读取适用根/子目录 `AGENTS.md` 和 `CLAUDE.md`；保留已有变更，不重置。当前 W8 检查扩展 status 干净，根及子目录未发现指令文件。

opencode-mem 原工作区 `/Users/yulimfish/Documents/opencode-mem`：仅检查 `git status --short --untracked-files=all`，预期 ` D AGENTS.md`；从该仓库已确认的 main HEAD 创建独立 feature worktree/分支（加载 `using-git-worktrees`，路径由总控指定并获该位置写入授权），不要在原 main 创建/恢复任何文件。新 worktree 检查分支非 main、干净并读取检出的 `AGENTS.md`；如路径、分支冲突或状态不符则停下报告，不覆盖。原仓库规则禁止在 main 修改；仅审查 PR 可集成 main，当前无提交/PR 授权。

---

### Task 1: B1 — 扩展 README 双语

**Files:** Modify: `README.md`; Create: `README.zh-CN.md`。

**Interfaces:** Consumes: 当前英文 README；Produces: 两个相对链接互通的等价文档；B3 不修改这两个文件。

- [x] **Step 1: 固化文档验收。** 记录原文各标题、代码块、URL、前置条件、安全和故障排查；确认原始第 4 行错链。检查 `test -e README.zh-CN.md`，若已存在不得覆盖。
- [x] **Step 2: 修正英文 README。** 顶部增加链接 `README.zh-CN.md`，将错误 opencode-mem 链接改为个人 fork；保留已有准确技术描述及最低版本。
- [x] **Step 3: 编写中文 README。** 逐节翻译现有英文 README，顶部链接 `README.md`；命令、地址、权限、安全和诊断含义与原文一致。
- [x] **Step 4: 验证。** 运行 `git diff --check -- README.md README.zh-CN.md`，以及 `test -f README.zh-CN.md && rg -n 'README\.zh-CN\.md|README\.md|github.com/yulimfish/opencode-mem' README.md README.zh-CN.md`；预期互链与正确 URL 均可见。逐节对照两文件，检查相对链接目标存在及无原错误项目链接；新文件另用 `git diff --no-index -- /dev/null README.zh-CN.md` 查看（退出 1 表示存在差异）。

### Task 2: B2 — opencode-mem README 双语

**Files:** 在独立 opencode-mem feature worktree 修改 `README.md`，创建 `README.en.md`；不得修改原 main 工作区。

**Interfaces:** Consumes: 该 worktree 现有中文 README 和 `AGENTS.md`；Produces: 两份逐节等价的 README，供最终跨仓验收。

- [x] **Step 1: 建立独立工作树并核验。** 按全局约束创建后运行 `git branch --show-current; git status --short --untracked-files=all; git diff`，确保非 main、无冲突；读取规则。创建前先确认目标分支/路径不存在并按环境授权处理；原工作区仅用于只读状态核验。
- [x] **Step 2: 写中文互链和英文译文。** 在中文 `README.md` 顶部链接 `README.en.md`；完整翻译到英文，顶部链接 `README.md`，保留 fork、版本、安装、配置、迁移备份警告、开发及上游信息，不改命令及示例值。
- [x] **Step 3: 验证。** 在独立 worktree 运行 `git diff --check -- README.md README.en.md; rg -n 'README\.en\.md|README\.md' README.md README.en.md`；逐节对照与确认本地链接目标存在，检查新文件 diff。再在原工作区运行 `git status --short --untracked-files=all`，预期仍为 ` D AGENTS.md` 且无本任务文件改动；状态变化则停止并报告。

### Task 3: B3 — SDK 与开发兼容说明

**Files:** Modify: `package.json`, `bun.lock`, `tests/manifest.test.ts`; Create: `docs/2026-10-28-openchamber-sdk-compatibility.md`。不触碰 README、UI 文件和生成 bundle。

**Interfaces:** Consumes: 当前 manifest、SDK 声明及官方文档；Produces: SDK 2.5.2 的 manifest/lock、契约测试及兼容比较，供 Task 5 安装和构建。依赖不要求 B4 完成；不得要求 B4 依赖安装的共享目录正在写入时运行测试。

- [x] **Step 1: 先扩展契约测试。** 在 `tests/manifest.test.ts` 增加断言 `pkg.dependencies["@openchamber/sdk"] === "2.5.2"`；现有 API 和 engine 断言保留；增加两构建脚本精确断言 `bunx openchamber-guest-bundle panel/main.ts panel/main.js`、`bunx openchamber-guest-bundle --node service/main.ts service/main.js`。
- [x] **Step 2: 红灯。** `bun test tests/manifest.test.ts`，预期 SDK 版本断言因当前 1.24.2 失败；其他约束通过。若环境没有 Bun，报告 blocked，不伪造结果。
- [x] **Step 3: 升级依赖并刷新锁。** 将 `package.json` 的 SDK 精确设为 `2.5.2`，运行 `bun install` 更新 `bun.lock`；不改其它直接依赖或 bundle。实际依赖变化和安装输出须记录；不得通过安装脚本隐瞒错误。
- [x] **Step 4: 对照和记录证据。** 检查安装 SDK 的声明、实现与官方资料 <https://docs.openchamber.dev/sdk/>、<https://docs.openchamber.dev/sdk/host/>、<https://openchamber.dev/changelog/2.5.2>；在新文档记录 API v1、构建和已使用 API 对比、2.5.2 新增项不采用的原因、来源和不可访问页面，以及宿主最低版本尚无运行证据。核实 `onReady` 在语言变化时是否重复触发或存在正式通知：引用具体版本源码路径/行与真实事件 payload，交付 B4；找不到时明确未知，不猜测。
- [x] **Step 5: 绿灯。** `bun test tests/manifest.test.ts && bun run typecheck` 预期通过；列出 lock diff 中任何间接依赖变化。安装或 SDK 兼容失败时停止并报告，不抬高 engine 来绕过。

### Task 4: B4 — UI locale 和活动弹层

**Files:** Modify as needed: `panel/main.ts`, `panel/state.ts`, `panel/i18n.ts`, `panel/detail.ts`, `panel/dialog.ts`, `panel/memory-view.ts`, `panel/graph-view.ts`, `panel/profile-view.ts`; Modify: `tests/panel/i18n.test.ts`; Create: `tests/panel/locale-update.test.ts`。不得修改 `panel/index.html`, CSS、依赖清单、bundle 或其他任务文件。

**Interfaces:** Depends: Task 3 验证并交接宿主 locale 机制证据后，本任务才能启动。Consumes: `resolveLocale(locale: string): SupportedLocale`, `strings(locale: string): Messages`, `formatDate(value: string, locale: string): string`, `AppAction` 的 `HOST_READY`，以及 Task 3 交接的宿主契约证据；Produces: 已核实通知到状态再到 view/弹层的更新，复用现有 `update(state: AppState): void`。若新增 `DialogHandle` 更新方法，其参数和调用者由本任务一并实现；Task 5 不依赖新内部接口。

- [x] **Step 1: 写失败测试。** 为 `resolveLocale` 增加 `zh-CN`, `zh-TW`, `ZH-cn`, `en-US`, `fr-FR` 断言；日期测试按相同 options 比较 `Intl.DateTimeFormat`，无效值原样、缺失不显示；测试 0、大数及百分数按对应 `Intl.NumberFormat` 输出，版本和 ID 不格式化。新增 `tests/panel/locale-update.test.ts`：注入最小 DOM/host 测试替身或采用现有测试设施（不加第三方依赖），断言重复 ready/已证实通知切换语言、无重复初始加载及监听；活动编辑表单保留输入、焦点和校验文案；确认框切换不调用确认；列表/图谱详情和 profile 更新标题、aria 标签、日期及数字；异步完成后 toast 使用当前语言，dispose 注销监听。
- [x] **Step 2: 红灯。** `bun test tests/panel/i18n.test.ts tests/panel/locale-update.test.ts`；预期新增未实现行为失败，记录具体失败而不是测试环境错误。若现有 Bun 无 DOM，使用最小真实可执行的 DOM 替身验证交互，不能用永远为真的 mock 代替断言。
- [x] **Step 3: 实现最小更新。** 保持 `resolveLocale` 对中文和其它语言的约定；对日期沿用 `formatDate` 的无效值回退，profile 时间也使用它；将可读计数和百分数按 `zh-CN`/`en-US` 区域格式化，保留缺失和零。对已打开的表单、确认、详情抽屉原位更新可翻译节点，不销毁输入或焦点，不重新触发操作；保留业务文本。以初始 host `ready` snapshot 初始化，并处理每个之后实际送达的 `ready` snapshot，包含已打开 UI。SDK 2.5.2/docs 未证明宿主语言设置变化必然触发新 snapshot；不添加不存在的 event、不轮询、不声称动态设置切换实测。若 host 未刷新 snapshot，界面保持最近收到的语言；重新打开/刷新是否获取新语言也未实测。
- [x] **Step 4: 绿灯。** 重跑 Step 2 和 `bun run typecheck`；预期全部通过。人工检查所有弹层创建点、ARIA、异步回调和计数位置，说明未覆盖之处；不要宣称已实机验证。R4 source contract is satisfied for each delivered ready snapshot; whether a live host locale-setting change causes another snapshot is unverified and outside the demonstrable SDK promise.

### Task 5: B5 — 集成、bundle 与实际验证

**Files:** Modify generated `panel/main.js`, `service/main.js` only；必要时只汇报其他任务缺陷给其 owner 修复，不越界覆盖。

**Interfaces:** Consumes: B1–B4 经审查的结果、SDK `2.5.2`、UI `update(state: AppState): void`；Produces: 与最终源码/锁文件一致的两个 bundle 和完整验证记录。前置：B3 与 B4 完成且已安全汇入，测试不与其他依赖安装或文件修改并发；B1/B2 的文档验收完成。

- [x] **Step 1: 核对两仓库基线及产物。** 扩展运行 `git status --short --untracked-files=all; git diff --stat; git diff --check`，核实变更仅属本计划与用户原有变更。读取 opencode-mem 独立工作树变更，并再次只读检查原 main 的 ` D AGENTS.md` 未恢复。确认 SDK lock 和 manifest 均为 2.5.2。已核验两仓库基线与 source-only/runtime-unverified 状态；全局 `git diff --check` 对 `panel/main.js` 的已知继承 whitespace warning 保持原样，按 W15 Ruling 不修改 bundle 来消除。
- [x] **Step 2: 完整检查和构建。** 在扩展运行 `bun run check`，预期测试、typecheck、panel 和 service build 全部成功；检查 `git diff --stat -- panel/main.js service/main.js` 与源码一致，记录生成物实际变化。失败必须交回相应 owner 修复并重跑，不弱化检查。
- [x] **Step 3: 宿主条件与手工矩阵。** 先确认设备连接、解锁、前台、系统权限、他人进程/设备显式授权；不满足则不启动/接管并记录 source-only、runtime unverified。条件满足时记录 OpenChamber 和 SDK 版本，在 panel 与 page 分别检查首次中文、英文及非中文回退；若宿主有已证实通知，切换时检查打开表单、确认和图谱抽屉的文案、输入、焦点和日期数字，验证 service 权限/连接和基本操作；分别记录最低声明版本 `1.24.0` 与 `2.5.2` 的实际测试情况，缺一不能推断通过。任何失败提供可复现步骤，交由 owner 修复。
- [x] **Step 4: 交付独立审查。** 汇总各任务执行命令、实际输出、文档对照、产物路径、宿主契约证据、未验证项及两个 worktree 的状态；总控安排新上下文审查原始要求及证据。审查通过前不将整体标为完成；不 stage、commit、push 或发布。

## Execution Evidence

- **W9/W10 — Spec/Plan review:** W9 `PASS_STANDARD`; one minor B3/B4 dependency issue was corrected by W8. Fresh W10 re-review: `PASS_STANDARD`.
- **W11 — Task 1:** Updated `README.md` links/cross-links and added `README.zh-CN.md`. `git diff --check -- README.md README.zh-CN.md` exit 0; `rg` unavailable (127), equivalent `grep` passed; section-by-section comparison completed.
- **W12 — Task 2:** Created independent worktree `opencode-mem-readme-i18n`, branch `opencode-mem/readme-i18n`; updated `README.md` and added `README.en.md`. Original checkout remained ` D AGENTS.md` only. Diff check, link cross-check, and section comparison passed; `rg` unavailable, equivalent `grep` used.
- **W13 — Task 3:** Updated SDK to 2.5.2, `bun.lock`, manifest assertions, and compatibility document. TDD manifest test first failed as expected on old version; `bun install` succeeded. Final `bun test`: 38 passed, 0 failed, 145 assertions; typecheck and diff check passed. `onReady` repeat snapshot/locale contract evidence was recorded; host locale-change trigger remains unknown. Bundle not built in this task.
- **W14 — Task 4:** Updated UI files and added `locale-update.test.ts`. In the test shim, RED reproduced English validation text and an old English confirmation title. Targeted run: 10 passed, 0 failed, 75 assertions; typecheck passed; full suite: 46 passed, 0 failed, 211 assertions. No bundle or host runtime test in this task.
- **W15 — Task 5 build/check:** `bun run check`: 46 passed, 0 failed, 211 assertions; typecheck, panel build, and service build passed. `panel/main.js` alone changed as generated output; `service/main.js` did not. Global `git diff --check` exited 2 for whitespace at `panel/main.js:1149,1156`; the same TAB/space bytes already existed in the old bundle at lines 1062/1069. Removing them would change template-string contents, so the controlling Ruling was to preserve generated output. Scoped `git diff --check -- . ':(exclude)panel/main.js' ':(exclude)service/main.js'` exited 0; new files' no-index checks reported no whitespace diagnostics (exit 1 was expected because the files differ from `/dev/null`). Cost: do not hand-edit generated bundle to silence inherited whitespace. Host runtime compatibility and dynamic language changes were not tested; source-only.
- **W16 — host locale research:** Independent review of official sources (4 searches, 5 fetches) did not establish that a locale change necessarily triggers `ready`; no code change followed.
- **W17 independent review:** `CONDITIONAL_PASS` (1 MAJOR: R4 wording implied a live locale-change trigger without host evidence; 1 MINOR: README minimum version could be read as tested runtime support). Current fix round: `review_round: 2/3`.
- **W20 Rulings (recorded verbatim):** (1) “将‘UI 跟随 OpenChamber 语言’的保证边界明确为：用初始 host `ready` snapshot 的 `locale` 初始化；处理每个之后实际送达的 ready snapshot，并同步已打开UI。SDK 2.5.2/docs未证明宿主语言设置变化一定触发新 snapshot；不添加不存在的event、不轮询、不声称动态切换实测。若host未刷新snapshot，界面会保持最近收到的语言，重新打开/刷新是否获取新语言也未实测。这样风险是用户可能期望设置变更后在当前页面即时切换；当前SDK契约不能证明该触发，但代码正确响应已送达快照。” (2) “保留manifest最低版本 `>=1.24.0`，但 README 明确写成‘声明的最低版本；SDK 2.5.2构建物未在 OpenChamber 1.24.0/1.24.2 runtime验证’，不得写成已实测支持，也不抬版本。”
- **W20 change cost:** 仅调整 Spec/Plan 的 locale guarantee boundary 和 README/README.zh-CN.md 的最低版本验证限定；无产品源码、SDK、bundle 改动，无新 event、轮询或版本抬升。已知 `panel/main.js` diff-check whitespace warning 按既有 W15 Ruling 原样保留。
- **W21 — fresh-context two-pass post-build re-review:** `PASS`, 0 blocker / 0 major / 0 minor. Reviewed both feature worktrees, original opencode-mem main, Spec/Plan, README/compatibility/docs, UI source/tests, and bundles; R1–R6 conform within W20's boundary. No tests/build were rerun. `review_round: 2/3` history is retained. Outstanding unverified items: whether host settings changes trigger a new `ready` snapshot; whether reopen/refresh obtains the updated locale; OpenChamber 1.24.0/1.24.2 runtime compatibility; and the manual panel/page matrix. W21 confirmed these remain truthfully runtime-unverified. The `panel/main.js:1149/1156` global diff-check whitespace warning remains under the completed W15 Ruling; scoped source-only check passed.
- **Runtime and audit status:** W21 fresh-context review is PASS; Task 5 Step 4 is checked. Host/device prerequisites were not established, so no host was started or controlled and the manual matrix is not passed. Runtime remains unverified for host-setting-to-new-snapshot behavior, reopen/refresh locale behavior, OpenChamber 1.24.0/1.24.2 compatibility, and manual panel/page behavior. Preserve `review_round: 2/3`, W17/W20 history, and the W15/W20 Ruling costs above.
