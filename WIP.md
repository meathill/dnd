# WIP

## 当前目标

在 `packages/website` 内补齐一条无需登录、无需数据库的本地体验闭环：

1. 基于 `coc-7e-lite` 制作模组
2. 本地创建调查员人物卡
3. 本地游玩并执行基础检定
4. 本地导出战报

## 当前判断

- COC 比 DND 更适合新手入坑，当前优先支持 COC。
- 规则书仍然是第 0 层能力，模组和跑团都应建立在规则书实体之上。
- 明早需要可直接测试，因此当前优先级是本地闭环可用，不先卡在登录、数据库或管理权限。
- 本地玩法第一版不接正式 `/api/chat`，改用前端本地 runner + 现有规则执行器。

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

### Phase 5: 本地闭环页
- [ ] 新增本地体验入口，首页可直接进入
- [ ] 复用 `ScriptEditorForm` 作为本地模组编辑器
- [ ] 复用 `CharacterCreator` 作为本地建卡器
- [ ] 新增本地 runner，串起输入分析、检定执行和叙事 fallback
- [ ] 复用 `CharacterCardPanel` / `SceneMapPanel` 展示侧栏状态
- [ ] 支持本地导出 `Markdown` / `JSON` 战报
- [ ] 使用 `localStorage` 保存本地草稿、人物卡和战报会话

### Phase 6: 验证与收尾
- [ ] 补针对性单测 / smoke test
- [ ] 跑格式化
- [ ] 跑类型检查
- [ ] 跑构建
- [ ] 跑本地闭环相关测试

---

## 暂缓事项

- [ ] 纯浏览器 Agent Loop 落地
- [ ] 登录态下的正式游戏链路优化
- [ ] DND / 其他规则系统接入
- [ ] 围绕某个 SDK 进行深度绑定式重构

## 遗留 / Backlog

- [ ] 数据库 migration 增加 `ruleset_id`
- [ ] 全局地图功能补全
- [ ] 编辑器表单与 DM 隐藏信息
- [ ] Gemini 或其他模型接入策略评估
