import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ASSESSMENT_REPOSITORY } from '../repositories/assessment.repository.token';
import type { IAssessmentRepository } from '../interfaces/assessment.repository.interface';
import { AssessmentAccessService } from './assessment-access.service';
import {
  AssessmentBlueprintResponseDto,
  UpdateAssessmentBlueprintDto,
} from '../dtos/assessment/update-assessment-blueprint.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AssessmentBlueprintService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly iAssessmentRepository: IAssessmentRepository,

    private readonly assessmentAccessService: AssessmentAccessService,
  ) {}

  async updateBlueprint(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    input: UpdateAssessmentBlueprintDto,
  ): Promise<AssessmentBlueprintResponseDto> {
    const [_, total] = await Promise.all([
      await this.assessmentAccessService.ensureInstructorCanManageAssessment(
        instructorId,
        courseId,
        assessmentId,
      ),
      input.easyQuestionCount +
        input.mediumQuestionCount +
        input.hardQuestionCount,
    ]);

    if (total === 0) {
      throw new BadRequestException(
        'A quiz blueprint must include at least one question.',
      );
    }

    const update = await this.iAssessmentRepository.updateBlueprint(
      assessmentId,
      input,
    );

    return plainToInstance(
      AssessmentBlueprintResponseDto,
      {
        assessmentId: update.id,
        easyQuestionCount: update.easyQuestionCount,
        mediumQuestionCount: update.mediumQuestionCount,
        hardQuestionCount: update.hardQuestionCount,
      },
      { excludeExtraneousValues: true },
    );
  }
}
