import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
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
import { GetSkillsQueryDto } from './dtos/get-skills-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
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

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Get a list of skills - Instructors',
  })
  async getSkills(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId') courseId: string,
    @Query() query: GetSkillsQueryDto,
  ): Promise<SkillResponseDto[]> {
    return this.skillService.findListSkill(query, instructorId, courseId);
  }

  // ==================Suggestion Skill========================
  @Post('course/:courseId/suggestions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
  @Throttle({ default: { ttl: 60_000, limit: 50 } })
  @ApiOperation({
    summary: 'search exists skills - Instructors',
  })
  async suggestSkills(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SuggestSkillDto,
    @CurrentUser('sub') instructorId: string,
  ): Promise<SuggestSkillResultDto[]> {
    return this.skillSuggestionService.suggest(dto, courseId, instructorId);
  }

  @Post(
    'course/:courseId/sections/:sectionId/lessons/:lessonId/skills/:skillId/skill-attachment',
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.INSTRUCTOR)
  @Throttle({ default: { ttl: 60_000, limit: 50 } })
  @ApiOperation({
    summary: 'Attach a skill into Lesson- Instructors',
  })
  async attachSkill(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('lessonId') lessonId: string,
    @Param('skillId') skillId: string,
    @CurrentUser('sub') instructorId: string,
  ): Promise<SkillResponseDto> {
    return this.skillService.attachSkillToLesson(
      courseId,
      sectionId,
      lessonId,
      skillId,
      instructorId,
    );
  }

  @Post(
    ':skillId/course/:courseId/assessment/:assessmentId/question/:questionId/skill-attachment',
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
  @Throttle({ default: { ttl: 60_000, limit: 50 } })
  @ApiOperation({
    summary: 'Attach a skill into Assessment Question- Instructors',
  })
  async attachSkillToQuestion(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId') courseId: string,
    @Param('assessmentId') assessmentId: string,
    @Param('questionId') questionId: string,
    @Param('skillId') skillId: string,
  ): Promise<SkillResponseDto> {
    return this.skillService.attachSkillToQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
      skillId,
    );
  }

  @Delete(
    ':skillId/course/:courseId/assessment/:assessmentId/question/:questionId/skill-detachment',
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Throttle({ default: { ttl: 60_000, limit: 50 } })
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Attach a skill into Assessment Question- Instructors',
  })
  async removeSkillFromQuestion(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId') courseId: string,
    @Param('assessmentId') assessmentId: string,
    @Param('questionId') questionId: string,
    @Param('skillId') skillId: string,
  ): Promise<boolean> {
    return this.skillService.detachSkillFromQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
      skillId,
    );
  }
}
