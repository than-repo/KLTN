jest.mock(
  'generated/prisma/enums',
  () =>
    jest.requireActual<typeof import('../../../../../generated/prisma/enums')>(
      '../../../../../generated/prisma/enums',
    ),
  { virtual: true },
);

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MediaTypeEnum } from 'generated/prisma/enums';
import { FileMediaSortFieldDto } from '../../../../../src/features/courses/dtos/file-media/query-file-media.dto';
import type {
  FileMedia,
  IFileMediaRepository,
} from '../../../../../src/features/courses/interfaces/file-media.repository.interface';
import type { CourseAccessService } from '../../../../../src/features/courses/services/course-access.service';
import { FileMediaService } from '../../../../../src/features/courses/services/file-media.service';

describe('FileMediaService', () => {
  let fileMediaRepo: jest.Mocked<IFileMediaRepository>;
  let courseAccessService: jest.Mocked<
    Pick<CourseAccessService, 'ensureInstructorCanManageLesson'>
  >;
  let service: FileMediaService;

  const courseId = 'course-1';
  const sectionId = 'section-1';
  const lessonId = 'lesson-1';
  const fileMediaId = 'media-1';
  const instructorId = 'instructor-1';
  const now = new Date('2026-11-19T00:00:00.000Z');

  const baseMedia: FileMedia = {
    id: fileMediaId,
    lessonId,
    cloudinaryPublicId: 'elearning/lessons/intro',
    url: 'https://res.cloudinary.com/demo/video/upload/intro.mp4',
    type: MediaTypeEnum.VIDEO,
    filename: 'intro.mp4',
    mimeType: 'video/mp4',
    sizeInBytes: 10485760,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(() => {
    fileMediaRepo = {
      create: jest.fn().mockResolvedValue(baseMedia),
      findById: jest.fn(),
      findByIdInLesson: jest.fn().mockResolvedValue(baseMedia),
      update: jest.fn(),
      updateInLesson: jest.fn().mockResolvedValue(baseMedia),
      delete: jest.fn(),
      softDeleteInLesson: jest.fn().mockResolvedValue(true),
      findMany: jest.fn().mockResolvedValue([baseMedia]),
      count: jest.fn().mockResolvedValue(1),
      findByLessonId: jest.fn(),
      existsInLesson: jest.fn(),
      findByCloudinaryPublicId: jest.fn(),
    };

    courseAccessService = {
      ensureInstructorCanManageLesson: jest.fn().mockResolvedValue(undefined),
    };

    service = new FileMediaService(
      fileMediaRepo,
      courseAccessService as unknown as CourseAccessService,
    );
  });

  describe('createFileMedia', () => {
    it('creates file media with normalized nullable fields and returns OWNER view DTO', async () => {
      const result = await service.createFileMedia(
        courseId,
        sectionId,
        lessonId,
        instructorId,
        {
          url: 'https://res.cloudinary.com/demo/video/upload/intro.mp4',
          type: MediaTypeEnum.VIDEO,
        },
      );

      expect(
        courseAccessService.ensureInstructorCanManageLesson,
      ).toHaveBeenCalledWith(courseId, instructorId, sectionId, lessonId);
      expect(fileMediaRepo.create).toHaveBeenCalledWith({
        lessonId,
        cloudinaryPublicId: null,
        url: 'https://res.cloudinary.com/demo/video/upload/intro.mp4',
        type: MediaTypeEnum.VIDEO,
        filename: null,
        mimeType: null,
        sizeInBytes: null,
      });
      expect(result.id).toBe(fileMediaId);
      expect(result).not.toHaveProperty('deletedAt');
    });

    it('propagates access failure when instructor cannot manage lesson', async () => {
      courseAccessService.ensureInstructorCanManageLesson.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.createFileMedia(courseId, sectionId, lessonId, instructorId, {
          url: 'https://example.com/a.pdf',
          type: MediaTypeEnum.DOCUMENT,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(fileMediaRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getFileMediaList', () => {
    it('queries paginated file media scoped to lessonId with defaults', async () => {
      fileMediaRepo.count.mockResolvedValue(15);

      const result = await service.getFileMediaList(
        courseId,
        sectionId,
        lessonId,
        instructorId,
        {
          search: 'intro',
          type: MediaTypeEnum.VIDEO,
          mimeType: 'video/mp4',
          page: 2,
          limit: 10,
        },
      );

      expect(fileMediaRepo.findMany).toHaveBeenCalledWith({
        where: {
          lessonId,
          filenameContains: 'intro',
          type: MediaTypeEnum.VIDEO,
          mimeType: 'video/mp4',
        },
        orderBy: {
          field: FileMediaSortFieldDto.CREATED_AT,
          direction: 'desc',
        },
        limit: 10,
        offset: 10,
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('getFileMedia', () => {
    it('returns file media when found in lesson and throws NotFoundException otherwise', async () => {
      const found = await service.getFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
      );
      expect(found.filename).toBe('intro.mp4');

      fileMediaRepo.findByIdInLesson.mockResolvedValueOnce(null);
      await expect(
        service.getFileMedia(
          courseId,
          sectionId,
          lessonId,
          fileMediaId,
          instructorId,
        ),
      ).rejects.toThrow(new NotFoundException('FILE_MEDIA_NOT_FOUND'));
    });
  });

  describe('updateFileMedia', () => {
    it('updates provided fields (including explicit nulls) via updateInLesson', async () => {
      fileMediaRepo.updateInLesson.mockResolvedValue({
        ...baseMedia,
        filename: 'renamed.mp4',
        cloudinaryPublicId: null,
      });

      const result = await service.updateFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
        {
          filename: 'renamed.mp4',
          cloudinaryPublicId: null,
        },
      );

      expect(fileMediaRepo.updateInLesson).toHaveBeenCalledWith(
        fileMediaId,
        lessonId,
        {
          filename: 'renamed.mp4',
          cloudinaryPublicId: null,
        },
      );
      expect(result.filename).toBe('renamed.mp4');
    });

    it('throws BadRequestException when no valid fields are provided', async () => {
      await expect(
        service.updateFileMedia(
          courseId,
          sectionId,
          lessonId,
          fileMediaId,
          instructorId,
          {},
        ),
      ).rejects.toThrow(
        new BadRequestException('NO_VALID_FILE_MEDIA_FIELDS_PROVIDED'),
      );
      expect(fileMediaRepo.updateInLesson).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when updateInLesson returns null', async () => {
      fileMediaRepo.updateInLesson.mockResolvedValue(null);

      await expect(
        service.updateFileMedia(
          courseId,
          sectionId,
          lessonId,
          fileMediaId,
          instructorId,
          { filename: 'new.mp4' },
        ),
      ).rejects.toThrow(new NotFoundException('FILE_MEDIA_NOT_FOUND'));
    });
  });

  describe('deleteFileMedia', () => {
    it('soft deletes file media in lesson and throws NotFoundException when not found', async () => {
      await expect(
        service.deleteFileMedia(
          courseId,
          sectionId,
          lessonId,
          fileMediaId,
          instructorId,
        ),
      ).resolves.toBeUndefined();
      expect(fileMediaRepo.softDeleteInLesson).toHaveBeenCalledWith(
        fileMediaId,
        lessonId,
      );

      fileMediaRepo.softDeleteInLesson.mockResolvedValueOnce(false);
      await expect(
        service.deleteFileMedia(
          courseId,
          sectionId,
          lessonId,
          fileMediaId,
          instructorId,
        ),
      ).rejects.toThrow(new NotFoundException('FILE_MEDIA_NOT_FOUND'));
    });
  });
});
