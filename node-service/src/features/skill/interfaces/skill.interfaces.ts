import { Difficulty } from 'generated/prisma/enums';

export interface CreateSkillInput {
  canonicalName: string;
  description?: string | null;
  aliases?: string[] | null;
  embeddings: SkillEmbeddings;
  parentId?: string | null;
  level: number;
  difficulty: Difficulty;

  //apply course
  courseId: string;
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

export interface DetachSkillFromQuestionInput {
  courseId: string;
  assessmentId: string;
  questionId: string;
  skillId: string;
  minimumRemainingSkills: number;
}

export type DetachSkillFromQuestionResult =
  | 'DETACHED'
  | 'QUESTION_NOT_FOUND'
  | 'SKILL_NOT_ATTACHED'
  | 'MINIMUM_SKILLS_REACHED';
