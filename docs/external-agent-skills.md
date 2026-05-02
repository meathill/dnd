# 外部 Agent Skills 接入说明

本文档用于把当前项目的 `skills/` 目录接入外部通用 AI Agent，例如 CC、Codex、OpenCode。

## 当前目标

当前阶段不是先做本地 runner，也不是先做线上版本，而是优先验证：

1. 这些 `SKILLS` 是否足够支撑规则书查询、模组整理、检定与记录落盘
2. 外部 Agent 是否能正确选择和调用这些 `SKILLS`
3. `SKILLS` 的输入/输出 contract 是否稳定、清晰、易消费

## 工作区约定

- `skills/`: 每个 skill 一个 JSON contract 文件
- `prompts/dm-system-prompt.md`: 当前默认 system prompt
- `data/modules`: 模组文件
- `data/characters`: 人物卡文件
- `data/reports`: 战报文件

## 建议接入方式

### 0. 通过 `skills` CLI 安装

当前主线是兼容 `skills` CLI。

当仓库推到远端后，可以直接这样安装：

```bash
npx skills add meathill/dnd
```

如果只想看仓库中可安装的 skills：

```bash
npx skills add meathill/dnd -l
```

如果只装某几个技能：

```bash
npx skills add meathill/dnd --skill roll_dice patch_npc save_local_report
```

安装后，`skills` CLI 会把技能包安装到目标项目的 `.agents/skills/<name>/`。

### 1. 给 Agent 提供 system prompt

把 `prompts/dm-system-prompt.md` 作为基础 system prompt。

### 2. 给 Agent 注册 skills

读取 `skills/<name>/SKILL.md`，按宿主 Agent 的技能协议安装和触发。

当前第一批能力分为四组：

- 规则书：`select_ruleset`、`search_rulebook`、`get_rule_entry`、`get_standard_npc`、`get_creature_profile`、`estimate_scene_risk`、`validate_module_playability`
- 模组制作：`patch_basic`、`patch_background`、`patch_npc`、`remove_npc`、`patch_scene`、`remove_scene`、`patch_options`
- 游戏：`roll_dice`、`create_temp_npc`、`roleplay_npc`
- 记录：`save_local_module`、`save_local_character`、`save_local_report`、`list_local_artifacts`

### 3. 对接执行层

外部 Agent 目前优先走 `SKILL.md` 安装路径。

项目内部仍保留 TypeScript 执行层，供本地测试与未来 runner 参考，但它不再是当前对外主接口。

## 外部 Agent 使用模板

下面这段可以直接作为外部 Agent 的启动说明模板：

```text
你现在负责主持一个基于 COC 的 TRPG 测试会话。

请遵守以下规则：
1. 默认使用中文。
2. 优先使用已经注册的 skills，而不是在正文里伪造工具结果。
3. 没有规则系统时，先调用 select_ruleset。
4. 需要标准规则、标准 NPC、怪物或风险评估时，优先调用规则书相关 skills。
5. 需要补完模组结构时，调用 patch_basic / patch_background / patch_npc / patch_scene / patch_options 等 skills。
6. 需要判定时必须调用 roll_dice。
7. 需要保存模组、人物卡、战报时，必须调用 save_local_module / save_local_character / save_local_report。
8. 不直接泄露隐藏信息，不越权替玩家决定动作。

本次验证目标：
- 验证你是否会正确选择 skills
- 验证 skills 的参数是否填写合理
- 验证你是否能把模组、人物卡、战报落盘
```

## 验证 Checklist

### A. Skills 注册

- [ ] Agent 能读取 `prompts/dm-system-prompt.md`
- [ ] Agent 能安装或读取 `skills/<name>/SKILL.md`
- [ ] Agent 能识别 4 组能力：规则书 / 模组制作 / 游戏 / 记录

### B. 规则书闭环

- [ ] 能调用 `select_ruleset`
- [ ] 能调用 `search_rulebook`
- [ ] 能调用 `get_standard_npc` 或 `get_creature_profile`
- [ ] 能调用 `estimate_scene_risk`

### C. 模组制作闭环

- [ ] 能调用 `patch_basic`
- [ ] 能调用 `patch_background`
- [ ] 能调用 `patch_npc`
- [ ] 能调用 `patch_scene`
- [ ] 返回的是结构化 patch，而不是散文式建议

### D. 游戏闭环

- [ ] 玩家调查时能调用 `roll_dice`
- [ ] 临时 NPC 出现时能调用 `create_temp_npc`
- [ ] 关键 NPC 发言前能调用 `roleplay_npc`

### E. 记录闭环

- [ ] 能调用 `save_local_module`
- [ ] 能调用 `save_local_character`
- [ ] 能调用 `save_local_report`
- [ ] 目标目录下真的生成了对应文件

### F. 质量判断

- [ ] tool 选择是否合理
- [ ] 参数是否稳定、简洁、不过度冗余
- [ ] 返回格式是否稳定
- [ ] 是否有明显漏调 / 滥调 skills
- [ ] 是否仍然依赖正文假装“已经调用过工具”

## 建议验证顺序

1. 先做规则书查询
2. 再做模组 patch
3. 再做一次短对话检定
4. 最后验证落盘

## 建议优先验证的 Case

### Case 1: 规则书查询

- 用户："帮我找一个适合 COC 新手模组的敌对人类模板"
- 预期：Agent 调用 `search_rulebook` 或 `get_standard_npc`

### Case 2: 模组补完

- 用户："给这个模组补一个会在开场提供线索的邻居 NPC"
- 预期：Agent 调用 `patch_npc`

### Case 3: 场景风险检查

- 用户："评估这个地下室高潮场景会不会对新手太难"
- 预期：Agent 调用 `estimate_scene_risk`

### Case 4: 游戏检定

- 用户："我检查门口血迹"
- 预期：Agent 调用 `roll_dice`

### Case 5: 记录落盘

- 用户："把这个模组和我的人物卡保存下来"
- 预期：Agent 调用 `save_local_module` 与 `save_local_character`

## 当前不建议过早做的事

- 不要先围绕某个 Agent SDK 重构整套技能定义
- 不要先把 website UI 继续做大
- 不要先为了线上部署改写整套运行时

## 验证完成后的下一步

如果外部 Agent 验证表明这些 skills 足够稳定，再进入下一阶段：

1. 收敛技能边界与返回格式
2. 评估是否需要本地 runner
3. 再考虑 SDK 打包与线上版本
