import { AssessmentQuestionSelect } from './../../../../generated/prisma/models/AssessmentQuestion';
import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  CreateSkillInput,
  UpdateSkillInput,
} from '../interfaces/skill.interfaces';
import {
  SkillUncheckedCreateInput,
  SkillUncheckedUpdateInput,
} from 'generated/prisma/models';

const skillWithItsInclude = {
  course: true,
  lessons: true,
  assessmentQuestions: true,
} satisfies Prisma.SkillInclude;

export type SkillDetails = Prisma.SkillGetPayload<{
  include: typeof skillWithItsInclude;
}>;

@Injectable()
export class SkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  private handleAliases(
    aliases: UpdateSkillInput['aliases'],
  ): Pick<SkillUncheckedUpdateInput, 'aliases'> {
    if (aliases === undefined) {
      return {};
    }

    return {
      aliases: aliases === null ? Prisma.DbNull : aliases,
    };
  }

  async createSkill(input: CreateSkillInput): Promise<Prisma.SkillModel> {
    const { aliases, embeddings, ...fields } = input;

    const data = {
      ...fields,
      embedding: {
        canonicalNameVector: embeddings.canonicalNameVector,
        descriptionVector: embeddings.descriptionVector,
        aliasVectors: embeddings.aliasVectors,
      },
      ...this.handleAliases(aliases),
    } satisfies Prisma.SkillUncheckedCreateInput;

    return this.prisma.skill.create({ data });
  }

  async getSkillById(
    id: string,
    courseId: string,
  ): Promise<Prisma.SkillModel | null> {
    return this.prisma.skill.findFirst({
      where: { id, courseId, isActive: true, deletedAt: null },
    });
  }

  async getSkillByName(
    canonicalName: string,
    courseId: string,
  ): Promise<Prisma.SkillModel | null> {
    return this.prisma.skill.findFirst({
      where: { canonicalName, courseId, isActive: true, deletedAt: null },
    });
  }

  async updateSkill(
    id: string,
    input: UpdateSkillInput,
  ): Promise<Prisma.SkillModel> {
    const { aliases, embeddings, ...fields } = input;

    const data: SkillUncheckedUpdateInput = {
      ...fields,
      ...this.handleAliases(aliases),
      ...(embeddings !== undefined
        ? {
            embedding: {
              canonicalNameVector: embeddings.canonicalNameVector,
              descriptionVector: embeddings.descriptionVector,
              aliasVectors: embeddings.aliasVectors,
            },
          }
        : {}),
    };

    return this.prisma.skill.update({
      where: {
        id,
        isActive: true,
        deletedAt: null,
      },
      data,
    });
  }

  async softDeleteSkill(id: string): Promise<Prisma.SkillModel | null> {
    return this.prisma.skill.update({
      where: { id, isActive: true, deletedAt: null },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  async checkSkillByIds(ids: string[]): Promise<number> {
    const count = await this.prisma.skill.count({
      where: {
        id: { in: ids },
        isActive: true,
        deletedAt: null,
      },
    });
    return count;
  }

  async getSkillsByCourseId(courseId: string): Promise<Prisma.SkillModel[]> {
    return this.prisma.skill.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        courseId,
      },
    });
  }

  async getSkillDetails(
    skillId: string,
    courseId: string,
  ): Promise<SkillDetails | null> {
    return this.prisma.skill.findUnique({
      where: { id: skillId, deletedAt: null, isActive: true, courseId },
      include: skillWithItsInclude,
    });
  }

  async getSkillsByCourseIdPagination(
    courseId: string,
    take: number,
    skip: number,
  ): Promise<Prisma.SkillModel[]> {
    return this.prisma.skill.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        courseId,
      },
      take,
      skip,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async connectSkillToLesson(
    lessonId: string,
    skillId: string,
  ): Promise<Prisma.SkillModel> {
    return this.prisma.skill.update({
      where: {
        id: skillId,
        isActive: true,
        deletedAt: null,
      },
      data: {
        lessons: {
          connect: {
            id: lessonId,
          },
        },
      },
    });
  }

  async connectSkillToQuestion(
    skillId: string,
    questionId: string,
  ): Promise<Prisma.SkillModel> {
    return this.prisma.skill.update({
      where: { id: skillId, deletedAt: null, isActive: true },
      data: {
        assessmentQuestions: {
          connect: {
            id: questionId,
          },
        },
      },
    });
  }

  async existInQuestion(skillId: string, questionId: string): Promise<boolean> {
    const exists = await this.prisma.skill.count({
      where: {
        id: skillId,
        deletedAt: null,
        isActive: true,
        assessmentQuestions: {
          some: {
            id: questionId,
          },
        },
      },
    });

    return exists === 1;
  }

  async detachFromQuestion(
    skillId: string,
    questionId: string,
  ): Promise<boolean> {
    const skill = await this.prisma.skill.update({
      where: {
        id: skillId,
        deletedAt: null,
        isActive: true,
        assessmentQuestions: {
          some: {
            id: questionId,
          },
        },
      },
      data: {
        assessmentQuestions: {
          disconnect: { id: questionId },
        },
      },
    });
    return skill ? true : false;
  }
}
