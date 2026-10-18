import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { SkillService } from './services/skill.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateSkillDto } from './dtos/create-skill.dto';
import { SkillResponseDto } from './dtos/skill-response.dto';
import { UpdateSkillDto } from './dtos/update-skill.dto';
import { SuggestSkillDto } from './dtos/suggest-skill.dto';
import { SkillSuggestionService } from './services/skill-suggestion.service';
import { SuggestSkillResultDto } from './dtos/suggest-skill-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';

@Controller({
  path: 'skill',
  version: '1',
})
@ApiTags('Skills - API')
export class SkillController {
  constructor(
    private readonly skillService: SkillService,
    private readonly skillSuggestionService: SkillSuggestionService,
  ) {}
  // ==========CRUD skills =====================

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Create a skill - Instructors',
  })
  async createSkill(
    @Body() dto: CreateSkillDto,
    @CurrentUser('sub') instructorId: string,
  ): Promise<SkillResponseDto> {
    return this.skillService.createSkill(dto, instructorId);
  }

  @Patch('course/:courseId/skill/:skillId')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Update a skill - Instructors',
  })
  async updateSkill(
    @Body() dto: UpdateSkillDto,
    @Param('skillId') skillId: string,
    @CurrentUser('sub') instructorId: string,
    @Param('courseId') courseId: string,
  ): Promise<SkillResponseDto> {
    return this.skillService.updateSkill(dto, skillId, courseId, instructorId);
  }

  @Delete('course/:courseId/skill/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Soft-delete a skill - Instructors',
  })
  async deleteSkill(
    @Param('skillId') skillId: string,
    @CurrentUser('sub') instructorId: string,
    @Param('courseId') courseId: string,
  ): Promise<void> {
    await this.skillService.softDeleteSkill(skillId, courseId, instructorId);
  }

  // ==================Suggestion Skill========================
  @Post('courses/:courseId/suggestions')
  @Throttle({ default: { ttl: 60_000, limit: 50 } })
  async suggestSkills(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SuggestSkillDto,
  ): Promise<SuggestSkillResultDto[]> {
    return this.skillSuggestionService.suggest(dto, courseId);
  }
}
