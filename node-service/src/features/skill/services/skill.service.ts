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

@Injectable()
export class SkillService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly skillRepository: SkillRepository,
    private readonly courseAccessService: CourseAccessService,
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
    const skill = await this.skillRepository.getSkillById(skillId, courseId);

    if (!skill || skill.deletedAt !== null) {
      throw new NotFoundException('Skill not found');
    }

    await this.skillRepository.softDeleteSkill(skillId);
  }

  async getSkillsByCourseId(courseId: string) {
    return this.skillRepository.getSkillsByCourseId(courseId);
  }
}
