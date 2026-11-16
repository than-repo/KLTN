import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IAttemptRepository } from '../interfaces/attempt.repository.interface';
import { ATTEMPT_REPOSITORY } from '../repositories/attempt.repository.token';
import { AttemptFinalizationService } from './attempt-finalization.service';

@Injectable()
export class AssessmentExpiryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AssessmentExpiryService.name);
  private running = false;

  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly repository: IAttemptRepository,
    private readonly finalization: AttemptFinalizationService,
  ) {}

  onApplicationBootstrap(): void {
    void this.finalizeExpiredAttempts();
  }

  @Cron(CronExpression.EVERY_5_SECONDS, { waitForCompletion: true })
  async finalizeExpiredAttempts(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      let afterId: string | null = null;
      for (;;) {
        const candidates = await this.repository.findExpiredAttemptIds(
          now,
          afterId,
          100,
        );
        if (candidates.length === 0) break;
        for (const { id } of candidates) {
          try {
            await this.finalization.finalizeExpired(id);
          } catch {
            this.logger.error(
              `Could not finalize expired attempt ${id}; will retry on the next run.`,
            );
          }
        }
        afterId = candidates[candidates.length - 1].id;
        if (candidates.length < 100) break;
      }
    } catch {
      this.logger.error(
        'Could not scan expired attempts; will retry on the next run.',
      );
    } finally {
      this.running = false;
    }
  }
}
