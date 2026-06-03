# NovalWriter — 多智能体小说写作系统 · 需求设计文档

> 版本: v1.3 | 日期: 2026-06-03 | 状态: 设计完成（新增测试策略 + 版本控制），待进入实施计划

---

## 1. 项目概述

### 1.1 目标

构建一个基于多智能体协作的小说写作 Web 应用。用户输入创作需求后，由一个调度器(Dispatcher)协调 6 个模块 Agent（信息搜集、主题、角色、情节、环境、叙事）串行构建大纲。用户确认大纲后，逐章生成正文（每章需用户确认），并在生成过程中持续补充优化各模块 Agent 的内容和大纲。

### 1.2 核心挑战

- **上下文管理**：长篇小说的内容持续增长，需设计分层摘要 + 滑动窗口机制防止上下文溢出
- **多Agent协作一致性**：国产模型 tool-calling 能力有限，需采用 prompt 模板 + 结构化输出解析
- **现实背景整合**：新增 Information Agent，通过 LLM 联网搜索搜集真实世界素材，为小说提供7个维度的背景资料
- **中途修改的级联影响**：用户修改大纲或角色设定后，需标记受影响章节并支持用户选择处理方式

---

## 2. 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React + TypeScript + Tailwind CSS | SPA，模块化组件 |
| **后端** | Python FastAPI | 异步原生支持，WebSocket 实时推送，流式响应 |
| **数据库** | PostgreSQL | 结构化数据（角色、情节、大纲、配置） |
| **文件存储** | 本地文件系统 | 章节正文 Markdown，Agent 数据 JSON |
| **LLM 抽象层** | 自研统一接口 | 初期支持 DeepSeek / 通义千问 / 文心一言，未来可插拔 |
| **Agent 调度** | 自研轻量调度器 | 状态机 + Pipeline 模式，不依赖 LangGraph/CrewAI |
| **缓存** | Redis | 上下文缓存、会话状态 |

### 2.1 技术选型理由

- **Python FastAPI**：LLM/Agent 生态的绝对主导语言，国产模型 SDK Python 支持最好
- **自研调度器**：国产模型 tool-calling 参差不齐，自研可用 prompt 模板 + 结构化输出解析替代；上下文管理需深度定制；小说写作流程本身是确定性的，不需要框架的"自动协商"
- **PostgreSQL + 文件存储**：结构化数据放数据库，大文本（章节正文）放文件系统

---

## 3. Agent 系统设计

### 3.1 架构概览

```
用户 → Dispatcher(调度器) → [Information Agent → 主题Agent → 角色Agent → 情节Agent → 环境Agent → 叙事Agent] (大纲阶段)
                          → 写作Agent (写作阶段)
                          → 5个模块Agent 并行补充 (补充阶段，Information Agent 不参与)
```

### 3.2 调度器 (Dispatcher)

**核心职责**：
- 流程编排（状态机驱动）
- 上下文组装（从各模块提取相关数据注入写作Agent）
- 摘要策略管理（热/温/冷三层降级）
- Token 预算控制

**状态机**：

| 状态 | 说明 |
|------|------|
| `IDLE` | 项目刚创建 |
| `BUILDING_OUTLINE` | 串行调用6个Agent构建大纲 |
| `AWAITING_OUTLINE_CONFIRM` | 等待用户确认/修改大纲 |
| `WRITING_CHAPTER` | 组装上下文，调用写作Agent生成章节 |
| `AWAITING_CHAPTER_CONFIRM` | 等待用户确认/重试/编辑章节 |
| `SUPPLEMENTING` | 将本章摘要分发给5个Agent并行更新 |
| `COMPLETED` | 所有章节确认完毕 |
| `USER_MODIFY` | 全局状态——用户修改数据，标记影响 |
| `ERROR` | LLM调用失败，自动重试（最多3次） |

**状态持久化**：每次变更写入 PostgreSQL，服务重启从断点恢复。
**并发控制**：同一项目同时只有一个流程运行（项目级锁）。
**进度推送**：WebSocket 实时推送状态变更到前端。

### 3.3 各模块 Agent 定义

#### Information Agent（信息搜集Agent）
- **大纲阶段**：从用户需求中提取关键词 → 利用 LLM 内置联网搜索功能搜集真实世界素材 → 按7个维度整理输出
- **搜索方式**：LLM 内置联网搜索（DeepSeek / 通义千问的搜索功能）
- **输出**：结构化的"背景资料库"，包含 7 个信息分类：
  - 🏛️ **时代背景**：同时期政治、经济、科技、文化大事件
  - 📜 **官方描述**：正史记载、官方文献、权威百科
  - 📖 **野史记载**：非官方记录、私人笔记、地方志
  - 🗺️ **地理风貌**：真实地理位置、气候、交通、建筑
  - 🎎 **风俗习惯**：衣食住行、节庆礼仪、社会规矩
  - 🐉 **传说故事**：民间传说、神话、奇闻异事
  - 🎭 **民间演绎**：说书人改编、戏曲唱本、市井流传版本
- **补充阶段**：**不参与**每章后的自动补充（搜索有成本，背景资料相对稳定）。用户可随时手动触发增量搜索
- **与其他Agent关系**：作为管道最前端，输出给所有后续Agent（主题Agent获得真实素材支撑，环境Agent获得真实地理/风俗参考）
- **选择理由**：放在管道最前面，让后续所有Agent都能引用真实世界素材。特别适合历史/科幻/都市类小说

#### 主题 Agent
- **大纲阶段**：从用户需求提炼核心主题、情感基调、价值主张
- **输出**：主题陈述(200-500字)、关键词标签、禁忌话题列表
- **补充阶段**：检查新章节是否体现主题，记录主题表达演变
- **约束关系**：→ 角色Agent（角色应服务于主题）→ 情节Agent（情节应体现主题冲突）

#### 角色 Agent
- **大纲阶段**：设计角色体系（主角、反派、配角、关系网络）
- **输出**：角色卡 — 姓名/外貌/性格/动机/弧线/语言风格/关系图 + initial_state
- **补充阶段（每章后）**：
  - 跟踪角色状态变化：位置、情绪、目标、关键决策
  - 记录角色关系演变
  - 新角色出现 → 自动创建角色卡
  - 检测 OOC 风险（如对话风格与设定不符）

#### 情节 Agent
- **大纲阶段**：设计情节结构 — 主冲突、章节节点、高潮、转折、支线
- **输出**：情节节点树（父子关系）、每个节点的章节预估、关键事件列表
- **补充阶段（每章后）**：
  - 更新情节进度（节点完成状态）
  - 检查是否偏离主线
  - 支线展开 → 在节点树中插入新节点
  - 节奏监控（连续多章无冲突 → 提醒）

#### 环境 Agent
- **大纲阶段**：构建世界观 — 时代/地域/规则体系/文化/场景列表
- **输出**：世界观文档、场景卡片（描述、氛围、关联情节节点）
- **补充阶段（每章后）**：
  - 记录新场景 → 创建场景卡
  - 补充场景细节
  - 世界一致性检查（规则是否自洽）

#### 叙事 Agent
- **大纲阶段**：确定叙事策略 — 人称、视角、时态、章节节奏模板
- **输出**：叙事规则文档（视角规则、时态、结构模板、对话风格指引）
- **补充阶段（每章后）**：
  - 检查叙事一致性（视角跳跃、时态混乱）
  - 节奏分析（章节长度、对话比例、描写密度）
  - 必要时建议调整叙事策略

#### 写作 Agent
- **只在逐章写作阶段激活**，不参与大纲构建
- **输入**（由调度器组装）：
  - 本章情节节点 + 前后2章情节节点
  - 本章涉及角色的角色卡 + current_state
  - 本章相关场景卡片
  - 叙事规则摘要
  - 前2章正文（热数据）+ 前N章摘要（温数据）
- **输出**：章节正文 + 本章摘要（供后续使用）

### 3.4 大纲构建流程（串行瀑布流）

```
用户需求
  → Information Agent（搜集真实世界素材，生成背景资料库）
  → 主题Agent（基于用户需求+真实素材，定基调、思想）
  → 角色Agent（受主题约束，参考真实人物原型，设计人物）
  → 情节Agent（基于角色和主题，参考历史事件，设计冲突弧线）
  → 环境Agent（匹配情节需求，参考真实地理/风俗，构建世界观）
  → 叙事Agent（综合以上，确定视角/时态/节奏）
  → 调度器汇总 → 结构化大纲 → 用户确认/修改
```

**选择理由**：小说各要素之间有强依赖关系——Information Agent 最先运行，为后续所有Agent提供真实世界素材支撑；角色设定应服务于主题，情节应由角色驱动，环境服务于情节。串行能最大程度保证一致性。

### 3.5 逐章写作流程

```
写第N章：
  调度器提取上下文（热数据+温数据+模块数据）
    → 注入写作Agent prompt
    → 生成章节正文
    → 用户确认/重试/编辑
    → 确认后：生成第N章摘要
    → 分发给5个模块Agent并行补充更新（Information Agent 不参与）
    → 循环进入第N+1章
```

**选择单一写作Agent的理由**：国产模型输出质量有限，一个Agent写能保证风格统一；上下文管理更可控。

### 3.6 章节确认交互

每章流程：**生成 → 预览 → 确认/重试/手动编辑**

- 确认发布 → 触发补充阶段
- 重新生成 → 可附带调整指导，重新调用写作Agent
- 手动编辑 → 用户直接修改正文后确认

---

## 4. 上下文管理（核心架构）

### 4.1 三层降级策略

| 层级 | 范围 | 存储 | 注入方式 |
|------|------|------|----------|
| 🔥 **热数据** | 当前章 ± 2章正文 | 文件系统 | 全量原文注入 |
| 🌤 **温数据** | 所有已写章节摘要 | PostgreSQL | 最近10章全摘要注入；11章以上聚合摘要注入 |
| ❄️ **冷数据** | 超过50章的旧内容 | 文件系统 | 不注入，仅用户主动"回溯"时检索 |

### 4.2 上下文组装算法（写第N章时）

1. **定位本章范围**：查询情节节点树 → 找到第N章对应的 PlotNode(s) → 提取节点描述和目标
2. **关联实体检索**：提取本章相关角色卡 + current_state、场景卡、叙事约束摘要
3. **热数据加载**：加载 Ch_N-2.md、Ch_N-1.md 全量原文（如N=1，改为加载大纲摘要）
4. **温数据加载**：加载最近10章 ChapterSummaries 全量文本 + 11~N-1章聚合摘要
5. **Token 预算检查**：
   - 估算总 token（优先使用模型原生 tokenizer；如不可用，中文可按 1.5 字符≈1 token 粗略估算）
   - 如超过模型限制的80%，按优先级裁剪：
     ① 温数据（10章→5章摘要）
     ② 热窗口（±2章→±1章）
     ③ 角色卡（完整→关键字段）
   - 保留20%余量给生成输出
6. **Prompt 组装**：按结构化模板注入写作Agent

### 4.3 Prompt 模板结构

```
[SYSTEM]   写作指令 + 叙事规则
[BACKGROUND] 本章涉及的真实背景资料（从 Information Agent 资料库提取）
[CHARACTERS] 本章相关角色信息（姓名、当前状态、性格、目标、位置）
[PLOT]     本章情节目标
[SCENES]   本章场景描述 + 氛围
[CONTEXT]  前文摘要（温数据）
[RECENT]   近章原文（热数据）
[INSTRUCTION] 本章具体写作要求（字数、风格、衔接要求）
```

### 4.4 摘要策略

- **生成时机**：用户确认章节后立即生成（写作Agent同时输出正文+摘要）
- **聚合摘要**：第10、20、30…章确认后，由调度器自动触发聚合（将最近10章摘要压缩为1段），防止温数据膨胀
- **角色状态同步**：补充阶段更新角色current_state后，下次写作自动使用最新状态

---

## 5. 中途修改的级联管理

### 5.1 修改触发

用户可随时修改大纲和所有Agent相关内容（角色卡、情节节点、场景、叙事规则等）。

### 5.2 影响标记

修改发生后 → 调度器分析影响范围 → 标记可能受影响的章节 → 记录到 ModificationLog 表。

### 5.3 用户选择处理方式

- **逐个重写标记章节**：从最早受影响的章节开始，逐章重新生成
- **仅影响后续章节**：已写章节保留不改，修改只影响未来章节
- **忽略**：仅影响未来章节，不回溯

用户决策记录在 ModificationLog.resolved_at。

---

## 6. 数据模型

### 6.1 PostgreSQL 核心表

| 表 | 关键字段 | 说明 |
|----|----------|------|
| `projects` | id, title, description, status, created_at, updated_at | 项目主表 |
| `themes` | project_id, statement, keywords, taboos, tone, version | 1:1 项目 |
| `characters` | project_id, name, role_type, card(JSON), initial_state(JSON), current_state(JSON), relationships(JSON), is_active, version | 1:N 项目 |
| `plot_nodes` | project_id, title, description, parent_id, chapter_estimate, actual_chapter, status, importance, sort_order | 树形结构 |
| `scenes` | project_id, name, description, atmosphere, details(JSON) | 场景卡片 |
| `scene_plot_nodes` | scene_id, plot_node_id | M:N 关联 |
| `narrative_rules` | project_id, pov, tense, chapter_template, dialogue_style, description_density, rhythm_notes | 1:1 项目 |
| `chapters` | project_id, chapter_number, title, status, word_count, summary, content_path, related_characters(JSON), related_plot_nodes(JSON), version | 章节主表 |
| `chapter_summaries` | chapter_id, plot_progress, character_changes, key_events, new_elements, summary_text | 温数据 |
| `modification_logs` | project_id, target_type, target_id, change_description, affected_chapters(JSON), resolved_at | 修改追踪 |
| `information_entries` | project_id, category, title, content, source_url, keywords(JSON), created_at | Information Agent 背景资料库 |

### 6.2 文件存储布局

```
projects/{project_id}/
├── chapters/
│   ├── ch_001.md          # 热数据（近章，全量保留）
│   └── ...
├── summaries/
│   ├── ch_001_summary.json # 温数据
│   └── ...
├── agents/
│   ├── information_library.json  # Information Agent 背景资料库
│   ├── character_cards.json
│   ├── plot_tree.json
│   ├── world_settings.json
│   └── narrative_rules.json
└── exports/
    └── full_novel.txt      # 全量导出
```

---

## 7. API 设计

### 7.1 REST API 端点

#### 项目管理
- `POST   /api/projects`                          — 创建新项目
- `GET    /api/projects`                           — 项目列表
- `GET    /api/projects/{id}`                      — 项目详情+状态
- `DELETE /api/projects/{id}`                      — 删除项目

#### 大纲
- `POST   /api/projects/{id}/outline/build`        — 触发大纲构建（IDLE→BUILDING）
- `GET    /api/projects/{id}/outline`               — 获取完整大纲（所有模块数据）
- `POST   /api/projects/{id}/outline/confirm`       — 确认大纲（首次→进入写作，后续→应用修改）

#### 模块 Agent 数据
- `GET    /api/projects/{id}/characters`            — 角色列表
- `PUT    /api/projects/{id}/characters/{cid}`      — 更新角色卡（手动编辑）
- `GET    /api/projects/{id}/plot-nodes`            — 情节节点树
- `PUT    /api/projects/{id}/plot-nodes/{nid}`      — 更新情节节点
- `GET/PUT /api/projects/{id}/theme`                — 主题数据
- `GET/PUT /api/projects/{id}/scenes`               — 场景列表
- `GET/PUT /api/projects/{id}/narrative`            — 叙事规则
- `GET    /api/projects/{id}/information`           — Information Agent 背景资料库
- `POST   /api/projects/{id}/information/search`    — 手动触发增量搜索

#### 章节写作
- `POST   /api/projects/{id}/chapters/next`         — 生成下一章（进入WRITING状态）
- `POST   /api/projects/{id}/chapters/{num}/confirm` — 确认章节→触发补充
- `POST   /api/projects/{id}/chapters/{num}/retry`   — 重新生成（可附带调整指导）
- `PUT    /api/projects/{id}/chapters/{num}`         — 手动编辑章节内容

#### 导出
- `GET    /api/projects/{id}/export/txt`            — 导出TXT全文
- `GET    /api/projects/{id}/export/epub`           — 导出EPUB

#### 修改追踪
- `GET    /api/projects/{id}/modifications`         — 查看待处理的修改影响

### 7.2 WebSocket 事件

端点：`WS /ws/projects/{id}`

| 事件 | 载荷 | 说明 |
|------|------|------|
| `state_change` | `{from, to}` | 状态变更通知 |
| `agent_progress` | `{agent, status}` | Agent 执行进度 |
| `outline_ready` | `{outline_summary}` | 大纲构建完成 |
| `chapter_generated` | `{chapter_num, word_count, preview}` | 章节生成完成 |
| `supplement_done` | `{agents_updated, changes}` | 补充优化完成 |
| `modification_impact` | `{affected_chapters, severity}` | 修改影响分析 |
| `error` | `{message}` | 错误通知 |

---

## 8. 前端设计

### 8.1 设计方向："Writer's Study"

深色暖调主题，模拟深夜书房写作体验——暖黑底色、琥珀色灯光点缀、奶油色文字。字体使用 Playfair Display (标题) + Crimson Pro (正文)，文学气质。

### 8.2 配色方案

| 角色 | 色值 | 用途 |
|------|------|------|
| 背景深 | `#12100e` | 页面底层 |
| 背景 | `#1a1714` | 导航栏、footer |
| 表面 | `#221e1a` | 卡片、面板 |
| 文字主 | `#e4dcc8` | 正文、标题 |
| 文字次 | `#b8ae9a` | 辅助说明 |
| 强调 | `#d4a853` | 主按钮、激活态、进度指示 |
| 成功 | `#7a8b6e` | 完成状态 |
| 警告 | `#d4943a` | OOC风险、修改影响 |
| 错误 | `#b85c5c` | 失败状态 |

### 8.3 核心页面

#### 页面1: 项目仪表盘
- 顶部：统计卡片（总项目、总字数、写作中数量）
- 项目卡片网格：书名、状态标签、章节数、字数、最后编辑时间
- 警告标记：有待处理修改影响的项目显示黄色警告

#### 页面2: 大纲工作室（核心）
- 顶部标签栏：信息 / 主题 / 角色 / 情节 / 环境 / 叙事
- 左侧边栏(260px)：情节节点树，可折叠、高亮当前选中
- 右侧主区域：当前模块的编辑界面
  - 主题：文本编辑 + 关键词标签
  - 角色：角色卡片网格，展开编辑详情，OOC风险预警
  - 情节：节点详情 + 章节预估
  - 环境：世界观文档 + 场景卡片
  - 信息：7个分类的折叠面板，每项显示标题+摘要，支持手动触发搜索
  - 叙事：视角/时态/节奏规则编辑
- 底部操作栏：修改影响提示 + "确认大纲 → 开始写作"按钮

#### 页面3: 章节写作（核心）
- 三栏布局：
  - 左侧面板(280px, 可折叠)：本章情节、角色、场景、前情提要
  - 中间写作区：Markdown 渲染，流式显示生成进度，打字光标动画
  - 右侧面板(240px, 可折叠)：生成状态、实时字数、Agent 进度列表
- 底部操作栏：确认发布 / 重新生成 / 手动编辑

### 8.4 交互细节
- 模块标签切换、情节树折叠展开、面板折叠/展开
- 新建项目 Modal → 填写书名和创作需求
- 流式生成模拟：字数实时增长
- Toast 通知系统（成功/警告/错误/信息）
- 键盘快捷键：`Ctrl+1` 仪表盘、`Ctrl+2` 大纲、`Ctrl+3` 写作

---

## 9. 错误处理

### 9.1 LLM 调用失败
- 自动重试最多3次（指数退避）
- 3次均失败 → 停止流程，通过 WebSocket 通知用户
- 用户可选择手动重试或跳过

### 9.2 输出解析失败
- JSON 解析失败 → 尝试修复常见问题（尾部逗号、未闭合括号）
- 仍失败 → 以 text 形式保存原始输出，提示用户手动编辑

### 9.3 超时处理
- 每个 Agent 调用设置 60s 超时
- 超时视为失败，进入重试逻辑

### 9.4 服务重启恢复
- 所有状态持久化在 PostgreSQL
- 服务重启后，读取项目当前状态，从断点继续

---

## 10. 非功能需求

### 10.1 性能
- 大纲构建：< 150s（6次串行 LLM 调用，Information Agent 搜索耗时较长）
- 章节生成：< 60s（单次 LLM 调用 + 上下文组装）
- 补充阶段：< 60s（5次并行 LLM 调用）
- 前端页面加载：< 2s（首屏）

### 10.2 安全
- 用户认证（JWT）
- API 限流（每用户每分钟最多 30 次 LLM 相关调用）
- LLM API Key 服务端管理，不暴露给前端

### 10.3 可扩展
- LLM 抽象层支持多模型切换（配置文件即可）
- Agent 可插拔（新Agent只需实现标准接口）
- 支持多项目并行（不同用户或同一用户多个项目）

### 10.4 目标篇幅
- 支持长篇：50-200章，每章 3000-10000 字
- 总字数上限：约 200 万字

---

## 11. 测试策略（TDD 驱动开发）

> 采用测试驱动开发（Test-Driven Development）：编写功能代码前，先编写失败的测试，然后实现代码使测试通过，最后重构。红 → 绿 → 重构循环。

### 11.1 测试金字塔

```
        ┌───────┐
        │  E2E  │  ← 少量：完整用户流程（大纲构建→写作→补充）
        ├───────┤
        │ 集成   │  ← 中量：Agent管道、API+DB、WebSocket
        ├───────────┤
        │   单元测试   │  ← 大量：纯逻辑、算法、状态机、解析器
        └───────────────┘
```

### 11.2 测试框架

| 层级 | 工具 | 说明 |
|------|------|------|
| **后端单元测试** | pytest + pytest-asyncio | 异步测试支持 |
| **后端集成测试** | pytest + httpx (async) | FastAPI TestClient |
| **LLM Mock** | 自定义 Fixture | 拦截 LLM 调用，返回预定义响应 |
| **数据库测试** | PostgreSQL test database / SQLite | 每个测试独立事务回滚 |
| **前端单元测试** | Vitest + React Testing Library | 组件渲染 + 交互 |
| **前端E2E** | Playwright | 浏览器自动化 |
| **覆盖率** | pytest-cov / Istanbul | 目标：后端≥80%，前端≥70% |

### 11.3 单元测试（核心，优先编写）

#### 11.3.1 调度器状态机（TDD 第一优先级）

这是系统最核心的逻辑，必须在实现前先写好测试。

```python
# 测试用例示例
class TestDispatcherStateMachine:
    def test_idle_to_building_outline(self):
        """IDLE 状态下触发大纲构建 → 进入 BUILDING_OUTLINE"""

    def test_building_outline_runs_6_agents_in_order(self):
        """BUILDING_OUTLINE 状态下，6个Agent严格按顺序执行"""

    def test_outline_complete_transitions_to_awaiting_confirm(self):
        """所有Agent完成后 → AWAITING_OUTLINE_CONFIRM"""

    def test_first_confirm_starts_writing(self):
        """首次确认大纲 → WRITING_CHAPTER"""

    def test_chapter_generated_awaits_confirm(self):
        """章节生成完成 → AWAITING_CHAPTER_CONFIRM"""

    def test_confirm_triggers_supplement(self):
        """确认章节 → SUPPLEMENTING"""

    def test_supplement_returns_to_writing_next_chapter(self):
        """补充完成 → WRITING_CHAPTER（下一章）"""

    def test_user_modify_marks_affected_chapters(self):
        """USER_MODIFY 状态下标记受影响章节"""

    def test_error_retries_then_notifies_user(self):
        """ERROR 状态：重试3次 → 仍失败 → 通知用户"""

    def test_restore_from_persisted_state(self):
        """从数据库恢复状态 → 正确回到断点"""
```

#### 11.3.2 上下文组装算法

```python
class TestContextAssembly:
    def test_assemble_for_chapter_1_loads_outline_summary(self):
        """第1章：无前文，加载大纲摘要替代热数据"""

    def test_assemble_loads_adjacent_chapters_as_hot_data(self):
        """第10章：热数据包含 Ch_8, Ch_9 全文"""

    def test_warm_data_includes_last_10_summaries(self):
        """温数据包含最近10章的摘要"""

    def test_aggregated_summary_used_for_older_chapters(self):
        """超过10章的旧章节使用聚合摘要"""

    def test_token_budget_enforced_at_80_percent(self):
        """Token估算超过模型限制80% → 触发裁剪"""

    def test_trim_order_warum_first_then_hot_window_then_character_cards(self):
        """裁剪顺序：①温数据 ②热窗口 ③角色卡"""

    def test_related_characters_extracted_from_plot_nodes(self):
        """从本章情节节点正确提取关联角色"""

    def test_related_scenes_extracted_from_plot_nodes(self):
        """从本章情节节点正确提取关联场景"""
```

#### 11.3.3 摘要与聚合

```python
class TestSummaryAggregation:
    def test_chapter_summary_generated_on_confirm(self):
        """确认章节后立即生成摘要"""

    def test_aggregate_triggered_every_10_chapters(self):
        """第10、20、30章确认后触发聚合"""

    def test_aggregate_compresses_10_summaries_to_1(self):
        """聚合将10章摘要压缩为1段"""

    def test_summary_includes_character_changes(self):
        """摘要包含角色状态变化"""

    def test_summary_includes_plot_progress(self):
        """摘要包含情节进度"""
```

#### 11.3.4 LLM 抽象层

```python
class TestLLMAbstraction:
    def test_unified_interface_for_different_providers(self):
        """统一接口支持 DeepSeek / Qwen / 文心一言"""

    def test_mock_llm_returns_controlled_output(self):
        """Mock LLM 返回可控输出用于测试"""

    def test_retry_on_timeout(self):
        """超时 → 自动重试"""

    def test_retry_max_3_times(self):
        """最多重试3次 → 仍失败则抛出"""
```

#### 11.3.5 输出解析器

```python
class TestOutputParser:
    def test_parse_valid_json_character_card(self):
        """解析合法的JSON角色卡"""

    def test_fix_trailing_comma(self):
        """修复尾部逗号"""

    def test_fix_unclosed_bracket(self):
        """修复未闭合的括号"""

    def test_fallback_to_raw_text_on_unfixable_json(self):
        """无法修复的JSON → 保存原始文本"""

    def test_extract_chapter_summary_from_writing_output(self):
        """从写作Agent输出中提取章节摘要"""
```

### 11.4 集成测试

```python
class TestAgentPipeline:
    """使用 Mock LLM，测试完整的 Agent 串行管道"""

    def test_full_outline_pipeline_6_agents(self):
        """6个Agent串行执行，每个收到前一个的输出"""

    def test_information_agent_output_feeds_theme_agent(self):
        """Information Agent 的输出注入主题Agent"""

    def test_theme_agent_output_feeds_character_agent(self):
        """主题Agent 的输出注入角色Agent"""

    def test_pipeline_continues_on_agent_error_with_retry(self):
        """单个Agent失败 → 重试 → 继续管道"""


class TestChapterWritingPipeline:
    """写作 + 补充管道"""

    def test_write_then_supplement_cycle(self):
        """写作 → 确认 → 补充 → 下一章"""

    def test_writing_agent_receives_assembled_context(self):
        """写作Agent收到正确组装的上下文"""

    def test_supplement_runs_5_agents_in_parallel(self):
        """补充阶段：5个Agent并行执行（不含Information Agent）"""


class TestAPIEndpoints:
    """API + 数据库集成测试"""

    async def test_create_project_and_build_outline(self):
        """POST /projects → POST /outline/build → GET /outline"""

    async def test_write_next_chapter(self):
        """POST /chapters/next → 返回章节内容"""

    async def test_confirm_chapter_triggers_supplement(self):
        """POST /chapters/{n}/confirm → 触发补充 → WebSocket通知"""

    async def test_retry_chapter_with_guidance(self):
        """POST /chapters/{n}/retry + {guidance} → 重新生成"""

    async def test_manual_edit_chapter(self):
        """PUT /chapters/{n} → 手动编辑保存"""


class TestModificationCascade:
    """修改级联影响"""

    def test_modify_character_marks_affected_chapters(self):
        """修改角色卡 → 标记受影响章节"""

    def test_modification_log_persisted(self):
        """修改记录持久化到 ModificationLog"""

    def test_user_resolves_modification(self):
        """用户选择处理方式 → resolved_at 更新"""
```

### 11.5 E2E 测试（Playwright）

```python
# 关键用户流程的端到端测试
class TestFullUserJourney:
    def test_create_project_to_first_chapter(self):
        """
        完整流程：
        1. 创建项目 + 输入需求
        2. 等待大纲构建完成（6个Agent）
        3. 审阅大纲各模块
        4. 确认大纲
        5. 生成第一章
        6. 确认第一章
        7. 验证补充阶段完成
        """

    def test_modify_character_mid_writing(self):
        """
        中途修改：
        1. 已写5章
        2. 修改角色性格设定
        3. 验证影响标记（哪些章受影响）
        4. 选择处理方式
        5. 继续写作
        """

    def test_regenerate_chapter(self):
        """重新生成章节 + 附带调整指导"""

    def test_export_full_novel(self):
        """导出TXT全文"""
```

### 11.6 前端测试

```typescript
// 组件单元测试
describe('ProjectCard', () => {
  it('renders project title and status badge');
  it('shows warning chip when project has modification impact');
  it('shows word count and chapter count');
  it('navigates to outline studio on click');
});

describe('OutlineStudio', () => {
  it('renders 6 module tabs');
  it('switches content when tab is clicked');
  it('shows plot tree with expandable nodes');
  it('shows modification warning in footer');
  it('disables confirm button when no changes');
});

describe('ChapterWriting', () => {
  it('shows context panel with plot/character/scene info');
  it('displays streaming text with typing cursor');
  it('shows live word count during generation');
  it('enables confirm/retry/edit buttons after generation');
  it('collapses side panels on toggle click');
});

// WebSocket mock
describe('WebSocketIntegration', () => {
  it('updates agent progress on agent_progress event');
  it('shows toast on supplement_done event');
  it('displays error on error event');
});
```

### 11.7 LLM 特殊测试

由于 LLM 调用具有非确定性，以下策略用于保证测试稳定性：

| 策略 | 说明 |
|------|------|
| **Mock LLM** | 所有单元测试和集成测试使用 Mock LLM，返回预定义的确定性输出 |
| **Prompt 契约测试** | 验证生成的 prompt 字符串是否包含必要的结构标记和关键信息，不验证 LLM 输出 |
| **输出 Schema 验证** | 用 Pydantic / JSON Schema 验证解析后的 Agent 输出结构 |
| **真实 LLM 冒烟测试** | 单独的冒烟测试套件，手动触发或 CI 中标记为 `@smoke`，定期运行 |
| **Prompt 版本管理** | 每个 Agent 的 prompt 模板纳入版本控制，修改时需更新对应测试 |

### 11.8 TDD 开发流程

```
1. RED   — 基于设计文档，编写失败测试
2. GREEN — 实现最小代码使测试通过
3. REFACTOR — 优化代码结构，保持测试绿色
4. 提交   — 测试 + 实现一起提交
```

**实施顺序（按依赖关系）：**

| 阶段 | 内容 | 先决条件 |
|------|------|----------|
| **Phase 1** | LLM 抽象层 + Mock + 输出解析器 | 无 |
| **Phase 2** | 数据模型 (PostgreSQL表 + 文件存储) | 无 |
| **Phase 3** | 调度器状态机 + 上下文组装算法 | Phase 1 |
| **Phase 4** | 6个模块Agent (prompt模板 + 输出解析) | Phase 1, 3 |
| **Phase 5** | 写作Agent + 摘要生成 | Phase 1, 3, 4 |
| **Phase 6** | REST API + WebSocket | Phase 2, 3, 4, 5 |
| **Phase 7** | 修改级联逻辑 | Phase 2, 3 |
| **Phase 8** | 前端页面 + 组件 | Phase 6 |

每个 Phase 内严格遵循 TDD：先写测试 → 用户确认测试用例 → 实现 → 验证。

---

## 12. 版本控制策略

### 12.1 仓库

- **平台**：Git（本地仓库），未来可推送至 GitHub / GitLab
- **主分支**：`main` — 始终保持可发布状态
- **初始化**：已完成 `git init` + 初始提交（设计文档 + 前端原型）

### 12.2 分支模型

```
main          ★── 生产就绪，每个 milestone 合并一次
  │
  ├─ develop      ◆── 日常开发集成分支
  │    │
  │    ├─ phase/01-llm-abstraction     LLM 抽象层 + Mock + 输出解析
  │    ├─ phase/02-data-model          PostgreSQL 表 + 文件存储 + CRUD
  │    ├─ phase/03-dispatcher          调度器状态机 + 上下文组装算法
  │    ├─ phase/04-module-agents       6个模块Agent (prompt 模板 + 解析)
  │    ├─ phase/05-writing-agent       写作Agent + 摘要生成 + 聚合
  │    ├─ phase/06-api-websocket       REST API + WebSocket 实时推送
  │    ├─ phase/07-modification        修改级联逻辑
  │    └─ phase/08-frontend            前端页面 + 组件
  │
  └─ fix/*                            紧急修复分支（从 main 拉出）
```

### 12.3 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能开发 | `phase/{序号}-{名称}` | `phase/03-dispatcher` |
| 紧急修复 | `fix/{描述}` | `fix/context-token-overflow` |
| 实验性 | `exp/{描述}` | `exp/rag-context-retrieval` |
| 发布准备 | `release/{版本号}` | `release/v0.1.0` |

### 12.4 关键 Milestone 与版本标签

每个 Phase 完成后合并到 `main` 并打标签：

| 标签 | Phase | 内容 | 可演示功能 |
|------|-------|------|-----------|
| `v0.1.0` | 1+2 | LLM 抽象层 + 数据模型 | 数据库建表，Mock LLM 可返回预设响应 |
| `v0.2.0` | 3 | 调度器状态机 | 状态机在 Mock 下正确流转 |
| `v0.3.0` | 4 | 6个模块Agent | 大纲构建流程跑通（Mock LLM） |
| `v0.4.0` | 5 | 写作Agent | 章节生成 + 摘要跑通（Mock LLM） |
| `v0.5.0` | 6 | API + WebSocket | 后端完整可调用的 API |
| `v0.6.0` | 7 | 修改级联 | 修改→标记→处理流程 |
| `v0.7.0` | 8 | 前端 MVP | 仪表盘 + 大纲工作室 + 章节写作 |
| `v1.0.0` | — | 真实 LLM 集成 + 冒烟测试 | 完整可用产品 |

### 12.5 合并流程

```
1. 从 develop 拉出 feature 分支：phase/0X-xxx
2. 在 feature 分支上 TDD 开发：
   a. 写测试 → 提交
   b. 实现代码 → 提交
   c. 重构 → 提交
3. 所有测试通过 → PR/MR 到 develop
4. develop 集成测试通过 → 合并到 main
5. 在 main 上打 tag → 标记版本
```

### 12.6 Commit 规范

使用 Conventional Commits：

```
<type>(<scope>): <description>

[optional body]
```

| Type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `test` | 添加/修改测试 |
| `refactor` | 重构（无功能变化） |
| `docs` | 文档 |
| `chore` | 构建/工具/依赖 |

**示例：**
```
feat(dispatcher): add state machine with 9 states

- IDLE → BUILDING_OUTLINE → AWAITING_OUTLINE_CONFIRM → ...
- State persistence to PostgreSQL
- WebSocket notification on state change

Closes #12
```

```
test(context): add token budget enforcement tests

- Test 80% threshold triggers trimming
- Test trim order: warm → hot → character cards
```

### 12.7 .gitignore 已配置

忽略规则覆盖：Python、Node、IDE、环境变量、用户生成内容（`projects/`）、日志、数据库文件。

---

## 13. 附录：前端原型

完整交互原型位于：`frontend-design/index.html`
直接用浏览器打开即可体验三个核心页面的交互流程。
