jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

import { BadRequestException } from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentQuestionType,
  AssessmentStatus,
  AssessmentType,
} from 'generated/prisma/enums';
import type { SubmitQuizAttemptRecord } from '../../../../../src/features/assessments/interfaces/attempt.repository.interface';
import { QuizGradingService } from '../../../../../src/features/assessments/services/quiz-grading.service';

describe('QuizGradingService', () => {
  let service: QuizGradingService;

  const now = new Date('2026-11-19T12:00:00.000Z');

  function makeAttemptRecord(
    overrides: Partial<SubmitQuizAttemptRecord> = {},
  ): SubmitQuizAttemptRecord {
    return {
      id: 'attempt-1',
      learnerId: 'learner-1',
      assessmentId: 'assessment-1',
      attemptNumber: 1,
      status: AssessmentAttemptStatus.IN_PROGRESS,
      score: null,
      maxScore: null,
      passed: false,
      startedAt: now,
      submittedAt: null,
      projectSubmission: null,
      assessment: {
        id: 'assessment-1',
        courseId: 'course-1',
        title: 'Comprehensive Quiz',
        type: AssessmentType.QUIZ,
        status: AssessmentStatus.PUBLISHED,
        isActive: true,
        deletedAt: null,
        totalPoints: 20,
        passingScore: 70,
        maxAttempts: 3,
        timeLimitMinutes: 30,
        availableFrom: null,
        availableUntil: null,
        reviewTiming: 'AFTER_GRADED',
        reviewContent: 'FULL_REVIEW',
      },
      questions: [
        {
          id: 'q-mc',
          questionText: 'Select A',
          type: AssessmentQuestionType.MULTIPLE_CHOICE,
          explanation: null,
          points: 10,
          order: 0,
          isActive: true,
          deletedAt: null,
          answer: {
            correctOptionAnswer: 'Option A',
            correctTextAnswer: null,
            wrongAnswers: ['Option B'],
          },
        },
        {
          id: 'q-tf',
          questionText: 'Is TS typed?',
          type: AssessmentQuestionType.TRUE_FALSE,
          explanation: null,
          points: 5,
          order: 1,
          isActive: true,
          deletedAt: null,
          answer: {
            correctOptionAnswer: 'true',
            correctTextAnswer: null,
            wrongAnswers: ['false'],
          },
        },
        {
          id: 'q-fib',
          questionText: 'Keyword for constant?',
          type: AssessmentQuestionType.FILL_IN_THE_BLANK,
          explanation: null,
          points: 5,
          order: 2,
          isActive: true,
          deletedAt: null,
          answer: {
            correctOptionAnswer: null,
            correctTextAnswer: 'const',
            wrongAnswers: null,
          },
        },
      ],
      savedAnswers: [
        { id: 'ans-1', questionId: 'q-mc', textAnswer: '  option a  ' },
        { id: 'ans-2', questionId: 'q-tf', textAnswer: 'TRUE' },
        { id: 'ans-3', questionId: 'q-fib', textAnswer: ' CONST ' },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    service = new QuizGradingService();
  });

  it('grades all supported quiz question types with case-insensitive trimmed comparison', () => {
    const result = service.grade(makeAttemptRecord());

    expect(result).toEqual({
      score: 20,
      maxScore: 20,
      passed: true,
      gradedAnswers: [
        { attemptAnswerId: 'ans-1', isCorrect: true, pointsEarned: 10 },
        { attemptAnswerId: 'ans-2', isCorrect: true, pointsEarned: 5 },
        { attemptAnswerId: 'ans-3', isCorrect: true, pointsEarned: 5 },
      ],
    });
  });

  it('awards 0 points to wrong or unanswered questions and evaluates exact passing percentage threshold', () => {
    const record = makeAttemptRecord({
      savedAnswers: [
        { id: 'ans-1', questionId: 'q-mc', textAnswer: 'Option A' }, // 10 pts
        { id: 'ans-2', questionId: 'q-tf', textAnswer: 'false' }, // 0 pts
        // q-fib omitted -> 0 pts
      ],
    });
    // 10 / 20 = 50% < 70%
    expect(service.grade(record)).toEqual({
      score: 10,
      maxScore: 20,
      passed: false,
      gradedAnswers: [
        { attemptAnswerId: 'ans-1', isCorrect: true, pointsEarned: 10 },
        { attemptAnswerId: 'ans-2', isCorrect: false, pointsEarned: 0 },
      ],
    });

    // Exact boundary: 10 / 20 = 50% >= 50%
    record.assessment.passingScore = 50;
    expect(service.grade(record).passed).toBe(true);
  });

  it('treats null passingScore as requiring 100%', () => {
    const record = makeAttemptRecord();
    record.assessment.passingScore = null;

    expect(service.grade(record).passed).toBe(true);

    record.savedAnswers[2].textAnswer = 'let'; // 15 / 20
    expect(service.grade(record).passed).toBe(false);
  });

  it('ignores inactive and soft-deleted questions in maxScore and grading', () => {
    const record = makeAttemptRecord();
    record.questions.push(
      {
        id: 'q-inactive',
        questionText: 'Inactive',
        type: AssessmentQuestionType.TRUE_FALSE,
        explanation: null,
        points: 50,
        order: 3,
        isActive: false,
        deletedAt: null,
        answer: null,
      },
      {
        id: 'q-deleted',
        questionText: 'Deleted',
        type: AssessmentQuestionType.TRUE_FALSE,
        explanation: null,
        points: 50,
        order: 4,
        isActive: true,
        deletedAt: now,
        answer: null,
      },
    );

    const result = service.grade(record);

    expect(result.maxScore).toBe(20);
    expect(result.score).toBe(20);
    expect(result.passed).toBe(true);
  });

  it('throws BadRequestException when there are no active questions', () => {
    const record = makeAttemptRecord({ questions: [] });

    expect(() => service.grade(record)).toThrow(
      new BadRequestException('Assessment has no active questions.'),
    );
  });

  it.each([
    [
      'PROJECT question inside quiz',
      (r: SubmitQuizAttemptRecord) => {
        r.questions[0].type = AssessmentQuestionType.PROJECT;
      },
    ],
    [
      'missing answer key',
      (r: SubmitQuizAttemptRecord) => {
        r.questions[0].answer = null;
      },
    ],
    [
      'blank correct answer key',
      (r: SubmitQuizAttemptRecord) => {
        r.questions[0].answer!.correctOptionAnswer = '   ';
      },
    ],
    [
      'negative question points',
      (r: SubmitQuizAttemptRecord) => {
        r.questions[0].points = -5;
      },
    ],
    [
      'zero total maxScore',
      (r: SubmitQuizAttemptRecord) => {
        r.questions.forEach((q) => {
          q.points = 0;
        });
      },
    ],
    [
      'passingScore < 0',
      (r: SubmitQuizAttemptRecord) => {
        r.assessment.passingScore = -1;
      },
    ],
    [
      'passingScore > 100',
      (r: SubmitQuizAttemptRecord) => {
        r.assessment.passingScore = 101;
      },
    ],
  ])(
    'throws BadRequestException for invalid configuration: %s',
    (_label, mutate) => {
      const record = makeAttemptRecord();
      mutate(record);

      expect(() => service.grade(record)).toThrow(
        new BadRequestException(
          'Assessment grading is not configured correctly.',
        ),
      );
    },
  );
});
