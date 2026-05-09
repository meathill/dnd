import { describe, expect, it } from 'vitest';
import { buildSkillCatalogPrompt, getSkillByName, getSkillsForSet, listAllSkills } from './loader';

describe('skills/loader', () => {
  it('contains the create_module orchestration skill in authoring set', () => {
    const authoring = getSkillsForSet('authoring').map((entry) => entry.name);
    expect(authoring).toContain('create_module');
    expect(authoring).toContain('save_local_module');
    expect(authoring).toContain('patch_basic');
  });

  it('keeps play-only skills out of authoring set', () => {
    const authoring = getSkillsForSet('authoring').map((entry) => entry.name);
    expect(authoring).not.toContain('roll_dice');
    expect(authoring).not.toContain('validate_player_action');
  });

  it('keeps authoring-only skills out of play set', () => {
    const play = getSkillsForSet('play').map((entry) => entry.name);
    expect(play).not.toContain('create_module');
    expect(play).not.toContain('save_local_module');
    expect(play).toContain('roll_dice');
  });

  it('includes shared skills in both sets', () => {
    const authoring = getSkillsForSet('authoring').map((entry) => entry.name);
    const play = getSkillsForSet('play').map((entry) => entry.name);
    expect(authoring).toContain('search_rulebook');
    expect(play).toContain('search_rulebook');
  });

  it('builds a non-empty catalog prompt for each scenario', () => {
    expect(buildSkillCatalogPrompt('authoring')).toContain('create_module');
    expect(buildSkillCatalogPrompt('play')).toContain('roll_dice');
  });

  it('exposes getSkillByName lookup', () => {
    expect(getSkillByName('roll_dice')?.name).toBe('roll_dice');
    expect(getSkillByName('not-existing')).toBeNull();
  });

  it('returns the full manifest via listAllSkills', () => {
    expect(listAllSkills().length).toBeGreaterThan(0);
  });
});
