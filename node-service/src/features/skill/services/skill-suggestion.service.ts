import { BadGatewayException, Injectable } from '@nestjs/common';

import { EmbeddingService } from './embedding.service';
import { SuggestSkillDto } from '../dtos/suggest-skill.dto';
import { SkillEmbeddings } from '../interfaces/skill.interfaces';
import { SkillRepository } from '../repositories/skill.repository';
import { SuggestSkillResultDto } from '../dtos/suggest-skill-response.dto';
import { CourseAccessService } from 'src/features/courses/services/course-access.service';

@Injectable()
export class SkillSuggestionService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly skillRepository: SkillRepository,
    private readonly courseAccessService: CourseAccessService,
  ) {}

  async suggest(
    dto: SuggestSkillDto,
    courseId: string,
    instructorId: string,
  ): Promise<SuggestSkillResultDto[]> {
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

    // Get keywords and description
    const { keywords, description } = dto;
    const limit = dto.limit ?? 5;

    const items = keywords.map((text, index) => ({
      id: `keyword:${index}`,
      text,
    }));

    if (description) {
      items.push({ id: 'description', text: description });
    }

    // Convert input into embeddings and Get embedding skills
    const [skills, results] = await Promise.all([
      this.skillRepository.getSkillsByCourseId(courseId),
      this.embeddingService.generateEmbeddings(items),
    ]);

    // Format inputEmbeddings
    const vectors = new Map(results.map((item) => [item.id, item.embedding]));

    const requireVector = (id: string): number[] => {
      const vector = vectors.get(id);

      if (!vector) {
        throw new BadGatewayException(`Missing query vector: ${id}`);
      }

      return vector;
    };
    const keywordVectors = keywords.map((_keyword, index) =>
      requireVector(`keyword:${index}`),
    );
    const descriptionVector = description ? requireVector('description') : null;

    //Validate inputEmbedding
    const dimensions = keywordVectors[0].length;

    if (
      keywordVectors.some((vector) => vector.length !== dimensions) ||
      (descriptionVector !== null && descriptionVector.length !== dimensions)
    ) {
      throw new BadGatewayException('Inconsistent query dimensions');
    }

    const normalizedKeywords = keywords.map((keyword) =>
      this.normalize(keyword),
    );

    // compare
    const suggestions: SuggestSkillResultDto[] = [];
    for (const skill of skills) {
      const embedding = this.readEmbeddings(skill.embedding, dimensions);

      if (!embedding) continue;

      //string comparison
      const aliases = this.readAliases(skill.aliases);
      const names = [skill.canonicalName, ...aliases].map((name) =>
        this.normalize(name),
      );

      const exactMatch = normalizedKeywords.some((keyword) =>
        names.includes(keyword),
      );

      // keywords exact-match search
      const keywordScore = this.average(
        normalizedKeywords.map((keyword) =>
          Math.max(
            ...names.map((name) => this.keywordSimilarity(keyword, name)),
          ),
        ),
      );

      //keyword semantic
      const nameVectors = [
        embedding.canonicalNameVector,
        ...embedding.aliasVectors,
      ];

      const semanticScore = this.average(
        keywordVectors.map((queryVector) =>
          Math.max(
            ...nameVectors.map((candidateVector) =>
              this.similarity(queryVector, candidateVector),
            ),
          ),
        ),
      );

      // description semantics
      const descriptionScore =
        descriptionVector !== null && embedding.descriptionVector !== null
          ? this.similarity(descriptionVector, embedding.descriptionVector)
          : null;

      const hasQueryDescription = descriptionVector !== null;

      const score = hasQueryDescription
        ? 0.3 * keywordScore +
          0.4 * semanticScore +
          0.3 * (descriptionScore ?? 0)
        : 0.4 * keywordScore + 0.6 * semanticScore;

      suggestions.push({
        id: skill.id,
        canonicalName: skill.canonicalName,
        description: skill.description,
        aliases,
        exactMatch,
        keywordScore,
        semanticScore,
        descriptionScore,
        score,
      });
    }

    return suggestions
      .sort(
        (a, b) =>
          Number(b.exactMatch) - Number(a.exactMatch) ||
          b.score - a.score ||
          a.id.localeCompare(b.id),
      )
      .slice(0, limit);
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private keywordSimilarity(query: string, candidate: string): number {
    if (query === candidate) return 1;

    const queryTokens = new Set(query.split(' ').filter(Boolean));
    const candidateTokens = new Set(candidate.split(' ').filter(Boolean));

    const intersectionSize = [...queryTokens].filter((token) =>
      candidateTokens.has(token),
    ).length;

    const unionSize = new Set([...queryTokens, ...candidateTokens]).size;

    //Jaccard similarity
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }

  private similarity(a: number[], b: number[]): number {
    // Vectors are validated before ranking and normalized by Python.
    let score = 0;

    for (let index = 0; index < a.length; index++) {
      score += a[index] * b[index];
    }

    return Math.max(-1, Math.min(1, score));
  }

  private average(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private readAliases(value: unknown): string[] {
    if (
      Array.isArray(value) &&
      value.every((item: unknown) => typeof item === 'string')
    ) {
      return value;
    }

    return [];
  }

  private isVector(value: unknown, dimensions: number): value is number[] {
    return (
      Array.isArray(value) &&
      value.length === dimensions &&
      value.every(
        (item: unknown) => typeof item === 'number' && Number.isFinite(item),
      )
    );
  }

  private readEmbeddings(
    value: unknown,
    dimensions: number,
  ): SkillEmbeddings | null {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      !('canonicalNameVector' in value) ||
      !('descriptionVector' in value) ||
      !('aliasVectors' in value)
    ) {
      return null;
    }

    const { canonicalNameVector, descriptionVector, aliasVectors } = value;

    if (
      !this.isVector(canonicalNameVector, dimensions) ||
      (descriptionVector !== null &&
        !this.isVector(descriptionVector, dimensions)) ||
      !Array.isArray(aliasVectors) ||
      !aliasVectors.every((vector: unknown) =>
        this.isVector(vector, dimensions),
      )
    ) {
      return null;
    }

    return {
      canonicalNameVector,
      descriptionVector,
      aliasVectors,
    };
  }
}
