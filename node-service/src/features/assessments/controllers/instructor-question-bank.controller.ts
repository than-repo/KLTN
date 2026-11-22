import { Throttle } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma/enums';

import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AssessmentBlueprintResponseDto,
  UpdateAssessmentBlueprintDto,
} from '../dtos/assessment/update-assessment-blueprint.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AssessmentBlueprintService } from '../services/assessment-blueprint.service';

@Controller({ path: 'instuctor/course/:courseId/assessment', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiTags('Assessment - Instructor')
@Throttle({ default: { ttl: 60_000, limit: 30 } })
export class InstructorQuestionBankController {
  constructor(
    private readonly assessmentBlueprintService: AssessmentBlueprintService,
  ) {}

  @ApiOperation({
    summary: 'Update blueprint of each attempt',
  })
  @ApiOkResponse({ type: AssessmentBlueprintResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @Patch(':assessmentId/blueprint')
  async updateBlueprint(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: UpdateAssessmentBlueprintDto,
  ): Promise<AssessmentBlueprintResponseDto> {
    return this.assessmentBlueprintService.updateBlueprint(
      instructorId,
      courseId,
      assessmentId,
      dto,
    );
  }
}
