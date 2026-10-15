import { Difficulty } from 'generated/prisma/enums';

export interface CreateSkillInput {
  canonicalName: string;
  description?: string | null;
  aliases?: string[] | null;
  embeddings: SkillEmbeddings;
  parentId?: string | null;
  level: number;
  difficulty: Difficulty;
}

export interface UpdateSkillInput {
  canonicalName?: string;
  description?: string | null;
  aliases?: string[] | null;
  embeddings?: SkillEmbeddings;
  parentId?: string | null;
  level?: number;
  difficulty?: Difficulty;
}

export interface SkillEmbeddings {
  canonicalNameVector: number[];
  descriptionVector: number[] | null;
  aliasVectors: number[][];
}
