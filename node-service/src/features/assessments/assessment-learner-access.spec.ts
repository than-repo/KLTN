jest.mock(
  'generated/prisma/enums',
  () => jest.requireActual('../../../generated/prisma/enums'),
  { virtual: true },
);
jest.mock(
  'src/core/database/prisma.service',
  () => ({ PrismaService: class PrismaService {} }),
  { virtual: true },
);

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  CourseStatus,
  EnrollmentStatus,
} from 'generated/prisma/enums';
import type {
  IAssessmentAccessRepository,
  LearnerCourseAccessRecord,
} from './interfaces/assessment-access.repository.interface';
import type { LearnerAssessmentEntryRecord } from './interfaces/attempt.repository.interface';
import { AssessmentAccessRepository } from './repositories/assessment-access.repository';
import { AssessmentAccessService } from './services/assessment-access.service';
import { LearnerAssessmentsService } from './services/learner-assessments.service';
import { AttemptFinalizationService } from './services/attempt-finalization.service';
import { QuizGradingService } from './services/quiz-grading.service';

const learnerId = 'learner';
const courseId = 'course';
const assessmentId = 'assessment';
const input = { learnerId, courseId, assessmentId, attemptId: 'attempt' };
const course = {
  isActive: true,
  deletedAt: null,
  status: CourseStatus.PUBLISHED,
};
const enrollment: LearnerCourseAccessRecord = {
  isActive: true,
  deletedAt: null,
  status: EnrollmentStatus.ACTIVE,
  course,
};
const assessment = {
  isActive: true,
  deletedAt: null,
  status: AssessmentStatus.PUBLISHED,
};

function createAccessRepository(): jest.Mocked<IAssessmentAccessRepository> {
  return {
    findLearnerCourseAccess: jest.fn().mockResolvedValue(enrollment),
    findLearnerAssessmentAccess: jest.fn().mockResolvedValue(assessment),
    existsActiveLessonInCourse: jest.fn(),
    existsCourseByInstructor: jest.fn(),
    existsAssessmentInCourse: jest.fn(),
    existsQuestionInAssessment: jest.fn(),
    existsAnswerInQuestion: jest.fn(),
  };
}

function createAttemptRepository() {
  return {
    findPublishedAssessmentsForLearnerCourse: jest.fn(),
    findAssessmentForLearnerEntry: jest.fn(),
    findActiveAttemptDetail: jest.fn(),
    findSaveAnswerContext: jest.fn(),
    finalizeAttemptTransaction: jest.fn(),
    findLearnerAttempts: jest.fn(),
    findAttemptResult: jest.fn(),
    findProjectAttemptForSubmit: jest.fn(),
    createOrResumeAttemptTransaction: jest.fn(),
  };
}

function createLearnerService(
  attempts: ReturnType<typeof createAttemptRepository>,
  access: AssessmentAccessService,
): LearnerAssessmentsService {
  return new LearnerAssessmentsService(
    attempts as unknown as ConstructorParameters<
      typeof LearnerAssessmentsService
    >[0],
    access,
    new AttemptFinalizationService(
      attempts as unknown as ConstructorParameters<
        typeof AttemptFinalizationService
      >[0],
      new QuizGradingService(),
    ),
  );
}

describe('Learner assessment access policy', () => {
  let repository: jest.Mocked<IAssessmentAccessRepository>;
  let access: AssessmentAccessService;

  beforeEach(() => {
    repository = createAccessRepository();
    access = new AssessmentAccessService(repository);
  });

  it.each([
    null,
    { ...enrollment, isActive: false },
    { ...enrollment, deletedAt: new Date() },
    ...[
      EnrollmentStatus.COMPLETED,
      EnrollmentStatus.CANCELLED,
      EnrollmentStatus.EXPIRED,
    ].map((status) => ({ ...enrollment, status })),
  ])(
    'rejects invalid enrollment %p before assessment lookup',
    async (record) => {
      repository.findLearnerCourseAccess.mockResolvedValue(record);
      await expect(
        access.ensureLearnerCanAccessAssessment(
          learnerId,
          courseId,
          assessmentId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findLearnerAssessmentAccess).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...course, isActive: false },
    { ...course, deletedAt: new Date() },
    ...[
      CourseStatus.DRAFT,
      CourseStatus.ARCHIVED,
      CourseStatus.IN_REVIEW,
      CourseStatus.CHANGES_REQUESTED,
    ].map((status) => ({ ...course, status })),
  ])('rejects unavailable course %p', async (unavailableCourse) => {
    repository.findLearnerCourseAccess.mockResolvedValue({
      ...enrollment,
      course: unavailableCourse,
    });
    await expect(
      access.ensureLearnerCanAccessCourse(learnerId, courseId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    null,
    { ...assessment, isActive: false },
    { ...assessment, deletedAt: new Date() },
  ])('rejects unavailable assessment %p', async (record) => {
    repository.findLearnerAssessmentAccess.mockResolvedValue(record);
    await expect(
      access.ensureLearnerCanAccessAssessment(
        learnerId,
        courseId,
        assessmentId,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([AssessmentStatus.DRAFT, AssessmentStatus.ARCHIVED])(
    'blocks participation in %s assessments but preserves entry/history access',
    async (status) => {
      repository.findLearnerAssessmentAccess.mockResolvedValue({
        ...assessment,
        status,
      });
      await expect(
        access.ensureLearnerCanAccessAssessment(
          learnerId,
          courseId,
          assessmentId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        access.ensureLearnerCanAccessAssessment(
          learnerId,
          courseId,
          assessmentId,
          { requirePublished: false },
        ),
      ).resolves.toBeUndefined();
    },
  );

  it('allows published assessments with valid course access', async () => {
    await expect(
      access.ensureLearnerCanAccessAssessment(
        learnerId,
        courseId,
        assessmentId,
      ),
    ).resolves.toBeUndefined();
    expect(repository.findLearnerAssessmentAccess).toHaveBeenCalledWith(
      assessmentId,
      courseId,
    );
  });

  const routes: Array<{
    name: keyof LearnerAssessmentsService;
    run: (service: LearnerAssessmentsService) => Promise<unknown>;
  }> = [
    {
      name: 'getLearnerCourseAssessments',
      run: (service) => service.getLearnerCourseAssessments(input),
    },
    {
      name: 'getLearnerAssessment',
      run: (service) => service.getLearnerAssessment(input),
    },
    {
      name: 'createOrResumeAttempt',
      run: (service) => service.createOrResumeAttempt(input),
    },
    {
      name: 'getActiveAttempt',
      run: (service) => service.getActiveAttempt(input),
    },
    {
      name: 'saveAttemptAnswer',
      run: (service) =>
        service.saveAttemptAnswer({
          ...input,
          questionId: 'question',
          dto: { answer: 'true', expectedSavedAt: null },
        }),
    },
    { name: 'submitAttempt', run: (service) => service.submitAttempt(input) },
    {
      name: 'getAttemptHistory',
      run: (service) => service.getAttemptHistory(input),
    },
    {
      name: 'getAttemptResult',
      run: (service) => service.getAttemptResult(input),
    },
    {
      name: 'submitProject',
      run: (service) =>
        service.submitProject({ ...input, dto: { note: 'Project' } }),
    },
  ];

  describe.each(routes)('$name integration', ({ run }) => {
    it.each([
      { ...course, isActive: false },
      { ...course, deletedAt: new Date() },
      { ...course, status: CourseStatus.ARCHIVED },
    ])(
      'blocks unavailable course %p before attempt reads or writes',
      async (blockedCourse) => {
        repository.findLearnerCourseAccess.mockResolvedValue({
          ...enrollment,
          course: blockedCourse,
        });
        const attempts = createAttemptRepository();
        await expect(
          run(createLearnerService(attempts, access)),
        ).rejects.toBeInstanceOf(ForbiddenException);
        for (const operation of Object.values(attempts))
          expect(operation).not.toHaveBeenCalled();
      },
    );
  });

  it('retains upcoming and closed assessments and the afterLesson field in the list', async () => {
    const attempts = createAttemptRepository();
    const record = {
      id: assessmentId,
      courseId,
      afterLesson: 'lesson',
      afterLessonContext: {
        isActive: true,
        deletedAt: null,
        section: { courseId, isActive: true, deletedAt: null },
      },
      title: 'Quiz',
      description: null,
      type: AssessmentType.QUIZ,
      order: 0,
      totalPoints: 10,
      passingScore: null,
      maxAttempts: null,
      timeLimitMinutes: null,
      availableFrom: null,
      availableUntil: null,
    };
    attempts.findPublishedAssessmentsForLearnerCourse.mockResolvedValue([
      { ...record, id: 'upcoming', availableFrom: new Date('2099-01-01') },
      { ...record, id: 'closed', availableUntil: new Date('2000-01-01') },
    ]);
    const response = await createLearnerService(
      attempts,
      access,
    ).getLearnerCourseAssessments(input);
    expect(response.assessments.map((item) => item.id)).toEqual([
      'upcoming',
      'closed',
    ]);
    expect(
      response.assessments.every((item) => item.afterLesson === 'lesson'),
    ).toBe(true);
  });

  it('still rejects starting an assessment outside its availability window', async () => {
    const attempts = createAttemptRepository();
    const entry: LearnerAssessmentEntryRecord = {
      ...assessment,
      id: assessmentId,
      courseId,
      title: 'Quiz',
      description: null,
      type: AssessmentType.QUIZ,
      totalPoints: 10,
      passingScore: null,
      maxAttempts: null,
      timeLimitMinutes: null,
      availableFrom: new Date('2099-01-01'),
      availableUntil: null,
    };
    attempts.findAssessmentForLearnerEntry.mockResolvedValue(entry);
    await expect(
      createLearnerService(attempts, access).createOrResumeAttempt(input),
    ).rejects.toThrow('Assessment is outside the available time window.');
    expect(attempts.createOrResumeAttemptTransaction).not.toHaveBeenCalled();
  });

  it('rejects completed enrollments when listing assessments', async () => {
    repository.findLearnerCourseAccess.mockResolvedValue({
      ...enrollment,
      status: EnrollmentStatus.COMPLETED,
    });
    const attempts = createAttemptRepository();
    await expect(
      createLearnerService(attempts, access).getLearnerCourseAssessments(input),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      attempts.findPublishedAssessmentsForLearnerCourse,
    ).not.toHaveBeenCalled();
  });
});

describe('Learner access repository scoping', () => {
  it('loads enrollment and course state for the authenticated learner and requested course', async () => {
    const prisma = {
      enrollment: { findUnique: jest.fn().mockResolvedValue(enrollment) },
    };
    const repository = new AssessmentAccessRepository(
      prisma as unknown as ConstructorParameters<
        typeof AssessmentAccessRepository
      >[0],
    );
    expect(
      await repository.findLearnerCourseAccess(learnerId, courseId),
    ).toEqual(enrollment);
    expect(prisma.enrollment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_courseId: { userId: learnerId, courseId } },
        select: expect.objectContaining({
          course: { select: { isActive: true, deletedAt: true, status: true } },
        }),
      }),
    );
  });

  it('requires the assessment to belong to the requested course', async () => {
    const prisma = {
      assessment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const repository = new AssessmentAccessRepository(
      prisma as unknown as ConstructorParameters<
        typeof AssessmentAccessRepository
      >[0],
    );
    expect(
      await repository.findLearnerAssessmentAccess(assessmentId, courseId),
    ).toBeNull();
    expect(prisma.assessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: assessmentId, courseId },
      }),
    );
  });
});
