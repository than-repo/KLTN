import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { CourseStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  ILearningCourseV2Repository,
  LearningCourseOverviewModel,
  LearningLessonDetailModel,
  LearningLessonSummaryModel,
  LearningPaginationParams,
  LearningSectionSummaryModel,
  PaginatedLearningRepositoryResult,
} from '../interfaces/learning-course-v2.repository.interface';

const learningCourseOverviewSelect = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  thumbnailUrl: true,
} satisfies Prisma.CourseSelect;

const learningSectionSummarySelect = {
  id: true,
  title: true,
  description: true,
  sectionIndex: true,
  _count: {
    select: {
      lessons: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.CourseSectionSelect;

const learningLessonSummarySelect = {
  id: true,
  title: true,
  description: true,
  lessonIndex: true,
  _count: {
    select: {
      files: {
        where: {
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.LessonSelect;

const learningLessonDetailInclude = {
  files: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.LessonInclude;

type PrismaLearningCourseOverview = Prisma.CourseGetPayload<{
  select: typeof learningCourseOverviewSelect;
}>;

type PrismaLearningSectionSummary = Prisma.CourseSectionGetPayload<{
  select: typeof learningSectionSummarySelect;
}>;

type PrismaLearningLessonSummary = Prisma.LessonGetPayload<{
  select: typeof learningLessonSummarySelect;
}>;

type PrismaLearningLessonDetail = Prisma.LessonGetPayload<{
  include: typeof learningLessonDetailInclude;
}>;

@Injectable()
export class LearningCourseV2Repository implements ILearningCourseV2Repository {
  constructor(private readonly prisma: PrismaService) {}

  async existsCourseForLearning(courseId: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: this.buildCourseWhere(courseId),
    });

    return count > 0;
  }

  async existsSectionForLearning(
    courseId: string,
    sectionId: string,
  ): Promise<boolean> {
    const count = await this.prisma.courseSection.count({
      where: this.buildSectionWhere(courseId, sectionId),
    });

    return count > 0;
  }

  async findCourseOverview(
    courseId: string,
  ): Promise<LearningCourseOverviewModel | null> {
    const [course, sectionCount, lessonCount] = await this.prisma.$transaction([
      this.prisma.course.findFirst({
        where: this.buildCourseWhere(courseId),
        select: learningCourseOverviewSelect,
      }),
      this.prisma.courseSection.count({
        where: this.buildSectionWhere(courseId),
      }),
      this.prisma.lesson.count({
        where: this.buildLessonWhere(courseId),
      }),
    ]);

    if (!course) {
      return null;
    }

    return this.toCourseOverviewModel(course, sectionCount, lessonCount);
  }

  async findSections(
    courseId: string,
    params: LearningPaginationParams,
  ): Promise<PaginatedLearningRepositoryResult<LearningSectionSummaryModel>> {
    const where = this.buildSectionWhere(courseId);
    const [sections, total] = await this.prisma.$transaction([
      this.prisma.courseSection.findMany({
        where,
        orderBy: {
          sectionIndex: 'asc',
        },
        skip: params.offset,
        take: params.limit,
        select: learningSectionSummarySelect,
      }),
      this.prisma.courseSection.count({
        where,
      }),
    ]);

    return {
      data: sections.map((section) => this.toSectionSummaryModel(section)),
      total,
    };
  }

  async findLessons(
    courseId: string,
    sectionId: string,
    params: LearningPaginationParams,
  ): Promise<PaginatedLearningRepositoryResult<LearningLessonSummaryModel>> {
    const where = this.buildLessonWhere(courseId, sectionId);
    const [lessons, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        orderBy: {
          lessonIndex: 'asc',
        },
        skip: params.offset,
        take: params.limit,
        select: learningLessonSummarySelect,
      }),
      this.prisma.lesson.count({
        where,
      }),
    ]);

    return {
      data: lessons.map((lesson) => this.toLessonSummaryModel(lesson)),
      total,
    };
  }

  async findLessonDetail(
    courseId: string,
    lessonId: string,
  ): Promise<LearningLessonDetailModel | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        ...this.buildLessonWhere(courseId),
        id: lessonId,
      },
      include: learningLessonDetailInclude,
    });

    return lesson ? this.toLessonDetailModel(lesson) : null;
  }

  private buildCourseWhere(courseId: string): Prisma.CourseWhereInput {
    return {
      id: courseId,
      deletedAt: null,
      isActive: true,
      status: CourseStatus.PUBLISHED,
    };
  }

  private buildSectionWhere(
    courseId: string,
    sectionId?: string,
  ): Prisma.CourseSectionWhereInput {
    return {
      ...(sectionId ? { id: sectionId } : {}),
      courseId,
      isActive: true,
      deletedAt: null,
      course: this.buildCourseWhere(courseId),
    };
  }

  private buildLessonWhere(
    courseId: string,
    sectionId?: string,
  ): Prisma.LessonWhereInput {
    return {
      ...(sectionId ? { sectionId } : {}),
      isActive: true,
      deletedAt: null,
      section: this.buildSectionWhere(courseId, sectionId),
    };
  }

  private toCourseOverviewModel(
    course: PrismaLearningCourseOverview,
    sectionCount: number,
    lessonCount: number,
  ): LearningCourseOverviewModel {
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      thumbnailUrl: course.thumbnailUrl,
      contentSummary: {
        sectionCount,
        lessonCount,
      },
    };
  }

  private toSectionSummaryModel(
    section: PrismaLearningSectionSummary,
  ): LearningSectionSummaryModel {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      sectionIndex: section.sectionIndex,
      lessonCount: section._count.lessons,
    };
  }

  private toLessonSummaryModel(
    lesson: PrismaLearningLessonSummary,
  ): LearningLessonSummaryModel {
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      lessonIndex: lesson.lessonIndex,
      fileCount: lesson._count.files,
    };
  }

  private toLessonDetailModel(
    lesson: PrismaLearningLessonDetail,
  ): LearningLessonDetailModel {
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      lessonIndex: lesson.lessonIndex,
      files: lesson.files.map((file) => ({
        id: file.id,
        url: file.url,
        type: file.type,
      })),
    };
  }
}
