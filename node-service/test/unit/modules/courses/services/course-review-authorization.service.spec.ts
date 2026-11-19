import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  IReviewerCategoryAuthorizationRepository,
  ReviewerAuthorizedCategoryModel,
} from '../../../../../src/features/courses/interfaces/reviewer-category-authorization.repository.interface';
import { CourseReviewAuthorizationService } from '../../../../../src/features/courses/services/course-review-authorization.service';

describe('CourseReviewAuthorizationService', () => {
  let repo: jest.Mocked<IReviewerCategoryAuthorizationRepository>;
  let service: CourseReviewAuthorizationService;

  const reviewerId = 'reviewer-1';
  const catA: ReviewerAuthorizedCategoryModel = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Backend',
    slug: 'backend',
  };
  const catB: ReviewerAuthorizedCategoryModel = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Frontend',
    slug: 'frontend',
  };

  beforeEach(() => {
    repo = {
      existsActiveReviewer: jest.fn().mockResolvedValue(true),
      findActiveCategoriesByIds: jest.fn().mockResolvedValue([catA, catB]),
      findAuthorizedCategories: jest.fn().mockResolvedValue([catA]),
      replaceAuthorizedCategories: jest.fn().mockResolvedValue([catA, catB]),
    };

    service = new CourseReviewAuthorizationService(repo);
  });

  describe('getReviewerCategoryAuthorizations', () => {
    it('returns authorized categories for an active reviewer', async () => {
      const result =
        await service.getReviewerCategoryAuthorizations(reviewerId);

      expect(repo.existsActiveReviewer).toHaveBeenCalledWith(reviewerId);
      expect(repo.findAuthorizedCategories).toHaveBeenCalledWith(reviewerId);
      expect(result).toEqual({
        reviewerId,
        categories: [catA],
      });
    });

    it('throws NotFoundException REVIEWER_NOT_FOUND when reviewer is missing or inactive', async () => {
      repo.existsActiveReviewer.mockResolvedValue(false);

      await expect(
        service.getReviewerCategoryAuthorizations(reviewerId),
      ).rejects.toThrow(new NotFoundException('REVIEWER_NOT_FOUND'));
      expect(repo.findAuthorizedCategories).not.toHaveBeenCalled();
    });
  });

  describe('replaceReviewerCategoryAuthorizations', () => {
    it('validates categories and replaces reviewer authorizations', async () => {
      const result = await service.replaceReviewerCategoryAuthorizations(
        reviewerId,
        { categoryIds: [catA.id, catB.id] },
      );

      expect(repo.findActiveCategoriesByIds).toHaveBeenCalledWith([
        catA.id,
        catB.id,
      ]);
      expect(repo.replaceAuthorizedCategories).toHaveBeenCalledWith(
        reviewerId,
        [catA.id, catB.id],
      );
      expect(result.categories).toEqual([catA, catB]);
    });

    it('allows empty categoryIds array to revoke all authorizations without querying categories', async () => {
      repo.replaceAuthorizedCategories.mockResolvedValue([]);

      const result = await service.replaceReviewerCategoryAuthorizations(
        reviewerId,
        { categoryIds: [] },
      );

      expect(repo.findActiveCategoriesByIds).not.toHaveBeenCalled();
      expect(repo.replaceAuthorizedCategories).toHaveBeenCalledWith(
        reviewerId,
        [],
      );
      expect(result.categories).toEqual([]);
    });

    it('throws BadRequestException DUPLICATE_CATEGORY_IDS when duplicate IDs are passed', async () => {
      await expect(
        service.replaceReviewerCategoryAuthorizations(reviewerId, {
          categoryIds: [catA.id, catA.id],
        }),
      ).rejects.toThrow(new BadRequestException('DUPLICATE_CATEGORY_IDS'));
      expect(repo.replaceAuthorizedCategories).not.toHaveBeenCalled();
    });

    it('throws NotFoundException CATEGORY_ID_NOT_FOUND when any category is inactive or missing', async () => {
      repo.findActiveCategoriesByIds.mockResolvedValue([catA]); // catB missing

      await expect(
        service.replaceReviewerCategoryAuthorizations(reviewerId, {
          categoryIds: [catA.id, catB.id],
        }),
      ).rejects.toThrow(new NotFoundException('CATEGORY_ID_NOT_FOUND'));
      expect(repo.replaceAuthorizedCategories).not.toHaveBeenCalled();
    });

    it('throws NotFoundException REVIEWER_NOT_FOUND when reviewer does not exist', async () => {
      repo.existsActiveReviewer.mockResolvedValue(false);

      await expect(
        service.replaceReviewerCategoryAuthorizations(reviewerId, {
          categoryIds: [catA.id],
        }),
      ).rejects.toThrow(new NotFoundException('REVIEWER_NOT_FOUND'));
    });
  });
});
