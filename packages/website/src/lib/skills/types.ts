export type SkillScenario = 'authoring' | 'play';

export type SkillManifestEntry = {
  name: string;
  description: string;
  scenarios: SkillScenario[];
  body: string;
};
