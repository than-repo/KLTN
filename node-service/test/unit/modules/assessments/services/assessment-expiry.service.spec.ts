jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

import { Logger } from '@nestjs/common';
import type { IAttemptRepository } from '../../../../../src/features/assessments/interfaces/attempt.repository.interface';
import { AssessmentExpiryService } from '../../../../../src/features/assessments/services/assessment-expiry.service';
import type { AttemptFinalizationService } from '../../../../../src/features/assessments/services/attempt-finalization.service';
describe('AssessmentExpiryService', () => {
  let repository: jest.Mocked<
    Pick<IAttemptRepository, 'findExpiredAttemptIds'>
  >;
  let finalization: jest.Mocked<
    Pick<AttemptFinalizationService, 'finalizeExpired'>
  >;
  let service: AssessmentExpiryService;
  let errorSpy: jest.SpyInstance;

  const now = new Date('2026-11-19T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    repository = {
      findExpiredAttemptIds: jest.fn().mockResolvedValue([]),
    };

    finalization = {
      finalizeExpired: jest.fn().mockResolvedValue(null),
    };

    service = new AssessmentExpiryService(
      repository as unknown as IAttemptRepository,
      finalization as unknown as AttemptFinalizationService,
    );
  });

  afterEach(() => {
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('onApplicationBootstrap', () => {
    it('triggers finalizeExpiredAttempts asynchronously without blocking bootstrap', () => {
      const runSpy = jest
        .spyOn(service, 'finalizeExpiredAttempts')
        .mockResolvedValue(undefined);

      expect(service.onApplicationBootstrap()).toBeUndefined();
      expect(runSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('finalizeExpiredAttempts', () => {
    it('exits cleanly when no expired attempts are found', async () => {
      await service.finalizeExpiredAttempts();

      expect(repository.findExpiredAttemptIds).toHaveBeenCalledTimes(1);
      expect(repository.findExpiredAttemptIds).toHaveBeenCalledWith(
        now,
        null,
        100,
      );
      expect(finalization.finalizeExpired).not.toHaveBeenCalled();
    });

    it('paginates through keyset batches until a partial batch (< 100) is returned', async () => {
      const firstBatch = Array.from({ length: 100 }, (_, index) => ({
        id: `attempt-${String(index).padStart(3, '0')}`,
      }));
      const secondBatch = [{ id: 'attempt-100' }, { id: 'attempt-101' }];

      repository.findExpiredAttemptIds
        .mockResolvedValueOnce(firstBatch)
        .mockResolvedValueOnce(secondBatch);

      await service.finalizeExpiredAttempts();

      expect(repository.findExpiredAttemptIds).toHaveBeenCalledTimes(2);
      expect(repository.findExpiredAttemptIds).toHaveBeenNthCalledWith(
        1,
        now,
        null,
        100,
      );
      expect(repository.findExpiredAttemptIds).toHaveBeenNthCalledWith(
        2,
        now,
        'attempt-099',
        100,
      );
      expect(finalization.finalizeExpired).toHaveBeenCalledTimes(102);
    });

    it('isolates per-attempt failures, logs safe message without leaking raw error details, and continues batch', async () => {
      repository.findExpiredAttemptIds.mockResolvedValue([
        { id: 'attempt-fail' },
        { id: 'attempt-ok' },
      ]);
      finalization.finalizeExpired
        .mockRejectedValueOnce(new Error('SENSITIVE_DB_PAYLOAD'))
        .mockResolvedValueOnce(null);

      await service.finalizeExpiredAttempts();

      expect(finalization.finalizeExpired).toHaveBeenCalledTimes(2);
      expect(finalization.finalizeExpired).toHaveBeenNthCalledWith(
        1,
        'attempt-fail',
      );
      expect(finalization.finalizeExpired).toHaveBeenNthCalledWith(
        2,
        'attempt-ok',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Could not finalize expired attempt attempt-fail; will retry on the next run.',
      );
      expect(errorSpy.mock.calls.flat().join(' ')).not.toContain(
        'SENSITIVE_DB_PAYLOAD',
      );
    });

    it('catches repository scan failures, logs safe error, and resets running lock for next run', async () => {
      repository.findExpiredAttemptIds
        .mockRejectedValueOnce(new Error('DB connection timeout'))
        .mockResolvedValueOnce([{ id: 'attempt-recovered' }]);

      await service.finalizeExpiredAttempts();

      expect(errorSpy).toHaveBeenCalledWith(
        'Could not scan expired attempts; will retry on the next run.',
      );

      await service.finalizeExpiredAttempts();
      expect(finalization.finalizeExpired).toHaveBeenCalledWith(
        'attempt-recovered',
      );
    });

    it('prevents overlapping runs while an execution is already in progress', async () => {
      let resolveScan!: (rows: { id: string }[]) => void;
      repository.findExpiredAttemptIds.mockImplementation(
        () =>
          new Promise<{ id: string }[]>((resolve) => {
            resolveScan = resolve;
          }),
      );

      const firstRun = service.finalizeExpiredAttempts();
      const overlappingRun = service.finalizeExpiredAttempts();

      expect(repository.findExpiredAttemptIds).toHaveBeenCalledTimes(1);

      resolveScan([]);
      await Promise.all([firstRun, overlappingRun]);
    });
  });
});
