import { BadRequestException, Injectable } from '@nestjs/common';
import { AssessmentQuestionType } from '../interfaces/assessment-questions.repository.interface';
import type {
  GradedAttemptAnswerWrite,
  SubmitQuizAttemptRecord,
} from '../interfaces/attempt.repository.interface';

export interface QuizGrade {
  score: number;
  maxScore: number;
  passed: boolean;
  gradedAnswers: GradedAttemptAnswerWrite[];
}

@Injectable()
export class QuizGradingService {
  grade(attempt: SubmitQuizAttemptRecord): QuizGrade {
    const questions = attempt.questions.filter(
      (question) => question.isActive && !question.deletedAt,
    );
    if (questions.length === 0) {
      throw new BadRequestException('Assessment has no active questions.');
    }
    const answers = new Map(
      attempt.savedAnswers.map((answer) => [answer.questionId, answer]),
    );
    const gradedAnswers: GradedAttemptAnswerWrite[] = [];
    let score = 0;
    let maxScore = 0;
    for (const question of questions) {
      const correct =
        question.type === AssessmentQuestionType.FILL_IN_THE_BLANK
          ? question.answer?.correctTextAnswer
          : question.answer?.correctOptionAnswer;
      if (
        question.type === AssessmentQuestionType.PROJECT ||
        !correct?.trim() ||
        !Number.isFinite(question.points) ||
        question.points < 0
      ) {
        throw new BadRequestException(
          'Assessment grading is not configured correctly.',
        );
      }
      maxScore += question.points;
      const answer = answers.get(question.id);
      if (!answer) continue;
      const isCorrect =
        answer.textAnswer?.trim().toLowerCase() ===
        correct.trim().toLowerCase();
      const pointsEarned = isCorrect ? question.points : 0;
      score += pointsEarned;
      gradedAnswers.push({
        attemptAnswerId: answer.id,
        isCorrect,
        pointsEarned,
      });
    }
    const passingPercentage = attempt.assessment.passingScore ?? 100;
    if (
      maxScore <= 0 ||
      !Number.isFinite(passingPercentage) ||
      passingPercentage < 0 ||
      passingPercentage > 100
    ) {
      throw new BadRequestException(
        'Assessment grading is not configured correctly.',
      );
    }
    return {
      score,
      maxScore,
      passed: score >= (maxScore * passingPercentage) / 100,
      gradedAnswers,
    };
  }
}
