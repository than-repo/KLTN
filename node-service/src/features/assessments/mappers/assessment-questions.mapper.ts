import type { Prisma, Skill as PrismaSkill } from 'generated/prisma/client';

import type { AssessmentQuestion } from '../interfaces/assessment-questions.repository.interface';

export class AssessmentQuestionsMapper {
  static toAssessmentQuestion(
    question: Prisma.AssessmentQuestionModel & {
      skills?: PrismaSkill[];
    },
  ): AssessmentQuestion {
    return {
      id: question.id,
      assessmentId: question.assessmentId,
      questionText: question.questionText,
      type: question.type,
      explanation: question.explanation,
      points: question.points,
      order: question.order,

      ...(question.skills !== undefined ? { skills: question.skills } : {}),

      isActive: question.isActive,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      deletedAt: question.deletedAt,
    };
  }
}
