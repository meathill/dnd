// 自动生成，请勿手工编辑。运行 pnpm skills:build 重新生成。
// 数据源：repo/skills/*/SKILL.md
import type { SkillManifestEntry } from './types';

export const SKILL_MANIFEST: ReadonlyArray<SkillManifestEntry> = [
  {
    name: 'create_character',
    description: '基于当前剧本生成一张可落盘的人物卡，并返回校验结果。',
    scenarios: ['authoring', 'play'],
    body: '# 创建人物卡\n基于当前剧本生成一张可落盘的人物卡，并返回校验结果。\n## When to use\n\n- 开始 COC 小冒险前需要快速车卡时。\n- AI 需要根据剧本约束生成一张结构化调查员卡时。\n## Do not\n\n- 只给出散文式角色设定，不真正生成结构化人物卡。\n- 忽略剧本的职业、出身、装备或技能约束。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'create_module',
    description: '串联模组创作完整流程：先确认 Meta，再依次补完背景、场景、NPC、可选项，最后校验与落盘。',
    scenarios: ['authoring'],
    body: '# 创作一个新模组\n\n把一段创作意图落成可玩的模组。本 skill 不直接执行动作，只编排其它 skill。\n\n## When to use\n\n- 用户想从零创作一个新模组。\n- 模组草稿初步成形，需要按规范补完结构。\n- 模组接近发布，需要再次自查可玩性。\n\n## Do not\n\n- 越过 editor 的意图自行决定题材或难度。\n- 跳过 Meta / 背景 / 场景任何一步直接落盘。\n- 仅在正文里声称已保存而没有调用 `save_local_module`。\n\n## Contract\n\n按以下顺序与 editor 协作，每一步都要把结果展示给 editor 确认或修改后再进入下一步。\n所有结构化变更都必须通过对应 patch_/save_local_ skill 落盘，不要在自然语言里伪造结果。\n\n## Usage\n\n1. **对齐 Meta**\n    - 与 editor 确认题材、规则书（默认 `coc-7e-lite`）、难度、预计时长、玩家人数。\n    - 检查工作区 `meta.json` 是否已存在；若已有，先复述当前 Meta 再问改动。\n\n2. **基础信息**\n    - 调用 `patch_basic` 写入或修订 title / summary / setting / difficulty。\n\n3. **背景与世界观**\n    - 调用 `patch_background` 写入 overview / truth / themes / factions / locations / explorableAreas / secrets。\n    - 必要时通过 `search_rulebook`、`get_rule_entry` 引用规则书条目。\n\n4. **NPC**\n    - 重要 NPC 用 `patch_npc` 写入；标准 NPC 优先复用 `get_standard_npc`。\n    - 不需要的占位 NPC 通过 `remove_npc` 移除。\n\n5. **场景**\n    - 用 `patch_scene` 写入每个关键场景，包含 description / dmNotes / hooks / risks。\n    - 通过 `estimate_scene_risk` 视情况标注风险。\n    - 不需要的场景通过 `remove_scene` 移除。\n\n6. **可选项与分支**\n    - 用 `patch_options` 写入分支选项、奖励与失败后果。\n\n7. **可玩性校验**\n    - 调用 `validate_module_playability`，把警告反馈给 editor。\n    - 修复 critical 级问题后再进入落盘。\n\n8. **落盘**\n    - 调用 `save_local_module` 把当前 data_json 写入工作区 `data/modules/{slug}.json`。\n    - 落盘后告诉 editor「已保存」并展示文件路径。\n\n## 输出倾向\n\n- 每一步都先列「我打算调用 X skill」，再执行。\n- 不要一次输出整个模组的 JSON，分阶段递进，方便 editor 检阅。\n- 中文交流，专有名词保留原文。',
  },
  {
    name: 'create_temp_npc',
    description: '为现场交互需要的临时 NPC 生成即时人物卡。',
    scenarios: ['play'],
    body: '# 创建临时 NPC\n为现场交互需要的临时 NPC 生成即时人物卡。\n## When to use\n\n- 玩家与未预设的酒保、路人、门卫、店员、目击者等交互时。\n## Do not\n\n- 对关键 NPC 使用这个 skill 替代正式档案。\n- 同一个临时 NPC 反复重建导致设定漂移。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'estimate_scene_risk',
    description: '根据规则书引用、线索门槛与理智损失估算 COC 场景风险。',
    scenarios: ['play'],
    body: '# 评估场景风险\n根据规则书引用、线索门槛与理智损失估算 COC 场景风险。\n## When to use\n\n- 制作模组时判断场景风险是否超标。\n- 需要估算战斗风险、理智风险和卡关风险时。\n## Do not\n\n- 忽略关键线索门槛造成的卡关风险。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'get_creature_profile',
    description: '读取规则书中的怪物或超自然威胁模板。',
    scenarios: ['authoring', 'play'],
    body: '# 读取怪物模板\n读取规则书中的怪物或超自然威胁模板。\n## When to use\n\n- 需要怪物/威胁模板时。\n- 评估超自然场景的战斗和理智压力时。\n## Do not\n\n- 不查档案就自由发挥关键规则实体。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'get_rule_entry',
    description: '按 id 读取单个规则说明、技能条目、模板或怪物档案。',
    scenarios: ['authoring', 'play'],
    body: '# 读取规则书实体\n按 id 读取单个规则说明、技能条目、模板或怪物档案。\n## When to use\n\n- 搜索到条目后需要读取完整结构化结果时。\n- 游戏中需要解释标准规则、标准 NPC 或怪物能力时。\n## Do not\n\n- 不查档案就自由发挥关键规则实体。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'get_standard_npc',
    description: '读取规则书中的标准 NPC 模板。',
    scenarios: ['authoring', 'play'],
    body: '# 读取标准 NPC 模板\n读取规则书中的标准 NPC 模板。\n## When to use\n\n- 需要标准 NPC 模板时。\n- 模组中需要快速引用新手友好的标准人类对手或证人模板时。\n## Do not\n\n- 不查档案就自由发挥关键规则实体。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'list_local_artifacts',
    description: '列出工作区中已经保存的模组、人物卡或战报。',
    scenarios: ['authoring', 'play'],
    body: '# 列出本地产物\n列出工作区中已经保存的模组、人物卡或战报。\n## When to use\n\n- 需要查看当前工作区已有本地产物时。\n- 在保存前后确认持久化结果时。\n## Do not\n\n- 重复生成已存在产物而不先检查。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'patch_background',
    description: '修改模组背景章节，包括总览、核心真相、主题、势力、地点和隐藏要点。',
    scenarios: ['authoring'],
    body: '# 修改模组背景\n修改模组背景章节，包括总览、核心真相、主题、势力、地点和隐藏要点。\n## When to use\n\n- 用户要求补背景、核心真相、主题或隐藏信息时。\n- 需要把世界观信息整理成结构化背景时。\n## Do not\n\n- 把未确认的候选设定直接当成既定事实。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'patch_basic',
    description: '修改模组的标题、简介、背景设定与难度，只返回结构化 patch 建议。',
    scenarios: ['authoring'],
    body: '# 修改模组基础信息\n修改模组的标题、简介、背景设定与难度，只返回结构化 patch 建议。\n## When to use\n\n- 用户要求调整模组标题、简介、设定或难度时。\n- 需要把散乱描述整理为基础信息时。\n## Do not\n\n- 没有明确修改字段时瞎补内容。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'patch_character',
    description: '基于现有人物卡应用局部修改，并返回更新后的结构化结果与校验状态。',
    scenarios: ['play'],
    body: '# 修改人物卡\n基于现有人物卡应用局部修改，并返回更新后的结构化结果与校验状态。\n## When to use\n\n- 需要调整人物卡的属性、技能、装备或背景字段时。\n- AI 已有一张人物卡，需要在原卡基础上做小改动时。\n## Do not\n\n- 重新生成整张人物卡覆盖已有 id 和时间戳。\n- 人物卡属于别的剧本时仍强行在当前剧本下修改。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'patch_npc',
    description: '新增或更新一个 NPC，只返回结构化 patch 建议。',
    scenarios: ['authoring'],
    body: '# 新增或修改 NPC\n新增或更新一个 NPC，只返回结构化 patch 建议。\n## When to use\n\n- 用户要求补充、修改关键 NPC 时。\n- 需要把 NPC 设定整理为结构化档案时。\n- **用 `save_local_character` 保存了关键 NPC 独立卡牌后，必须紧接着调用此 skill**，在模组的 `npcs` 数组中对应条目添加 `type: "key_npc"` 和 `card_ref: "data/characters/<file>.json"`，保持模组与独立卡牌同步。\n\n## Do not\n\n- 更新现有 NPC 时编造不存在的 id。\n- 保存了独立 NPC 卡牌后跳过此步骤——模组 NPC 条目与独立卡牌文件必须保持双向关联。\n\n## 关键 NPC vs 临时 NPC\n\n| 类型 | 判断标准 | 处理方式 |\n|------|---------|----------|\n| 关键 NPC | 全程出现、有谈判树/战斗属性/触发脚本 | `save_local_character` 保存独立卡牌，然后 `patch_npc` 添加 `card_ref` |\n| 临时 NPC | 单场景路人、信息提供者 | `create_temp_npc` 即时生成，无需持久化 |\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'patch_options',
    description: '修改模组的装备、出身、buff、debuff 选项池，只返回结构化 patch 建议。',
    scenarios: ['authoring'],
    body: '# 修改模组选项池\n修改模组的装备、出身、buff、debuff 选项池，只返回结构化 patch 建议。\n## When to use\n\n- 用户要求调整可选装备、出身、buff 或 debuff 时。\n## Do not\n\n- 把增量 patch 误当成追加，导致列表语义不清。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'patch_scene',
    description: '新增或更新一个场景，只返回结构化 patch 建议。',
    scenarios: ['authoring'],
    body: '# 新增或修改场景\n新增或更新一个场景，只返回结构化 patch 建议。\n## When to use\n\n- 用户要求补场景、重写场景或调整线索钩子时。\n## Do not\n\n- 更新现有场景时编造不存在的 id。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'remove_npc',
    description: '删除指定 id 的 NPC，只返回结构化删除建议。',
    scenarios: ['authoring'],
    body: '# 删除 NPC\n删除指定 id 的 NPC，只返回结构化删除建议。\n## When to use\n\n- 用户明确要求移除某个 NPC 时。\n## Do not\n\n- 不明确目标 id 时误删 NPC。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'remove_scene',
    description: '删除指定 id 的场景，只返回结构化删除建议。',
    scenarios: ['authoring'],
    body: '# 删除场景\n删除指定 id 的场景，只返回结构化删除建议。\n## When to use\n\n- 用户明确要求移除某个场景时。\n## Do not\n\n- 不明确目标 id 时误删场景。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'roleplay_npc',
    description: '在扮演关键 NPC 前先读取模组中的预设档案。',
    scenarios: ['play'],
    body: '# 读取关键 NPC 档案\n在扮演关键 NPC 前先读取模组中的预设档案。\n## When to use\n\n- 需要让关键 NPC 开口说话时。\n- 需要引用关键 NPC 的立场、能力、秘密或战术时。\n## Do not\n\n- 不查档案就自由发挥关键 NPC。\n- 给 NPC 添加模组中不存在的重要设定。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'roll_dice',
    description: '执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。',
    scenarios: ['play'],
    body: '# 执行检定\n\n执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。\n**必须在 `validate_player_action` 输出检定参数后才能调用本 skill。**\n\n## When to use\n\n- 技能检定。\n- 属性检定。\n- 幸运检定。\n- 理智检定。\n- 战斗技能判定。\n\n## Do not\n\n- 不调用本 skill 就直接宣布成功或失败。\n- 把纯叙事动作滥用成检定。\n- 在 `validate_player_action` 之前调用本 skill。\n\n## Dice Function Specification\n\n### rollD100(mode)\n\n所有 COC 检定均使用 d100（1-100）。  \n为便于将来替换为动画实现，**必须使用以下伪函数形式描述掷骰过程**，\n不得在正文中直接写死数字。\n\n```\nrollD100(mode: "normal" | "advantage" | "disadvantage") -> { tens: number, units: number, result: number }\n```\n\n- `normal`：投一次，`result = tens * 10 + units`（00+0 = 100）\n- `advantage`（奖励骰）：投两个十位骰，取**较小**十位 + 一个个位骰\n- `disadvantage`（惩罚骰）：投两个十位骰，取**较大**十位 + 一个个位骰\n\n**绝对禁止 AI 凭感觉编造数字。** 必须通过 `run_command` 工具调用本地脚本生成。\n命令行调用示例（在工作区根目录下执行）：\n`node .agents/skills/roll_dice/scripts/roll.js d100 <mode> [skillValue]`\n若提供 `skillValue`，脚本的输出会自动包含检定等级 (`resolution`)。\n\n### 伤害骰 rollDamage(notation)\n\n```\nrollDamage(notation: string) -> { rolls: number[], total: number }\n```\n例：`rollDamage("1d6+2")` → `{ rolls: [4], total: 6 }`\n\n## Resolution Table\n\n| 检定结果 | 条件 |\n|----------|------|\n| **极难成功** (大成功) | result ≤ final_value / 5（向下取整） |\n| **困难成功** | result ≤ final_value / 2（向下取整） |\n| **普通成功** | result ≤ final_value |\n| **失败** | result > final_value |\n| **大失败** | final_value < 50 时，result ≥ 96；final_value ≥ 50 时，result = 100 |\n\n## Output Format\n\n执行完毕后，以如下格式展示（Markdown 块）：\n\n```\n🎲 【检定】图书馆使用\n   技能值：50 + 修正10 = 60\n   骰子模式：advantage（奖励骰）\n   投骰：rollD100("advantage") → 十位[3,5]取3，个位[7] → 结果：37  [AI模拟]\n   判定：37 ≤ 60 → ✅ 成功\n   效果：获得刘铁柱完整档案细节 + 关键回忆（谈判软肋）\n```\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n\n## Usage\n1. 接收 `validate_player_action` 输出的检定参数结构体。\n2. 调用 `rollD100(mode)` 获得骰点。\n3. 对照 Resolution Table 判定结果。\n4. 输出格式化展示块。\n5. 将结果返回给 GM 叙事流程，**由 GM 叙述后果后停下，等待玩家决策**。',
  },
  {
    name: 'save_dm_note',
    description: '把游戏中产生的线索、道具、状态变化写入 DM 笔记，供后续查询。',
    scenarios: ['play'],
    body: '# 保存 DM 笔记\n\n把游戏过程中产生的线索、获得的道具、NPC 状态变化、时间线进展\n写入工作区 `data/sessions/<session-id>/dm-notes.md`，供日后查询与续档。\n\n## When to use\n\n- 玩家获得新线索（clue）时。\n- 玩家获得或失去道具（prop）时。\n- NPC 态度发生明显变化（好感+/-、已说服、已对抗）时。\n- 时间线发生推进（到达新地点、触发事件）时。\n- 检定产生重要后果时（大成功/大失败）。\n\n## Do not\n\n- 只在对话里描述而不落盘。\n- 重复写入未发生变化的信息。\n- 把隐藏真相（hidden_truth）写入玩家可见区域。\n\n## File Structure\n\n笔记文件路径：`data/sessions/<session-id>/dm-notes.md`\n\n`session-id` 格式：`<module-id>-<YYYYMMDD>`，例：`zhumadian-exorcist-20260503`\n\n文件为 Markdown，frontmatter 记录元数据，正文按分节追加：\n\n```markdown\n---\nmodule: zhumadian-exorcist\nsession: zhumadian-exorcist-20260503\ninvestigator: wang-fugui\nstarted_at: "2026-05-03T22:00:00+08:00"\nin_game_time: "14:00"\n---\n\n## 📋 已获得线索\n\n| id | 内容摘要 | 获取方式 | 场景 |\n|----|----------|----------|------|\n| clue-01 | 张建国：今晚仪式，可一起去 | 必经叙事 | S01 |\n| clue-02 | 获得手绘地图 | 必经叙事 | S01 |\n\n## 🎒 当前道具\n\n| id | 道具名 | 来源 | 状态 |\n|----|--------|------|------|\n| prop-01 | 手绘地图 | 张建国 | 持有 |\n| eq-torch | 手电筒 | 初始装备 | 持有 |\n\n## 👥 NPC 状态\n\n| NPC | 初始态度 | 当前态度 | 变化原因 |\n|-----|----------|----------|----------|\n| 张建国 | 客气·半信半疑 | 信任 | 王富贵老相识 |\n\n## ⏰ 时间线进展\n\n| 游戏内时间 | 事件 |\n|-----------|------|\n| 14:00 | 到达派出所，完成开场 |\n\n## 🎲 重要检定记录\n\n| 场景 | 技能 | 结果 | 效果 |\n|------|------|------|------|\n```\n\n## Append Procedure\n\n每次触发本 skill 时：\n1. 用 `view_file` 读取现有笔记文件（若不存在则创建）。\n2. 仅在对应分节末尾追加新内容，不重写全文。\n3. 更新 frontmatter 中的 `in_game_time`。\n4. 用 `write_to_file`（Overwrite=true）写回完整文件。\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n\n## Usage\n1. 判断触发条件（线索/道具/NPC状态/时间线/检定）是否满足。\n2. 读取现有笔记，定位要追加的分节。\n3. 拼装新行，追加写入。\n4. 向 GM 叙事流程返回"已记录"确认，不中断游戏节奏。',
  },
  {
    name: 'save_local_character',
    description: '把结构化人物卡写入工作区 `data/characters`。',
    scenarios: ['authoring', 'play'],
    body: '# 保存人物卡到本地文件\n把结构化人物卡写入工作区 `data/characters`。\n## When to use\n\n- 玩家角色创建完成后需要落盘时。\n- AI 生成或更新人物卡后需要写入工作区文件时。\n- **关键 NPC 创建完成后**：关键 NPC（全程出现、有谈判树/战斗属性/触发脚本的 NPC）也应用此 skill 保存独立卡牌，文件名建议以 `npc-` 为前缀（如 `npc-zhang-jianguo.json`）。\n\n## Do not\n\n- 只在上下文里临时持有角色，不做持久化。\n- 保存关键 NPC 卡牌后忘记调用 `patch_npc` 在模组中添加 `card_ref` 关联。\n\n## 保存后续步骤\n\n| 角色类型 | 保存后必做 |\n|---------|----------|\n| 玩家角色 | 无需额外步骤 |\n| 关键 NPC | 调用 `patch_npc` 在模组 `npcs[id]` 中添加 `type: "key_npc"` 和 `card_ref` |\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'save_local_module',
    description: '把结构化模组写入工作区 `data/modules`。',
    scenarios: ['authoring'],
    body: '# 保存模组到本地文件\n把结构化模组写入工作区 `data/modules`。\n## When to use\n\n- 模组草稿确认后需要落盘时。\n- AI 生成模组后需要写入工作区文件时。\n## Do not\n\n- 只在自然语言里声称已保存，但没有真正写入文件。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'save_local_report',
    description: '把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。',
    scenarios: ['play'],
    body: '# 保存战报到本地文件\n把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。\n\n## 当生成战报时（附录处理）\n为了保证玩家原始语言的真实性和完整记录，**严禁 AI 凭感觉总结聊天记录**，必须使用内置的解析脚本处理。\n- 撰写完 Markdown 战报正文后，**必须**使用 `run_command` 调用本地脚本生成附录：\n  ```bash\n  node .agents/skills/save_local_report/scripts/append_chat.js <overview_txt_path> <report_markdown_path>\n  ```\n- `<overview_txt_path>` 是系统提供的对话日志 `overview.txt` 的绝对路径。\n- `<report_markdown_path>` 是刚刚写入本地的战报文件的绝对路径。\n\n## When to use\n\n- 每轮或每段游戏总结后需要沉淀战报时。\n- 导出本地战报时。\n\n## Do not\n\n- 只在对话里总结而不落盘。\n- 漏掉完整聊天记录的附录。\n- 尝试通过 AI 纯文本提取代替脚本提取（AI容易漏字或篡改玩家语言）。\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 撰写战报正文内容，保存到 `data/reports` 目录。\n3. 执行 `node .agents/skills/save_local_report/scripts/append_chat.js` 自动追加聊天记录附录。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'search_rulebook',
    description: '搜索 COC 最小规则库中的技能、模板、怪物和规则条目。',
    scenarios: ['authoring', 'play'],
    body: '# 搜索规则书实体\n搜索 COC 最小规则库中的技能、模板、怪物和规则条目。\n## When to use\n\n- 需要标准技能、职业、怪物或 NPC 模板时。\n- 模组制作中需要确认标准条目而不是自己硬编时。\n## Do not\n\n- 规则书已经有标准实体时，重新编造一套不一致的数据。\n- 导入商业规则书全文。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'select_ruleset',
    description: '列出当前可用规则系统，默认返回 coc-7e-lite。',
    scenarios: ['authoring', 'play'],
    body: '# 选择规则系统\n列出当前可用规则系统，默认返回 coc-7e-lite。\n## When to use\n\n- 开始制作模组前确认当前规则系统。\n- 用户未明确说明规则系统时回到 COC 默认值。\n## Do not\n\n- 把模组特例误当作规则书默认规则。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'validate_character',
    description: '检查人物卡是否满足当前剧本的职业、属性、技能与装备限制。',
    scenarios: ['authoring', 'play'],
    body: '# 校验人物卡\n检查人物卡是否满足当前剧本的职业、属性、技能与装备限制。\n## When to use\n\n- 人物卡创建或修改后需要确认是否合法时。\n- 保存人物卡前需要做一次结构化验收时。\n## Do not\n\n- 不做校验就直接把人物卡当成可用成品。\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'validate_module_playability',
    description: '检查模组是否具备开场、场景、探索区域、隐藏真相和推进节点。',
    scenarios: ['authoring'],
    body: '# 检查模组可玩性\n检查模组是否具备开场、场景、探索区域、隐藏真相和推进节点。\n## When to use\n\n- 模组草稿整理完成后做可玩性验收。\n- 开团前确认不会因为缺线索或缺场景直接卡死。\n\n## Do not\n\n- 模组信息不足时直接开团。\n- 仅检查结构完整性而忽略线索可达性——结构完整但线索断链同样会卡死。\n\n## 完整验收清单\n\n### 结构层\n- [ ] 开场入口：有明确触发条件和委托人\n- [ ] 场景数量：≥2 个可探索场景\n- [ ] 探索区域：每个场景有可互动地点\n- [ ] 隐藏真相：存在且对 AI 守秘人明确\n- [ ] 推进节点：各场景之间有明确流转条件\n\n### 线索链层（重点，最容易出问题）\n- [ ] 核心解法线索：**不依赖任何检定**，至少有一条必经线索直接指向解法\n- [ ] 触发词设计：NPC 觉醒/触发条件不要求玩家先知道答案才能触发\n- [ ] 角色替代路径：神秘学/法律等专业技能为 0 的角色有非检定的替代解法\n- [ ] 可选场景保底：被标为「可选」的场景若含关键线索，必须在必经场景中也提供该线索的简化版\n\n### 角色适配层\n- [ ] 关键 NPC 卡牌：`type: "key_npc"` 和 `card_ref` 已在模组 npcs 中标注\n- [ ] 选项池：已调用 `patch_options` 定义出身/装备/buff/debuff\n\n### 开团准备层\n- [ ] 玩家简报：`player_briefing` 存在（不含隐藏真相）\n- [ ] 守秘人速查：`keeper_quickref` 存在（时间线 + 检定汇总 + 必触发线索）\n- [ ] 房规：`house_rules` 存在（哪怕只有 1-2 条轻松团简化规则）\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n## Usage\n1. 先理解用户当前意图是否真的需要此 skill。\n2. 根据本技能的说明填写参数。\n3. 不要在正文里伪造 tool 调用结果。\n4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。',
  },
  {
    name: 'validate_player_action',
    description: '在执行任何玩家行动前，验证其合法性并确定检定方式（直接/优势/劣势/拒绝）。',
    scenarios: ['play'],
    body: '# 验证玩家行动合法性\n\n在 GM 叙述任何结果之前，先对玩家声明的行动或前提进行合法性校验，\n确定是否需要检定、是否享有加值，以及如何调用 roll_dice。\n\n## When to use\n\n- 玩家声称拥有某项背景优势时（"我是本地人"、"我认识他"）。\n- 玩家声称某个动作不需要检定时（"我肯定知道"、"我直接就做到了"）。\n- 任何涉及技能或属性的行动，在掷骰前先走本 skill。\n\n## Validation Procedure\n\n### Step 1 — 读取人物卡\n用 `view_file` 读取当前调查员的 JSON 人物卡，确认：\n- `profile.hometown` / `profile.background` 等背景字段\n- `special_rules` 中的加成条件\n- `skills` 中相关技能值\n\n### Step 2 — 核查玩家声明与人物卡的一致性\n\n| 玩家声明 | 核查项 | 结论示例 |\n|----------|--------|---------|\n| "我是本地人" | `profile.hometown` 是否在驻马店/王家村 | 王富贵 ✅ → 优势；刘全兴 ❌ → 无加值 |\n| "我认识刘老仙" | background 是否提及辖区执法经历 | 王富贵 ✅（黑皮笔记本档案）→ 相关检定+10 |\n| "我直接做到了" | 该行动是否属于自动成功范畴（纯叙事/装备使用/已知事实） | 若不属于，必须检定 |\n| "我用常识判断" | INT 属性是否支持，是否有专业背景 | 酌情降低难度，仍需检定 |\n\n#### 自动成功的合法场景（无需检定）\n- 使用已持有的道具（掏出手电筒、翻开笔记本本身）\n- 描述角色外貌、台词等纯叙事内容\n- 已知必经线索的获取（模组中标注 `无检定` 的线索）\n\n#### 常见非法声明\n- "我应该知道" + 信息超出背景合理范围 → **拒绝，给出原因，提示可用哪个技能尝试**\n- "我直接说服他" → 说服技能检定，背景可给优势但不能跳过\n- 用另一角色的背景为当前角色申请优势 → **拒绝**\n\n### Step 3 — 输出检定参数\n\n验证通过后，输出以下结构化参数供 roll_dice 使用：\n\n```json\n{\n  "action": "查阅刘老仙档案并回忆",\n  "skill": "图书馆使用",\n  "base_value": 50,\n  "modifier": 10,\n  "final_value": 60,\n  "roll_mode": "advantage",\n  "roll_mode_reason": "王富贵为本地宗教办，档案由本人亲自建立",\n  "difficulty": "regular",\n  "on_success": "获得刘铁柱完整档案细节 + 关键回忆（谈判软肋）",\n  "on_fail": "只获得基础档案信息，关键弱点细节想不起来"\n}\n```\n\n`roll_mode` 取值：\n- `normal` — 单次投骰\n- `advantage` — 投两次取低（COC 中"奖励骰"：两个十位取小）\n- `disadvantage` — 投两次取高（COC 中"惩罚骰"：两个十位取大）\n\n## Do not\n\n- 不验证就直接叙述行动结果（无论成功或失败）。\n- 把玩家的背景声明当作自动成功的理由。\n- 替玩家做行动决策——只验证玩家**已经声明**的行动。\n- 在验证输出后立刻叙述结果，必须先调用 roll_dice。\n\n## Contract\n当前 skill 的参数、边界与返回要求以本文件说明为准。\n\n## Usage\n1. 玩家声明行动 → 读人物卡 → Step 1-3。\n2. 输出检定参数结构体。\n3. 调用 roll_dice skill，传入检定参数。\n4. 根据 roll_dice 结果叙述后果，然后停下，等待玩家下一步决策。',
  },
];
