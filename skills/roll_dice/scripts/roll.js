/**
 * roll.js — COC 7e 骰子函数库
 * 供 roll_dice skill 调用，也可将来挂载动画层。
 *
 * 当宿主为纯文本 AI 时，AI 模拟随机并标注 [AI模拟]。
 * 当宿主支持 Node.js 执行时，直接 require 本文件。
 */

/**
 * 投一个百分骰（d100）。
 * @param {"normal"|"advantage"|"disadvantage"} mode
 * @returns {{ tens: number, units: number, result: number, raw: object }}
 */
function rollD100(mode = "normal") {
  const d10 = () => Math.floor(Math.random() * 10); // 0-9

  const units = d10();

  if (mode === "normal") {
    const tens = d10();
    const result = tens === 0 && units === 0 ? 100 : tens * 10 + units;
    return { tens, units, result, raw: { tens, units } };
  }

  if (mode === "advantage") {
    // 奖励骰：两个十位取较小值
    const t1 = d10();
    const t2 = d10();
    const tens = Math.min(t1, t2);
    const result = tens === 0 && units === 0 ? 100 : tens * 10 + units;
    return { tens, units, result, raw: { tens_rolls: [t1, t2], tens_chosen: tens, units } };
  }

  if (mode === "disadvantage") {
    // 惩罚骰：两个十位取较大值
    const t1 = d10();
    const t2 = d10();
    const tens = Math.max(t1, t2);
    const result = tens === 0 && units === 0 ? 100 : tens * 10 + units;
    return { tens, units, result, raw: { tens_rolls: [t1, t2], tens_chosen: tens, units } };
  }

  throw new Error(`Unknown mode: ${mode}`);
}

/**
 * 解析伤害表达式并投骰。
 * @param {string} notation - 例："1d6" / "2d4+1" / "1d3-1"
 * @returns {{ rolls: number[], modifier: number, total: number }}
 */
function rollDamage(notation) {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) throw new Error(`Invalid damage notation: ${notation}`);

  const count    = parseInt(match[1], 10);
  const sides    = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

  return { rolls, modifier, total };
}

/**
 * 判定检定结果等级（COC 7e）。
 * @param {number} result - 骰点（1-100）
 * @param {number} skillValue - 最终技能值（含所有修正）
 * @returns {"extreme_success"|"hard_success"|"regular_success"|"failure"|"fumble"}
 */
function resolveCheck(result, skillValue) {
  if ((skillValue < 50 && result >= 96) || result === 100) return "fumble";
  if (result <= Math.floor(skillValue / 5)) return "extreme_success";
  if (result <= Math.floor(skillValue / 2)) return "hard_success";
  if (result <= skillValue) return "regular_success";
  return "failure";
}

module.exports = { rollD100, rollDamage, resolveCheck };

// CLI Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = args[0];
  if (type === "d100") {
    const mode = args[1] || "normal";
    const skillValue = parseInt(args[2], 10);
    const result = rollD100(mode);
    let resolution = null;
    if (!isNaN(skillValue)) {
       resolution = resolveCheck(result.result, skillValue);
    }
    console.log(JSON.stringify({ ...result, resolution }, null, 2));
  } else if (type === "damage") {
    const notation = args[1];
    const result = rollDamage(notation);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("Usage: node roll.js d100 <normal|advantage|disadvantage> [skillValue]");
    console.error("       node roll.js damage <notation>");
    process.exit(1);
  }
}
