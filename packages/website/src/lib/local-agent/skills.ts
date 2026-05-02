import {
  isExecutableLocalAgentSkill,
  type LocalAgentRuntimeContext,
  type LocalAgentSkillDefinition,
} from './skill-contract.ts';
import { characterSkills } from './character-skills.ts';
import { gameplaySkills } from './gameplay-skills.ts';
import { moduleSkills } from './module-skills.ts';
import { recordSkills } from './record-skills.ts';
import { rulebookSkills } from './rulebook-skills.ts';

export * from './character-skills.ts';
export * from './gameplay-skills.ts';
export * from './module-skills.ts';
export * from './record-skills.ts';
export * from './rulebook-skills.ts';

export const localAgentSkills: LocalAgentSkillDefinition<unknown, unknown>[] = [
  ...rulebookSkills,
  ...moduleSkills,
  ...gameplaySkills,
  ...characterSkills,
  ...recordSkills,
] as LocalAgentSkillDefinition<unknown, unknown>[];

export async function executeLocalAgentSkill(
  name: string,
  input: unknown,
  context: LocalAgentRuntimeContext,
): Promise<unknown> {
  const skill = localAgentSkills.find((item) => item.name === name);
  if (!skill) {
    throw new Error(`未知 skill：${name}`);
  }
  if (!isExecutableLocalAgentSkill(skill)) {
    throw new Error(`skill ${name} 当前不可执行`);
  }
  const parsedInput = skill.parseInput(input);
  return skill.execute(parsedInput, context);
}
