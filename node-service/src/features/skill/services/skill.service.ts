import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSkillDto } from '../dtos/create-skill.dto';
import { EmbeddingService } from 'src/features/skill/services/embedding.service';
import { SkillRepository } from '../repositories/skill.repository';
import {
  CreateSkillInput,
  SkillEmbeddings,
  UpdateSkillInput,
} from '../interfaces/skill.interfaces';
import { Difficulty } from 'generated/prisma/enums';
import { plainToInstance } from 'class-transformer';
import { SkillResponseDto } from '../dtos/skill-response.dto';
import { UpdateSkillDto } from '../dtos/update-skill.dto';
import { EmbeddingBatchItem } from '../interfaces/embedding.interfaces';
import { CourseAccessService } from 'src/features/courses/services/course-access.service';
import { CourseRepository } from 'src/features/courses/repositories/course.repository';
import { AssessmentAccessService } from 'src/features/assessments/services/assessment-access.service';
import { AssessmentQuestionsService } from 'src/features/assessments/services/assessment-questions.service';
import { GetSkillsQueryDto } from '../dtos/get-skills-query.dto';
import { CoursesService } from 'src/features/courses/services/courses.service';

@Injectable()
export class SkillService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly skillRepository: SkillRepository,
    private readonly courseAccessService: CourseAccessService,
    private readonly assessmentAccessService: AssessmentAccessService,
    private readonly assessmentQuestionsService: AssessmentQuestionsService,
    private readonly coursesService: CoursesService,
  ) {}

  async createSkill(
    dto: CreateSkillDto,

    instructorId: string,
  ): Promise<SkillResponseDto> {
    const courseId: string = dto.courseId;
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );
    const exists = await this.skillRepository.getSkillByName(
      dto.canonicalName,
      courseId,
    );

    if (exists) {
      throw new ConflictException(
        'A skill name with this canonical name already exists',
      );
    }

    let level = 0;

    if (dto.parentId != null) {
      const parent = await this.skillRepository.getSkillById(
        dto.parentId,
        courseId,
      );

      if (!parent || !parent.isActive || parent.deletedAt !== null) {
        throw new BadRequestException('Parent skill does not exist');
      }

      level = parent.level + 1;
    }

    const aliases = dto.aliases ?? [];
    const description = dto.description?.trim();

    const items: EmbeddingBatchItem[] = [
      {
        id: 'canonicalName',
        text: dto.canonicalName,
      },
      ...aliases.map((alias, index) => ({
        id: `alias:${index}`,
        text: alias,
      })),
    ];

    if (description) {
      items.push({
        id: 'description',
        text: description,
      });
    }

    const results = await this.embeddingService.generateEmbeddings(items);

    // Map by ID, not response order.
    const vectors = new Map<string, number[]>(
      results.map((result) => [result.id, result.embedding]),
    );

    const requireVector = (id: string): number[] => {
      const vector = vectors.get(id);

      if (!vector) {
        throw new BadGatewayException(`Missing embedding result for ${id}`);
      }

      return vector;
    };

    const canonicalNameVector = requireVector('canonicalName');

    const embeddings: SkillEmbeddings = {
      canonicalNameVector,
      aliasVectors: aliases.map((_alias, index) =>
        requireVector(`alias:${index}`),
      ),
      descriptionVector: description ? requireVector('description') : null,
    };

    // generateEmbeddings() may split input into multiple batches.
    // Check dimensions across all returned vectors.
    const dimensions = canonicalNameVector.length;

    if (results.some((result) => result.embedding.length !== dimensions)) {
      throw new BadGatewayException('Inconsistent embedding dimensions');
    }

    const input = this.mapCreateSkillInput(dto, embeddings, level, courseId);

    const createdSkill = await this.skillRepository.createSkill(input);

    return plainToInstance(SkillResponseDto, createdSkill, {
      excludeExtraneousValues: true,
    });
  }
  private mapCreateSkillInput(
    dto: CreateSkillDto,
    embeddings: SkillEmbeddings,
    level: number,
    courseId: string,
  ): CreateSkillInput {
    return {
      canonicalName: dto.canonicalName,
      description: dto.description,
      aliases: dto.aliases,
      embeddings,
      parentId: dto.parentId,
      level,
      difficulty: dto.difficulty ?? Difficulty.EASY,
      courseId,
    };
  }
  async updateSkill(
    dto: UpdateSkillDto,
    skillId: string,
    courseId: string,
    instructorId: string,
  ): Promise<SkillResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );
    const skill = await this.skillRepository.getSkillById(skillId, courseId);

    if (!skill || !skill.isActive || skill.deletedAt !== null) {
      throw new NotFoundException('Skill not found');
    }

    if (dto.parentId !== undefined && dto.parentId !== skill.parentId) {
      throw new BadRequestException(
        'Changing the parent requires a separate hierarchy update',
      );
    }

    if (
      dto.canonicalName !== undefined &&
      dto.canonicalName !== skill.canonicalName
    ) {
      const existing = await this.skillRepository.getSkillByName(
        dto.canonicalName,
        courseId,
      );

      if (existing && existing.id !== skillId) {
        throw new ConflictException(
          'A skill with this canonical name already exists',
        );
      }
    }

    const input: UpdateSkillInput = {};

    if (dto.canonicalName !== undefined) {
      input.canonicalName = dto.canonicalName;
    }

    if (dto.description !== undefined) {
      input.description = dto.description;
    }

    if (dto.aliases !== undefined) {
      input.aliases = dto.aliases;
    }

    if (dto.difficulty !== undefined) {
      input.difficulty = dto.difficulty;
    }

    const needsEmbedding =
      dto.canonicalName !== undefined ||
      dto.description !== undefined ||
      dto.aliases !== undefined;

    if (needsEmbedding) {
      const canonicalName = dto.canonicalName ?? skill.canonicalName;

      const description =
        dto.description !== undefined ? dto.description : skill.description;

      const aliases =
        (dto.aliases !== undefined
          ? dto.aliases
          : this.readSkillAliases(skill.aliases)) ?? [];

      input.embeddings = await this.generateSkillEmbeddings(
        canonicalName,
        description,
        aliases,
      );
    }

    if (Object.keys(input).length === 0) {
      return plainToInstance(SkillResponseDto, skill, {
        excludeExtraneousValues: true,
      });
    }

    const updatedSkill = await this.skillRepository.updateSkill(skillId, input);

    return plainToInstance(SkillResponseDto, updatedSkill, {
      excludeExtraneousValues: true,
    });
  }
  private async generateSkillEmbeddings(
    canonicalName: string,
    description: string | null | undefined,
    aliases: string[],
  ): Promise<SkillEmbeddings> {
    const normalizedDescription = description?.trim();

    const items: EmbeddingBatchItem[] = [
      { id: 'canonicalName', text: canonicalName.trim() },
      ...aliases.map((alias, index) => ({
        id: `alias:${index}`,
        text: alias.trim(),
      })),
    ];

    if (normalizedDescription) {
      items.push({
        id: 'description',
        text: normalizedDescription,
      });
    }

    const results = await this.embeddingService.generateEmbeddings(items);

    const vectors = new Map<string, number[]>(
      results.map((result) => [result.id, result.embedding]),
    );

    const requireVector = (id: string): number[] => {
      const vector = vectors.get(id);

      if (!vector) {
        throw new BadGatewayException(`Missing embedding result for ${id}`);
      }

      return vector;
    };

    const canonicalNameVector = requireVector('canonicalName');

    if (
      results.some(
        (result) => result.embedding.length !== canonicalNameVector.length,
      )
    ) {
      throw new BadGatewayException('Inconsistent embedding dimensions');
    }

    return {
      canonicalNameVector,
      descriptionVector: normalizedDescription
        ? requireVector('description')
        : null,
      aliasVectors: aliases.map((_alias, index) =>
        requireVector(`alias:${index}`),
      ),
    };
  }
  private readSkillAliases(value: unknown): string[] | null {
    if (value === null) {
      return null;
    }

    if (
      !Array.isArray(value) ||
      !value.every((item: unknown) => typeof item === 'string')
    ) {
      throw new InternalServerErrorException(
        'Stored skill aliases are invalid',
      );
    }

    return value as string[];
  }
  async softDeleteSkill(
    skillId: string,
    courseId: string,
    instructorId: string,
  ): Promise<void> {
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );
    const skill = await this.skillRepository.getSkillDetails(skillId, courseId);

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    if (skill.assessmentQuestions.length > 0 || skill.lessons.length > 0) {
      throw new BadRequestException(
        'Cannot delete a skill attached to lessons or questions',
      );
    }

    await this.skillRepository.softDeleteSkill(skillId);
  }
  async getSkillsByCourseId(courseId: string) {
    return this.skillRepository.getSkillsByCourseId(courseId);
  }
  async attachSkillToLesson(
    courseId: string,
    sectionId: string,
    lessonId: string,
    skillId: string,
    instructorId: string,
  ): Promise<SkillResponseDto> {
    const [, skill, canEdit] = await Promise.all([
      this.courseAccessService.ensureInstructorCanManageLesson(
        courseId,
        instructorId,
        sectionId,
        lessonId,
      ),
      this.skillRepository.getSkillById(skillId, courseId),
      this.coursesService.canEditCourse(courseId),
    ]);
    if (!canEdit) throw new BadRequestException('Can not modify this course');

    if (!skill) throw new BadRequestException('Skill not found');

    const attach = await this.skillRepository.connectSkillToLesson(
      lessonId,
      skillId,
    );
    return plainToInstance(SkillResponseDto, attach);
  }
  async attachSkillToQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
    skillId: string,
  ): Promise<SkillResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const skill = await this.skillRepository.getSkillById(skillId, courseId);

    if (!skill || skill.courseId !== courseId) {
      throw new NotFoundException('Skill not found in this course');
    }

    const attach = await this.skillRepository.connectSkillToQuestion(
      skillId,
      questionId,
    );

    return plainToInstance(SkillResponseDto, attach, {
      excludeExtraneousValues: true,
    });
  }
  async detachSkillFromQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
    skillId: string,
  ): Promise<boolean> {
    await this.assessmentAccessService.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );
    const countSkills =
      await this.assessmentQuestionsService.getSkillCountForQuestion(
        questionId,
      );

    if (countSkills <= 1)
      throw new BadRequestException('A question must have at least one skill');

    const existsInQuestion = await this.skillRepository.existInQuestion(
      skillId,
      questionId,
    );

    if (!existsInQuestion) {
      throw new NotFoundException('Skill not found in this question');
    }

    return this.skillRepository.detachFromQuestion(skillId, questionId);
  }
  async findListSkill(
    query: GetSkillsQueryDto,
    instructorId: string,
    courseId: string,
  ): Promise<SkillResponseDto[]> {
    const { page, take } = query;
    await this.assessmentAccessService.ensureInstructorCanManageCourse(
      instructorId,
      courseId,
    );

    const skip = take * page;

    const skills = await this.skillRepository.getSkillsByCourseIdPagination(
      courseId,
      take,
      skip,
    );

    return skills.map((skill) => {
      return plainToInstance(SkillResponseDto, skill, {
        excludeExtraneousValues: true,
      });
    });
  }
  async verifySkillsBelongToCourse(
    courseId: string,
    skillIds: string[],
  ): Promise<boolean> {
    const validSkills =
      await this.skillRepository.getSkillsByCourseId(courseId);

    const validIds = new Set(validSkills.map((skill) => skill.id));

    return skillIds.every((id) => validIds.has(id));
  }
}
