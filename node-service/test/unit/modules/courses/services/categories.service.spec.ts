jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        code: string;
        meta?: Record<string, unknown>;
        constructor(
          message: string,
          { code, meta }: { code: string; meta?: Record<string, unknown> },
        ) {
          super(message);
          this.code = code;
          this.meta = meta;
        }
      },
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/common/utils/prisma-error.util',
  () =>
    jest.requireActual<
      typeof import('../../../../../src/common/utils/prisma-error.util')
    >('../../../../../src/common/utils/prisma-error.util'),
  { virtual: true },
);

jest.mock(
  'src/common/utils/slugify.util',
  () =>
    jest.requireActual<
      typeof import('../../../../../src/common/utils/slugify.util')
    >('../../../../../src/common/utils/slugify.util'),
  { virtual: true },
);

jest.mock(
  'src/common/utils/clean-data-util',
  () =>
    jest.requireActual<
      typeof import('../../../../../src/common/utils/clean-data-util')
    >('../../../../../src/common/utils/clean-data-util'),
  { virtual: true },
);

import { NotFoundException } from '@nestjs/common';
import { PrismaErrorHandler } from 'src/common/utils/prisma-error.util';
import type {
  Category,
  ICategoryRepository,
} from '../../../../../src/features/courses/interfaces/category.repository.interface';
import { CategoriesService } from '../../../../../src/features/courses/services/categories.service';

describe('CategoriesService', () => {
  let categoryRepo: jest.Mocked<ICategoryRepository>;
  let service: CategoriesService;

  const now = new Date('2026-11-19T00:00:00.000Z');
  const baseCategory: Category = {
    id: 'cat-1',
    name: 'Web Development',
    slug: 'web-development',
    description: 'Web dev courses',
    parentId: null,
    order: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(() => {
    categoryRepo = {
      getNextOrder: jest.fn().mockResolvedValue(1),
      existsBySlug: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(baseCategory),
      findById: jest.fn().mockResolvedValue(baseCategory),
      findByIdIncludingDeleted: jest.fn().mockResolvedValue(baseCategory),
      findBySlug: jest.fn(),
      findMany: jest.fn().mockResolvedValue([baseCategory]),
      findManyByIds: jest.fn(),
      findAllActive: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(baseCategory),
      softDelete: jest
        .fn()
        .mockResolvedValue({ ...baseCategory, deletedAt: now }),
      hasAssociatedCourses: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    };

    service = new CategoriesService(categoryRepo);
  });

  describe('createCategory', () => {
    it('generates a unique slug with incrementing suffix on collision, validates parent, and creates category', async () => {
      categoryRepo.existsBySlug
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      categoryRepo.getNextOrder.mockResolvedValue(3);

      const result = await service.createCategory({
        name: 'Web Development',
        description: 'Web dev courses',
        parentId: 'parent-1',
      });

      expect(categoryRepo.findById).toHaveBeenCalledWith('parent-1');
      expect(categoryRepo.create).toHaveBeenCalledWith({
        name: 'Web Development',
        slug: 'web-development-2',
        description: 'Web dev courses',
        parentId: 'parent-1',
        order: 3,
      });
      expect(result.id).toBe('cat-1');
    });

    it('throws NotFoundException when parentId does not exist', async () => {
      categoryRepo.findById.mockResolvedValue(null);

      await expect(
        service.createCategory({
          name: 'Backend',
          parentId: 'missing-parent',
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'Parent category with id missing-parent not found',
        ),
      );
      expect(categoryRepo.create).not.toHaveBeenCalled();
    });

    it('delegates repository errors to PrismaErrorHandler.handle', async () => {
      const dbError = new Error('DB_ERROR');
      categoryRepo.create.mockRejectedValue(dbError);
      const handleSpy = jest
        .spyOn(PrismaErrorHandler, 'handle')
        .mockImplementation(() => {
          throw new Error('HANDLED_DB_ERROR');
        });

      await expect(
        service.createCategory({ name: 'Web Development' }),
      ).rejects.toThrow('HANDLED_DB_ERROR');
      expect(handleSpy).toHaveBeenCalledWith(dbError, { entity: 'Category' });
      handleSpy.mockRestore();
    });
  });

  describe('updateCategory', () => {
    it('regenerates slug when name changes and recalculates order when parentId changes', async () => {
      categoryRepo.getNextOrder.mockResolvedValue(4);

      await service.updateCategory('cat-1', {
        name: 'Backend Engineering',
        parentId: 'parent-2',
      });

      expect(categoryRepo.existsBySlug).toHaveBeenCalledWith(
        'backend-engineering',
      );
      expect(categoryRepo.getNextOrder).toHaveBeenCalledWith('parent-2');
      expect(categoryRepo.update).toHaveBeenCalledWith('cat-1', {
        name: 'Backend Engineering',
        slug: 'backend-engineering',
        parentId: 'parent-2',
        order: 4,
      });
    });

    it('does not regenerate slug or order when name and parentId are unchanged', async () => {
      await service.updateCategory('cat-1', {
        name: 'Web Development',
        description: 'Updated desc',
      });

      expect(categoryRepo.existsBySlug).not.toHaveBeenCalled();
      expect(categoryRepo.getNextOrder).not.toHaveBeenCalled();
      expect(categoryRepo.update).toHaveBeenCalledWith('cat-1', {
        name: 'Web Development',
        description: 'Updated desc',
      });
    });

    it('throws NotFoundException when category does not exist', async () => {
      categoryRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateCategory('missing', { name: 'New Name' }),
      ).rejects.toThrow(new NotFoundException('Not found category'));
    });
  });

  describe('setCategoryActiveStatus, softDeleteCategory & restoreCategory', () => {
    it('updates active status when category exists', async () => {
      categoryRepo.update.mockResolvedValue({
        ...baseCategory,
        isActive: false,
      });

      const result = await service.setCategoryActiveStatus('cat-1', false);

      expect(categoryRepo.update).toHaveBeenCalledWith('cat-1', {
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });

    it('soft deletes category when found and throws NotFoundException otherwise', async () => {
      await service.softDeleteCategory('cat-1');
      expect(categoryRepo.softDelete).toHaveBeenCalledWith('cat-1');

      categoryRepo.findById.mockResolvedValueOnce(null);
      await expect(service.softDeleteCategory('missing')).rejects.toThrow(
        new NotFoundException('Category with id missing not found'),
      );
    });

    it('restores a soft-deleted category via findByIdIncludingDeleted', async () => {
      categoryRepo.findByIdIncludingDeleted.mockResolvedValue({
        ...baseCategory,
        deletedAt: now,
      });

      await service.restoreCategory('cat-1');

      expect(categoryRepo.update).toHaveBeenCalledWith('cat-1', {
        deletedAt: null,
      });
    });

    it('throws NotFoundException when restoring non-existent category', async () => {
      categoryRepo.findByIdIncludingDeleted.mockResolvedValue(null);

      await expect(service.restoreCategory('missing')).rejects.toThrow(
        new NotFoundException('Category with id missing not found'),
      );
    });
  });

  describe('getCategories & findAllAsTree', () => {
    it('returns paginated categories with calculated pagination meta', async () => {
      categoryRepo.count.mockResolvedValue(25);

      const result = await service.getCategories({
        search: 'web',
        isActive: true,
        page: 2,
        limit: 10,
      });

      expect(categoryRepo.findMany).toHaveBeenCalledWith({
        where: {
          nameContains: 'web',
          parentId: undefined,
          includeDeleted: undefined,
          isActive: true,
        },
        orderBy: { field: 'createdAt', direction: 'desc' },
        limit: 10,
        offset: 10,
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('builds a nested category tree and strips non-exposed fields', async () => {
      const root: Category = { ...baseCategory, id: 'root-1', parentId: null };
      const child: Category = {
        ...baseCategory,
        id: 'child-1',
        name: 'NestJS',
        slug: 'nestjs',
        parentId: 'root-1',
      };
      const orphan: Category = {
        ...baseCategory,
        id: 'orphan-1',
        parentId: 'missing-parent',
      };
      categoryRepo.findAllActive.mockResolvedValue([root, child, orphan]);

      const tree = await service.findAllAsTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('root-1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('child-1');
      expect(tree[0]).not.toHaveProperty('isActive');
      expect(tree[0]).not.toHaveProperty('deletedAt');
    });
  });
});
