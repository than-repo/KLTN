import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  InvalidAfterLessonError,
  OrderAssessmentInput,
  UpdateAssessmentInput,
  UpdatePublishedAssessmentInput,
  WhereAssessmentInput,
  type CreateAssessmentInput,
  type Assessment,
  type IAssessmentRepository,
  AssessmentPublishValidationRecord,
} from '../interfaces/assessment.repository.interface';
import { CreateAssessmentDto } from '../dtos/assessment/create-assessment.dto';
import { AssessmentAccessService } from './assessment-access.service';
import {
  ASSESSMENT_VIEW_GROUPS,
  AssessmentResponseDto,
} from '../dtos/assessment/assessment-response';
import { plainToInstance } from 'class-transformer';
import { UpdateAssessmentDto } from '../dtos/assessment/update-assessment.dto';
import {
  ASSESSMENT_QUERY_DEFAULTS,
  AssessmentQueryDto,
} from '../dtos/assessment/query-assessment.dto';
import { PaginatedAsessmentResponse } from '../dtos/assessment/paginated-assessment-response.dto';

import { ASSESSMENT_QUESTIONS_REPOSITORY } from '../repositories/assessment-questions.interface.token';
import {
  AssessmentQuestionType,
  type IAssessmentQuestionRepository,
} from '../interfaces/assessment-questions.repository.interface';
import { ASSESSMENT_REPOSITORY } from '../repositories/assessment.repository.token';

import { DETAILED_ASSESSMENT_REPOSITORY } from '../repositories/detailed-assessment.repository.token';
import type { IDetailedAssessmentRepository } from '../interfaces/detailed-assessment.interface';
import { DetailedAssessmentDto } from '../dtos/assessment/detailed-assessment.dto';
import { UpdatePublishedAssessmentDto } from '../dtos/assessment/update-published-assessment.dto';
import { UpdatedPublishedAssessmentResponseDto } from '../dtos/assessment/updated-published-assessment-response.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly iAssessmentRepository: IAssessmentRepository,

    @Inject(ASSESSMENT_QUESTIONS_REPOSITORY)
    private readonly iAssessmentQuestionRepository: IAssessmentQuestionRepository,
    private readonly assessmentAccessService: AssessmentAccessService,

    @Inject(DETAILED_ASSESSMENT_REPOSITORY)
    private readonly iDetailedAssessmentRepository: IDetailedAssessmentRepository,
  ) {}

  async createDraftAssessment(
    instructorId: string,
    courseId: string,
    dto: CreateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageCourse(
      instructorId,
      courseId,
    );
    await this.validateAfterLesson(dto.afterLesson, courseId);
    const order = await this.iAssessmentRepository.getNextOrder(courseId);
    const availableFrom = dto.availableFrom
      ? new Date(dto.availableFrom)
      : undefined;

    const availableUntil = dto.availableUntil
      ? new Date(dto.availableUntil)
      : undefined;

    this.validateAvailabilityWindow(availableFrom, availableUntil);
    const input = {
      courseId,
      afterLesson: dto.afterLesson ?? null,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: AssessmentStatus.DRAFT,
      order,

      passingScore: dto.passingScore,
      maxAttempts: dto.maxAttempts,
      timeLimitMinutes:
        dto.type === AssessmentType.QUIZ ? dto.timeLimitMinutes : null,
      availableFrom,
      availableUntil,
      isActive: true,
    } satisfies CreateAssessmentInput;

    const assessment = await this.persistAssessment(() =>
      this.iAssessmentRepository.createDraftAssessment(input),
    );

    return plainToInstance(AssessmentResponseDto, assessment, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async updateDraftAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    dto: UpdateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const assessment =
      await this.iAssessmentRepository.findAssessmentById(assessmentId);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    this.ensureAssessmentIsDraft(assessment.status);
    await this.validateAfterLesson(dto.afterLesson, courseId);
    if (dto.type && dto.type !== assessment.type) {
      const questionCount =
        await this.iAssessmentQuestionRepository.countActiveQuestions(
          assessment.id,
        );

      if (questionCount > 0) {
        throw new BadRequestException(
          'Assessment type can not be changed after questions are added',
        );
      }
    }
    const availableFrom = dto.availableFrom
      ? new Date(dto.availableFrom)
      : (assessment.availableFrom ?? undefined);

    const availableUntil = dto.availableUntil
      ? new Date(dto.availableUntil)
      : (assessment.availableUntil ?? undefined);

    this.validateAvailabilityWindow(availableFrom, availableUntil);

    const nextType = dto.type ?? assessment.type;

    const input = {
      title: dto.title,
      afterLesson: dto.afterLesson,
      description: dto.description,
      type: dto.type,

      order: dto.order,

      passingScore: dto.passingScore,

      maxAttempts: dto.maxAttempts,
      timeLimitMinutes:
        nextType === AssessmentType.QUIZ ? dto.timeLimitMinutes : null,

      availableFrom:
        dto.availableFrom !== undefined ? availableFrom : undefined,

      availableUntil:
        dto.availableUntil !== undefined ? availableUntil : undefined,

      isActive: dto.isActive,
    } satisfies UpdateAssessmentInput;

    const updatedAssessment = await this.persistAssessment(() =>
      this.iAssessmentRepository.updateDraftAssessment(
        assessmentId,
        input,
        courseId,
      ),
    );

    if (!updatedAssessment) {
      throw new BadRequestException('Can not create assessment. Try again');
    }
    return plainToInstance(AssessmentResponseDto, updatedAssessment, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async updatePublishAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    dto: UpdatePublishedAssessmentDto,
  ): Promise<UpdatedPublishedAssessmentResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const assessment =
      await this.iAssessmentRepository.findAssessmentById(assessmentId);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.courseId !== courseId) {
      throw new NotFoundException('Assessment not found in course');
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only PUBLISHED assessments can be updated with this endpoint',
      );
    }

    await this.validateAfterLesson(dto.afterLesson, courseId);

    if (
      assessment.type !== AssessmentType.QUIZ &&
      dto.timeLimitMinutes !== undefined
    ) {
      throw new BadRequestException(
        'timeLimitMinutes is only allowed for QUIZ assessments',
      );
    }

    const availableFromForValidation =
      dto.availableFrom === undefined
        ? assessment.availableFrom
        : dto.availableFrom === null
          ? null
          : new Date(dto.availableFrom);

    const availableUntilForValidation =
      dto.availableUntil === undefined
        ? assessment.availableUntil
        : dto.availableUntil === null
          ? null
          : new Date(dto.availableUntil);

    this.validateAvailabilityWindow(
      availableFromForValidation ?? undefined,
      availableUntilForValidation ?? undefined,
    );

    const input = {
      afterLesson: dto.afterLesson,
      maxAttempts: dto.maxAttempts,

      timeLimitMinutes:
        assessment.type === AssessmentType.QUIZ
          ? dto.timeLimitMinutes
          : undefined,

      availableFrom:
        dto.availableFrom === undefined
          ? undefined
          : dto.availableFrom === null
            ? null
            : new Date(dto.availableFrom),

      availableUntil:
        dto.availableUntil === undefined
          ? undefined
          : dto.availableUntil === null
            ? null
            : new Date(dto.availableUntil),

      assessmentReviewTiming: dto.assessmentReviewTiming,
      assessmentReviewContent: dto.assessmentReviewContent,

      isActive: dto.isActive,
    } satisfies UpdatePublishedAssessmentInput;

    const updatedAssessment = await this.persistAssessment(() =>
      this.iAssessmentRepository.updatePublishAssessment(
        assessmentId,
        input,
        courseId,
      ),
    );

    if (!updatedAssessment) {
      throw new BadRequestException('Cannot update assessment. Try again');
    }

    return plainToInstance(
      UpdatedPublishedAssessmentResponseDto,
      updatedAssessment,
      {
        excludeExtraneousValues: true,
        groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
      },
    );
  }

  async publishAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<AssessmentResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const updatedAssessment =
      await this.iAssessmentRepository.withPublishSession(
        courseId,
        assessmentId,

        async (session) => {
          const assessment = await session.findForUpdate();

          if (!assessment || assessment.deletedAt) {
            throw new NotFoundException('Assessment not found');
          }

          if (!assessment.isActive) {
            throw new BadRequestException('Assessment is inactive.');
          }

          if (assessment.status !== AssessmentStatus.DRAFT) {
            throw new ConflictException(
              'Only DRAFT assessments can be published.',
            );
          }
          if (assessment.afterLessonId !== null) {
            await this.validateAfterLesson(
              assessment.afterLessonId,
              assessment.courseId,
            );
          }
          const questionNumber =
            Number(assessment.easyQuestionCount || 0) +
            Number(assessment.mediumQuestionCount || 0) +
            Number(assessment.hardQuestionCount || 0);

          if (questionNumber <= 0) {
            throw new BadRequestException('Invalid difficulty distribution');
          }
          const { totalPoints } = this.validateAssessmentContent(assessment);
          const published = await session.publish(totalPoints);

          if (!published) {
            throw new ConflictException('Assessment could not be published.');
          }

          const result = await session.findAssessment();

          if (!result) {
            throw new NotFoundException('Assessment not found.');
          }

          return result;
        },
      );

    return plainToInstance(AssessmentResponseDto, updatedAssessment, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async deleteAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<{ deleted: true }> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const assessment =
      await this.iAssessmentRepository.findAssessmentById(assessmentId);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    this.ensureAssessmentIsDraft(assessment.status);

    const softdeleted =
      await this.iAssessmentRepository.softDeleteAssessment(assessmentId);
    if (!softdeleted) {
      throw new BadRequestException('Can not delete assessment. Try again');
    }
    return { deleted: true };
  }
  async findMany(
    instructorId: string,
    courseId: string,
    query: AssessmentQueryDto,
  ): Promise<PaginatedAsessmentResponse<AssessmentResponseDto>> {
    await this.assessmentAccessService.ensureInstructorCanManageCourse(
      instructorId,
      courseId,
    );

    const where = {
      ...this.buildWhereInput(query),
      courseId,
      includeDeleted: false,
    };

    const orderBy = this.buildOrderInput(query);
    const { skip, take, page, limit } = this.getPagination(query);

    const [assessments, total] = await Promise.all([
      this.iAssessmentRepository.findMany(where, orderBy, skip, take),
      this.iAssessmentRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: assessments.map((assessment) =>
        plainToInstance(AssessmentResponseDto, assessment, {
          excludeExtraneousValues: true,
          groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
        }),
      ),
      meta: {
        limit,
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  async findDetailedAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<DetailedAssessmentDto> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const detailedAssessment =
      await this.iDetailedAssessmentRepository.findDetailedAssessment(
        assessmentId,
        courseId,
      );

    if (!detailedAssessment) {
      throw new NotFoundException('Detailed assessment not found');
    }

    return plainToInstance(DetailedAssessmentDto, detailedAssessment, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  private async validateAfterLesson(
    lessonId: string | null | undefined,
    courseId: string,
  ): Promise<void> {
    if (lessonId !== undefined && lessonId !== null) {
      await this.assessmentAccessService.ensureActiveLessonInCourse(
        lessonId,
        courseId,
      );
    }
  }

  private async persistAssessment(
    write: () => Promise<Assessment>,
  ): Promise<Assessment> {
    try {
      return await write();
    } catch (error: unknown) {
      if (error instanceof InvalidAfterLessonError) {
        throw new BadRequestException(
          'afterLesson must reference an active lesson in an active section of this course.',
        );
      }

      throw error;
    }
  }

  private buildWhereInput(query: AssessmentQueryDto): WhereAssessmentInput {
    return {
      id: query.id,
      ids: query.ids,

      courseId: query.courseId,

      type: query.type,
      types: query.types,

      status: query.status,
      statuses: query.statuses,

      isActive: query.isActive,
      includeDeleted: query.includeDeleted ?? false,

      search: query.search,

      availableFromGte: this.toDateOrUndefined(query.availableFromGte),

      availableUntilLte: this.toDateOrUndefined(query.availableUntilLte),

      createdAtGte: this.toDateOrUndefined(query.createdAtGte),

      updatedAtGte: this.toDateOrUndefined(query.updatedAtGte),
    };
  }

  private buildOrderInput(query: AssessmentQueryDto): OrderAssessmentInput {
    return {
      field: query.orderBy ?? ASSESSMENT_QUERY_DEFAULTS.ORDER_BY,
      direction:
        query.orderDirection ?? ASSESSMENT_QUERY_DEFAULTS.ORDER_DIRECTION,
    };
  }

  private getPagination(query: AssessmentQueryDto): {
    skip: number;
    take: number;
    page: number;
    limit: number;
  } {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private toDateOrUndefined(value: string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    return new Date(value);
  }
  private ensureAssessmentIsDraft(status: AssessmentStatus): void {
    if (status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException(
        'Assessment can only be changed while it is in DRAFT status',
      );
    }
  }
  private validateAvailabilityWindow(
    availableFrom?: Date,
    availableUntil?: Date,
  ): void {
    if (availableFrom && Number.isNaN(availableFrom.getTime())) {
      throw new BadRequestException('availableFrom is invalid');
    }

    if (availableUntil && Number.isNaN(availableUntil.getTime())) {
      throw new BadRequestException('availableUntil is invalid');
    }

    if (availableFrom && availableUntil && availableFrom >= availableUntil) {
      throw new BadRequestException(
        'availableFrom must be before availableUntil',
      );
    }
  }

  private validateAssessmentContent(
    assessment: AssessmentPublishValidationRecord,
  ): { totalPoints: number } {
    const { questions, passingScore } = assessment;

    if (questions.length === 0) {
      throw new BadRequestException(
        'Assessment must have at least one active question.',
      );
    }

    if (
      passingScore !== null &&
      (!Number.isInteger(passingScore) ||
        passingScore < 0 ||
        passingScore > 100)
    ) {
      throw new BadRequestException(
        'Passing score must be an integer between 0 and 100, or null.',
      );
    }

    let totalPoints = 0;

    for (const question of questions) {
      if (!Number.isSafeInteger(question.points) || question.points < 0) {
        throw new BadRequestException(
          `Question ${question.id}: points must be a nonnegative integer.`,
        );
      }

      totalPoints += question.points;

      if (!Number.isSafeInteger(totalPoints)) {
        throw new BadRequestException(
          'Assessment total points exceed the supported range.',
        );
      }
    }

    if (totalPoints <= 0) {
      throw new BadRequestException(
        'Assessment total points must be greater than zero.',
      );
    }

    if (assessment.type === AssessmentType.PROJECT) {
      if (
        questions.length !== 1 ||
        questions[0].type !== AssessmentQuestionType.PROJECT
      ) {
        throw new BadRequestException(
          'PROJECT assessment must have exactly one active PROJECT question.',
        );
      }

      if (questions[0].answer !== null) {
        throw new BadRequestException(
          'PROJECT questions must not have an answer key.',
        );
      }

      return { totalPoints };
    }

    if (assessment.type !== AssessmentType.QUIZ) {
      throw new BadRequestException('Unsupported assessment type.');
    }

    const normalize = (value: string | null): string => value?.trim() ?? '';

    for (const question of questions) {
      const fail = (message: string): never => {
        throw new BadRequestException(`Question ${question.id}: ${message}`);
      };

      switch (question.type) {
        case AssessmentQuestionType.MULTIPLE_CHOICE:
        case AssessmentQuestionType.TRUE_FALSE:
        case AssessmentQuestionType.FILL_IN_THE_BLANK:
          break;

        default:
          fail('unsupported question type for a QUIZ assessment.');
      }

      const answer = question.answer;

      if (!answer) {
        fail('an answer key is required.');
      }

      // Explicit narrowing also works with stricter TypeScript configurations.
      if (!answer) {
        throw new BadRequestException('Answer key is required.');
      }

      const correctOption = normalize(answer.correctOptionAnswer);
      const correctText = normalize(answer.correctTextAnswer);

      switch (question.type) {
        case AssessmentQuestionType.MULTIPLE_CHOICE: {
          if (!correctOption) {
            fail('a nonempty correct option is required.');
          }

          if (correctText) {
            fail('correctTextAnswer is not allowed for MULTIPLE_CHOICE.');
          }

          const rawWrongAnswers = answer.wrongAnswers;

          if (!Array.isArray(rawWrongAnswers) || rawWrongAnswers.length === 0) {
            fail('at least one wrong option is required.');
          }

          // Cast only after validating the array shape above.
          const wrongAnswers = rawWrongAnswers as unknown[];

          if (
            wrongAnswers.some(
              (option) =>
                typeof option !== 'string' || option.trim().length === 0,
            )
          ) {
            fail('wrong options must be nonempty strings.');
          }

          const normalizedOptions = [
            correctOption.toLowerCase(),
            ...wrongAnswers.map((option) =>
              (option as string).trim().toLowerCase(),
            ),
          ];

          if (new Set(normalizedOptions).size !== normalizedOptions.length) {
            fail('answer options must not contain duplicates.');
          }

          break;
        }

        case AssessmentQuestionType.TRUE_FALSE: {
          const correct = correctOption.toLowerCase();

          if (correct !== 'true' && correct !== 'false') {
            fail('the correct answer must be "true" or "false".');
          }

          if (correctText) {
            fail('correctTextAnswer is not allowed for TRUE_FALSE.');
          }

          // Your existing answer service stores the opposite option.
          const opposite = correct === 'true' ? 'false' : 'true';
          const wrongAnswers = answer.wrongAnswers;

          if (
            !Array.isArray(wrongAnswers) ||
            wrongAnswers.length !== 1 ||
            typeof wrongAnswers[0] !== 'string' ||
            wrongAnswers[0].trim().toLowerCase() !== opposite
          ) {
            fail('the stored wrong option must be the opposite boolean value.');
          }

          break;
        }

        case AssessmentQuestionType.FILL_IN_THE_BLANK: {
          if (!correctText) {
            fail('a nonempty correct text answer is required.');
          }

          if (correctText.length > 5000) {
            fail('the correct text answer must not exceed 5000 characters.');
          }

          if (correctOption) {
            fail('correctOptionAnswer is not allowed for FILL_IN_THE_BLANK.');
          }

          const wrongAnswers = answer.wrongAnswers;

          if (
            wrongAnswers !== null &&
            (!Array.isArray(wrongAnswers) || wrongAnswers.length !== 0)
          ) {
            fail('wrongAnswers must be null or empty for FILL_IN_THE_BLANK.');
          }

          break;
        }
      }
    }

    return { totalPoints };
  }
}
