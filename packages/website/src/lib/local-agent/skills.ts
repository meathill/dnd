import {
  isExecutableLocalAgentSkill,
  serializeLocalAgentSkill,
  type LocalAgentRuntimeContext,
  type LocalAgentSkillContract,
  type LocalAgentSkillDefinition,
} from './skill-contract.ts';
import { gameplaySkills } from './gameplay-skills.ts';
import { recordSkills } from './record-skills.ts';
import { rulebookSkills } from './rulebook-skills.ts';

export * from './gameplay-skills.ts';
export * from './record-skills.ts';
export * from './rulebook-skills.ts';

export const localAgentSkills: LocalAgentSkillDefinition<unknown, unknown>[] = [
  ...rulebookSkills,
  ...gameplaySkills,
  ...recordSkills,
] as LocalAgentSkillDefinition<unknown, unknown>[];

export const localAgentSkillContracts: LocalAgentSkillContract[] = localAgentSkills.map((skill) =>
  serializeLocalAgentSkill(skill),
);

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
