export interface SkillCandidate {
  skillId: string;
  canonicalName: string;
  description: string | null;
  aliases: string[];
  source: 'keyword' | 'semantic';
  score: number;
}
