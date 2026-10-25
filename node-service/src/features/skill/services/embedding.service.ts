import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { abort } from 'process';
import {
  EmbeddingBatchItem,
  EmbeddingBatchItemResponse,
} from '../interfaces/embedding.interfaces';

@Injectable()
export class EmbeddingService {
  constructor(private readonly configService: ConfigService) {}

  private getPyEnpoint() {
    return this.configService.getOrThrow<string>('PYTHON_EMBEDDING_URL');
  }
  private getAIServiceKey() {
    return this.configService.getOrThrow<string>('AI_SERVICE_API_KEY');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const normalizedText = text.trim();
    if (!normalizedText) throw new BadRequestException('Invalid text');

    const endpoint = this.getPyEnpoint();
    if (!endpoint)
      throw new InternalServerErrorException('URL is not configured');

    const signal: AbortSignal = AbortSignal.timeout(15_000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAIServiceKey()}`,
        },
        body: JSON.stringify({ text: normalizedText }),
        signal,
      });

      if (!response.ok)
        throw new BadGatewayException(
          `Python embedding server returned HTTP ${response.status}`,
        );

      const payload: unknown = await response.json();

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('dimensions' in payload) ||
        !('embedding' in payload)
      ) {
        throw new BadGatewayException('Invalid embedding response');
      }

      const { dimensions, embedding } = payload;

      if (
        typeof dimensions !== 'number' ||
        !Number.isInteger(dimensions) ||
        dimensions <= 0 ||
        !Array.isArray(embedding) ||
        dimensions !== embedding.length ||
        !embedding.every(
          (value: unknown): value is number =>
            typeof value === 'number' && Number.isFinite(value),
        )
      ) {
        throw new BadGatewayException('Invalid embedding vector');
      }

      return embedding;
    } catch (error: unknown) {
      if (signal.aborted)
        throw new GatewayTimeoutException('Python embedding request timed out');

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('Failed to obtain embedding from Python');
    }
  }

  private async generateEmbeddingBatch(
    items: EmbeddingBatchItem[],
  ): Promise<EmbeddingBatchItemResponse[]> {
    const endpoint: string = this.configService.getOrThrow<string>(
      'PYTHON_BATCH_EMBEDDING_URL',
    );

    if (!endpoint.trim()) {
      throw new InternalServerErrorException(
        'Batch embedding URL is not configured',
      );
    }

    const requestedIds: Set<string> = new Set<string>(
      items.map((item: EmbeddingBatchItem): string => item.id),
    );

    const signal: AbortSignal = AbortSignal.timeout(30_000);

    try {
      const response: Response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAIServiceKey()}`,
        },
        body: JSON.stringify({ items }),
        signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `Python embedding server returned HTTP ${response.status}`,
        );
      }

      const payload: unknown = await response.json();

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('items' in payload) ||
        !Array.isArray(payload.items) ||
        payload.items.length !== items.length
      ) {
        throw new BadGatewayException('Invalid batch embedding response');
      }

      const returnedIds: Set<string> = new Set<string>();
      let batchDimensions: number | undefined;

      const results: EmbeddingBatchItemResponse[] = payload.items.map(
        (item: unknown): EmbeddingBatchItemResponse => {
          if (
            typeof item !== 'object' ||
            item === null ||
            !('id' in item) ||
            !('dimensions' in item) ||
            !('embedding' in item)
          ) {
            throw new BadGatewayException('Invalid batch result');
          }

          const { id, dimensions, embedding } = item;

          if (
            typeof id !== 'string' ||
            !requestedIds.has(id) ||
            returnedIds.has(id)
          ) {
            throw new BadGatewayException('Unexpected or duplicate result ID');
          }

          if (
            typeof dimensions !== 'number' ||
            !Number.isInteger(dimensions) ||
            dimensions <= 0 ||
            !Array.isArray(embedding) ||
            embedding.length !== dimensions ||
            !embedding.every(
              (value: unknown): value is number =>
                typeof value === 'number' && Number.isFinite(value),
            )
          ) {
            throw new BadGatewayException('Invalid embedding vector');
          }

          if (batchDimensions !== undefined && dimensions !== batchDimensions) {
            throw new BadGatewayException('Inconsistent embedding dimensions');
          }

          batchDimensions = dimensions;
          returnedIds.add(id);

          return {
            id,
            dimensions,
            embedding,
          };
        },
      );

      return results;
    } catch (error: unknown) {
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Python batch embedding request timed out',
        );
      }

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        'Failed to obtain batch embeddings from Python',
      );
    }
  }

  async generateEmbeddings(
    items: EmbeddingBatchItem[],
  ): Promise<EmbeddingBatchItemResponse[]> {
    if (items.length === 0) {
      return [];
    }

    const normalizedItems: EmbeddingBatchItem[] = items.map(
      (item: EmbeddingBatchItem): EmbeddingBatchItem => ({
        id: item.id.trim(),
        text: item.text.trim(),
      }),
    );

    const requestedIds: Set<string> = new Set<string>();

    for (const item of normalizedItems) {
      if (!item.id || !item.text) {
        throw new BadRequestException('ID and text cannot be blank');
      }

      if (requestedIds.has(item.id)) {
        throw new BadRequestException('Item IDs must be unique');
      }

      requestedIds.add(item.id);
    }

    const batchSize: number = 32;
    const results: EmbeddingBatchItemResponse[] = [];

    for (
      let offset: number = 0;
      offset < normalizedItems.length;
      offset += batchSize
    ) {
      const batch: EmbeddingBatchItem[] = normalizedItems.slice(
        offset,
        offset + batchSize,
      );

      const batchResults: EmbeddingBatchItemResponse[] =
        await this.generateEmbeddingBatch(batch);

      results.push(...batchResults);
    }

    return results;
  }
}
