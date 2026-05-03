---
name: roll_dice
description: 执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。
metadata:
  author: meathill
  version: "1.1.0"
  group: gameplay
  execution-mode: native
---
# 执行检定

执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。
**必须在 `validate_player_action` 输出检定参数后才能调用本 skill。**

## When to use

- 技能检定。
- 属性检定。
- 幸运检定。
- 理智检定。
- 战斗技能判定。

## Do not

- 不调用本 skill 就直接宣布成功或失败。
- 把纯叙事动作滥用成检定。
- 在 `validate_player_action` 之前调用本 skill。

## Dice Function Specification

### rollD100(mode)

所有 COC 检定均使用 d100（1-100）。  
为便于将来替换为动画实现，**必须使用以下伪函数形式描述掷骰过程**，
不得在正文中直接写死数字。

```
rollD100(mode: "normal" | "advantage" | "disadvantage") -> { tens: number, units: number, result: number }
```

- `normal`：投一次，`result = tens * 10 + units`（00+0 = 100）
- `advantage`（奖励骰）：投两个十位骰，取**较小**十位 + 一个个位骰
- `disadvantage`（惩罚骰）：投两个十位骰，取**较大**十位 + 一个个位骰

**绝对禁止 AI 凭感觉编造数字。** 必须通过 `run_command` 工具调用本地脚本生成。
命令行调用示例（在工作区根目录下执行）：
`node .agents/skills/roll_dice/scripts/roll.js d100 <mode> [skillValue]`
若提供 `skillValue`，脚本的输出会自动包含检定等级 (`resolution`)。

### 伤害骰 rollDamage(notation)

```
rollDamage(notation: string) -> { rolls: number[], total: number }
```
例：`rollDamage("1d6+2")` → `{ rolls: [4], total: 6 }`

## Resolution Table

| 检定结果 | 条件 |
|----------|------|
| **极难成功** (大成功) | result ≤ final_value / 5（向下取整） |
| **困难成功** | result ≤ final_value / 2（向下取整） |
| **普通成功** | result ≤ final_value |
| **失败** | result > final_value |
| **大失败** | final_value < 50 时，result ≥ 96；final_value ≥ 50 时，result = 100 |

## Output Format

执行完毕后，以如下格式展示（Markdown 块）：

```
🎲 【检定】图书馆使用
   技能值：50 + 修正10 = 60
   骰子模式：advantage（奖励骰）
   投骰：rollD100("advantage") → 十位[3,5]取3，个位[7] → 结果：37  [AI模拟]
   判定：37 ≤ 60 → ✅ 成功
   效果：获得刘铁柱完整档案细节 + 关键回忆（谈判软肋）
```

## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。

## Usage
1. 接收 `validate_player_action` 输出的检定参数结构体。
2. 调用 `rollD100(mode)` 获得骰点。
3. 对照 Resolution Table 判定结果。
4. 输出格式化展示块。
5. 将结果返回给 GM 叙事流程，**由 GM 叙述后果后停下，等待玩家决策**。
