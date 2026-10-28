export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type Skill = {
  id: string;
  canonicalName: string;
  description: string | null;
  aliases: string[] | null;
  parentId: string | null;
  level: number;
  difficulty: Difficulty;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SuggestSkillResult = {
  id: string;
  canonicalName: string;
  description: string | null;
  aliases: string[];
  exactMatch: boolean;
  keywordScore: number;
  semanticScore: number;
  descriptionScore: number | null;
  score: number;
};

export type CreateSkillPayload = {
  courseId: string;
  canonicalName: string;
  description?: string | null;
  aliases?: string[] | null;
  parentId?: string | null;
  difficulty?: Difficulty;
};

export type SuggestSkillVariables = {
  keywords: string[];
  description?: string;
  limit?: number;
};
