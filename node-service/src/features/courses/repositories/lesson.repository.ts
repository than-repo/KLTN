import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma, Lesson as PrismaLesson } from 'generated/prisma/client';
import {
  CreateLessonAtEndInput,
  CreateLessonInput,
  FindManyLessonParams,
  ILessonRepository,
  InvalidLessonOrderError,
  Lesson,
  LessonOrderByInput,
  LessonWhereInput,
  UpdateLessonInput,
} from '../interfaces/lesson.repository.interface';
import { Injectable } from '@nestjs/common';

export const lessonSkillsInclude = {
  skills: {
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      canonicalName: true,
      description: true,
      aliases: true,
      parentId: true,
      level: true,
      difficulty: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.LessonInclude;

type LessonWithSkills = Prisma.LessonGetPayload<{
  include: typeof lessonSkillsInclude;
}>;

@Injectable()
export class LessonRepository implements ILessonRepository {
  constructor(private readonly prisma: PrismaService) {}
  private toDomain(lesson: LessonWithSkills): Lesson {
    return {
      id: lesson.id,
      sectionId: lesson.sectionId,
      title: lesson.title,
      description: lesson.description,
      lessonIndex: lesson.lessonIndex,
      isActive: lesson.isActive,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
      deletedAt: lesson.deletedAt,
      skills: lesson.skills.map((skill) => ({
        ...skill,
        aliases: this.readAliases(skill.aliases),
      })),
    };
  }

  private readAliases(value: Prisma.JsonValue): string[] | null {
    if (value === null) {
      return null;
    }

    if (
      !Array.isArray(value) ||
      !value.every((item) => typeof item === 'string')
    ) {
      throw new Error('Stored skill aliases are invalid');
    }

    return value as string[];
  }
  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 100;

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) return this.DEFAULT_LIMIT;
    return Math.min(limit, this.MAX_LIMIT);
  }

  private buildWhere(where?: LessonWhereInput): Prisma.LessonWhereInput {
    const wherePrisma: Prisma.LessonWhereInput = {};

    const { id, sectionId, isActive, includeDeleted, titleContains } =
      where ?? {};

    if (id) wherePrisma.id = id;

    if (sectionId) wherePrisma.sectionId = sectionId;

    if (isActive !== undefined) {
      wherePrisma.isActive = isActive;
    }

    if (includeDeleted !== true) {
      wherePrisma.deletedAt = null;
    }

    if (titleContains) {
      wherePrisma.title = {
        contains: titleContains,
      };
    }

    return wherePrisma;
  }

  private buildOrderBy(
    orderBy?: LessonOrderByInput,
  ): Prisma.LessonOrderByWithRelationInput {
    if (!orderBy) {
      return {
        lessonIndex: 'asc',
      };
    }

    return {
      [orderBy.field]: orderBy.direction,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
  //Basic CRUD
  async create(input: CreateLessonInput): Promise<Lesson> {
    const { skillIds, ...fields } = input;

    const lesson = await this.prisma.lesson.create({
      data: {
        ...fields,
        ...(skillIds?.length
          ? {
              skills: {
                connect: skillIds.map((id) => ({
                  id,
                  isActive: true,
                  deletedAt: null,
                })),
              },
            }
          : {}),
      },
      include: lessonSkillsInclude,
    });

    return this.toDomain(lesson);
  }

  //handle 2 request create a lesson with x order concurrently
  async createAtEnd(input: CreateLessonAtEndInput): Promise<Lesson | null> {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const lessonIndex = await this.getNextLessonIndex(input.sectionId);

        return await this.create({
          ...input,
          lessonIndex,
        });
      } catch (error: unknown) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        if (attempt === maxAttempts - 1) {
          return null;
        }
      }
    }

    return null;
  }
  async findById(id: string): Promise<Lesson | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, deletedAt: null },
      include: lessonSkillsInclude,
    });
    return lesson ? this.toDomain(lesson) : null;
  }
  async findByIdIncludingDeleted(id: string): Promise<Lesson | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id },
      include: lessonSkillsInclude,
    });
    return lesson ? this.toDomain(lesson) : null;
  }
  async update(id: string, input: UpdateLessonInput): Promise<Lesson> {
    const { skillIds, ...fields } = input;

    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...fields,
        ...(skillIds !== undefined
          ? {
              skills: {
                set: skillIds.map((skillId) => ({
                  id: skillId,
                  isActive: true,
                  deletedAt: null,
                })),
              },
            }
          : {}),
      },
      include: lessonSkillsInclude,
    });
    return this.toDomain(lesson);
  }

  //Update only if that section is not deleted
  async updateInSection(
    lessonId: string,
    sectionId: string,
    input: UpdateLessonInput,
  ): Promise<Lesson | null> {
    const { skillIds, ...fields } = input;

    const lesson = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lesson.updateMany({
        where: {
          id: lessonId,
          sectionId,
          deletedAt: null,
        },
        data: {
          ...fields,
          updatedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        return null;
      }

      return tx.lesson.update({
        where: { id: lessonId },
        data: {
          ...(skillIds !== undefined
            ? {
                skills: {
                  set: skillIds.map((skillId) => ({
                    id: skillId,
                    isActive: true,
                    deletedAt: null,
                  })),
                },
              }
            : {}),
        },
        include: lessonSkillsInclude,
      });
    });

    return lesson ? this.toDomain(lesson) : null;
  }

  async restore(id: string, lessonIndex: number): Promise<Lesson> {
    const lesson = await this.prisma.lesson.update({
      where: {
        id,
      },
      data: {
        deletedAt: null,
        isActive: true,
        lessonIndex,
      },
      include: lessonSkillsInclude,
    });

    return this.toDomain(lesson);
  }

  async changeActive(id: string, isActive: boolean): Promise<Lesson> {
    const lesson = await this.prisma.lesson.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
      include: lessonSkillsInclude,
    });

    return this.toDomain(lesson);
  }

  //Find with pagination
  async findMany(params?: FindManyLessonParams): Promise<Lesson[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: this.buildWhere(params?.where),
      orderBy: this.buildOrderBy(params?.orderBy),
      skip: params?.offset,
      take: this.normalizeLimit(params?.limit),
      include: lessonSkillsInclude,
    });

    return lessons.map((lesson) => this.toDomain(lesson));
  }

  async count(params?: { where?: LessonWhereInput }): Promise<number> {
    return this.prisma.lesson.count({
      where: this.buildWhere(params?.where),
    });
  }
  async findBySectionId(sectionId: string): Promise<Lesson[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        sectionId,
        deletedAt: null,
      },
      orderBy: {
        lessonIndex: 'asc',
      },
      include: lessonSkillsInclude,
    });

    return lessons.map((lesson) => this.toDomain(lesson));
  }

  //helper
  async existsInSection(lessonId: string, sectionId: string): Promise<boolean> {
    const count = await this.prisma.lesson.count({
      where: {
        id: lessonId,
        sectionId,
        deletedAt: null,
        section: {
          deletedAt: null,
          isActive: true,
        },
      },
    });

    return count > 0;
  }
  async getNextLessonIndex(sectionId: string): Promise<number> {
    const result = await this.prisma.lesson.aggregate({
      where: {
        sectionId,
        deletedAt: null,
      },
      _max: {
        lessonIndex: true,
      },
    });

    return result._max.lessonIndex === null ? 0 : result._max.lessonIndex + 1;
  }
  async reorderLessons(
    sectionId: string,
    orderedLessonIds: string[],
  ): Promise<Lesson[]> {
    const lessons = await this.prisma.$transaction(async (tx) => {
      const currentLessons = await tx.lesson.findMany({
        where: {
          sectionId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      const orderedLessonIdSet = new Set(orderedLessonIds);
      const currentLessonIdSet = new Set(
        currentLessons.map((lesson) => lesson.id),
      );

      const hasInvalidOrder =
        orderedLessonIdSet.size !== orderedLessonIds.length ||
        orderedLessonIds.length !== currentLessons.length ||
        orderedLessonIds.some((lessonId) => !currentLessonIdSet.has(lessonId));

      if (hasInvalidOrder) {
        throw new InvalidLessonOrderError();
      }

      const lessonIndexAggregate = await tx.lesson.aggregate({
        where: {
          sectionId,
        },
        _min: {
          lessonIndex: true,
        },
      });

      const lowestLessonIndex = lessonIndexAggregate._min.lessonIndex ?? 0;
      const temporaryStartIndex = lowestLessonIndex - orderedLessonIds.length;

      /**
       * Phase 1:
       * Move selected lessons below every existing lesson index in this section.
       * This avoids @@unique([sectionId, lessonIndex]) collision.
       */
      const temporaryUpdateResults = await Promise.all(
        orderedLessonIds.map((lessonId, index) =>
          tx.lesson.updateMany({
            where: {
              id: lessonId,
              sectionId,
              deletedAt: null,
            },
            data: {
              lessonIndex: temporaryStartIndex + index,
            },
          }),
        ),
      );

      if (temporaryUpdateResults.some((result) => result.count !== 1)) {
        throw new InvalidLessonOrderError();
      }

      /**
       * Phase 2:
       * Assign final zero-based indexes.
       */
      const finalUpdateResults = await Promise.all(
        orderedLessonIds.map((lessonId, index) =>
          tx.lesson.updateMany({
            where: {
              id: lessonId,
              sectionId,
              deletedAt: null,
            },
            data: {
              lessonIndex: index,
            },
          }),
        ),
      );

      if (finalUpdateResults.some((result) => result.count !== 1)) {
        throw new InvalidLessonOrderError();
      }

      return tx.lesson.findMany({
        where: {
          sectionId,
          deletedAt: null,
        },
        orderBy: {
          lessonIndex: 'asc',
        },
        include: lessonSkillsInclude,
      });
    });

    return lessons.map((lesson) => this.toDomain(lesson));
  }

  async softDeleteAndShift(
    lessonId: string,
    sectionId: string,
    deletedLessonIndex: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const lessonIndexAggregate = await tx.lesson.aggregate({
        where: {
          sectionId,
        },
        _min: {
          lessonIndex: true,
        },
      });

      const softDeletedLessonIndex =
        (lessonIndexAggregate._min.lessonIndex ?? 0) - 1;

      await tx.lesson.update({
        where: { id: lessonId, sectionId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          isActive: false,
          lessonIndex: softDeletedLessonIndex,
        },
      });

      const lessonsToShift = await tx.lesson.findMany({
        where: {
          sectionId,
          deletedAt: null,
          lessonIndex: {
            gt: deletedLessonIndex,
          },
        },
        orderBy: {
          lessonIndex: 'asc',
        },
        select: {
          id: true,
          lessonIndex: true,
        },
      });

      for (const lessonToShift of lessonsToShift) {
        const result = await tx.lesson.updateMany({
          where: {
            id: lessonToShift.id,
            sectionId,
            deletedAt: null,
            lessonIndex: lessonToShift.lessonIndex,
          },
          data: {
            lessonIndex: lessonToShift.lessonIndex - 1,
          },
        });
      }
    });
  }

  //apply skills
}
