---
name: create_module
description: 串联模组创作完整流程：先确认 Meta，再依次补完背景、场景、NPC、可选项，最后校验与落盘。
scenarios: [authoring]
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: orchestration
---
# 创作一个新模组

把一段创作意图落成可玩的模组。本 skill 不直接执行动作，只编排其它 skill。

## When to use

- 用户想从零创作一个新模组。
- 模组草稿初步成形，需要按规范补完结构。
- 模组接近发布，需要再次自查可玩性。

## Do not

- 越过 editor 的意图自行决定题材或难度。
- 跳过 Meta / 背景 / 场景任何一步直接落盘。
- 仅在正文里声称已保存而没有调用 `save_local_module`。

## Contract

按以下顺序与 editor 协作，每一步都要把结果展示给 editor 确认或修改后再进入下一步。
所有结构化变更都必须通过对应 patch_/save_local_ skill 落盘，不要在自然语言里伪造结果。

## Usage

1. **对齐 Meta**
    - 与 editor 确认题材、规则书（默认 `coc-7e-lite`）、难度、预计时长、玩家人数。
    - 检查工作区 `meta.json` 是否已存在；若已有，先复述当前 Meta 再问改动。

2. **基础信息**
    - 调用 `patch_basic` 写入或修订 title / summary / setting / difficulty。

3. **背景与世界观**
    - 调用 `patch_background` 写入 overview / truth / themes / factions / locations / explorableAreas / secrets。
    - 必要时通过 `search_rulebook`、`get_rule_entry` 引用规则书条目。

4. **NPC**
    - 重要 NPC 用 `patch_npc` 写入；标准 NPC 优先复用 `get_standard_npc`。
    - 不需要的占位 NPC 通过 `remove_npc` 移除。

5. **场景**
    - 用 `patch_scene` 写入每个关键场景，包含 description / dmNotes / hooks / risks。
    - 通过 `estimate_scene_risk` 视情况标注风险。
    - 不需要的场景通过 `remove_scene` 移除。

6. **可选项与分支**
    - 用 `patch_options` 写入分支选项、奖励与失败后果。

7. **可玩性校验**
    - 调用 `validate_module_playability`，把警告反馈给 editor。
    - 修复 critical 级问题后再进入落盘。

8. **落盘**
    - 调用 `save_local_module` 把当前 data_json 写入工作区 `data/modules/{slug}.json`。
    - 落盘后告诉 editor「已保存」并展示文件路径。

## 输出倾向

- 每一步都先列「我打算调用 X skill」，再执行。
- 不要一次输出整个模组的 JSON，分阶段递进，方便 editor 检阅。
- 中文交流，专有名词保留原文。
