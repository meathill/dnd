# WIP

## 当前目标

当前阶段主线明确如下：

1. 先做出给普通 AI Agent 使用的 SKILLS
2. 把这些 SKILLS 放到 CC / Codex / OpenCode 一类 Agent 中，使用它们自带的 AI provider 实战验证
3. 如果 SKILLS 能力满足预期，再考虑本地 runner 或基于某个 Agent SDK 打包
4. 最后再考虑发布线上版本

## 当前判断

- COC 比 DND 更适合新手入坑，当前优先支持 COC。
- 规则书仍然是第 0 层能力，skills 和模组都应建立在规则书实体之上。
- 当前阶段的“本地环境”指工作区文件，不是浏览器 `localStorage`，也不是数据库。
- 前端页面可以保留为试验产物，但不再作为当前主线继续扩展。
- 当前 runner 只作为最小验证工具，不应反过来主导 SKILLS 设计。
- 近期验证路径应优先面向外部通用 Agent，而不是先围绕某个 SDK 封装运行时。
- 现有 `packages/website/src/lib/ai/dm-tools.ts` 有可复用定义，但目前仍与 `@openai/agents` 耦合，需要抽成普通 AI Agent 也能消费的 contract。

## 已完成

### Phase 1: COC 规则书底座
- [x] 定义规则书实体类型与引用类型
- [x] 创建 `coc-7e-lite` 最小规则包
- [x] 提供规则书查询、实体读取函数
- [x] 提供 COC 场景风险评估函数

### Phase 2: 模组结构接入
- [x] `ScriptDefinition` 增加 `rulesetId`
- [x] 遭遇和 NPC 支持规则书引用
- [x] 剧本解析器支持缺省 `coc-7e-lite`
- [x] 示例剧本接入默认规则书

### Phase 3: Prompt / Skills 规范化
- [x] 更新 DM system prompt：先规则书，再模组，再主持游戏
- [x] 更新 skills 文档：新增规则书能力组
- [x] 明确 COC 风险评估与可玩性校验的职责边界

### Phase 4: 测试验证
- [x] 覆盖规则书查询测试
- [x] 覆盖标准实体读取测试
- [x] 覆盖 COC 场景风险评估测试
- [x] 覆盖模组解析默认 `rulesetId` 与规则书引用测试

## 当前进行中

### Phase 5: Skills Contract
- [x] 抽离规则书能力组的通用 skill schema
- [ ] 抽离模组制作能力组的通用 skill schema
- [x] 抽离 `roll_dice` / `create_temp_npc` / `roleplay_npc` 的通用 contract
- [x] 明确每个 skill 的入参、出参、触发条件、禁止行为
- [ ] 补充适合 CC / Codex / OpenCode 直接消费的 skills 使用说明与示例

### Phase 6: 本地文件存储
- [x] 设计 `data/modules` / `data/characters` / `data/reports` 目录结构
- [x] 定义文件命名与元数据字段
- [x] 提供读写本地文件的最小工具层
- [x] 让生成的模组、人物卡、战报落盘到工作区

### Phase 7: 外部 Agent 验证
- [ ] 准备面向通用 Agent 的 skills 目录与接入说明
- [ ] 用至少一种外部 Agent 验证规则书查询、检定、记录落盘闭环
- [ ] 记录哪些能力满足预期，哪些能力还需要补充或收敛

### Phase 8: 最小验证入口
- [x] 提供最小 runner / 脚本入口验证 skills
- [x] 补针对性测试
- [ ] 跑格式化
- [ ] 跑构建与相关测试

---

## 暂缓事项

- [ ] 纯浏览器 Agent Loop 落地
- [ ] 继续扩张本地试玩页 UI
- [ ] DND / 其他规则系统接入
- [ ] 围绕某个 SDK 进行深度绑定式重构

## 遗留 / Backlog

- [ ] 数据库 migration 增加 `ruleset_id`
- [ ] 统一 website 侧与本地文件侧的数据模型桥接
- [ ] 全局地图功能补全
- [ ] 编辑器表单与 DM 隐藏信息
- [ ] Gemini 或其他模型接入策略评估
