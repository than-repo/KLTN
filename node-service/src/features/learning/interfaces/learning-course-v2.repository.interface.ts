import type { MediaTypeModel } from './learning-course.repository.interface';

export interface LearningPaginationParams {
  offset: number;
  limit: number;
}

export interface PaginatedLearningRepositoryResult<T> {
  data: T[];
  total: number;
}

export interface LearningCourseOverviewModel {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnailUrl: string | null;
  contentSummary: {
    sectionCount: number;
    lessonCount: number;
  };
}

export interface LearningSectionSummaryModel {
  id: string;
  title: string;
  description: string | null;
  sectionIndex: number;
  lessonCount: number;
}

export interface LearningLessonSummaryModel {
  id: string;
  title: string;
  description: string | null;
  lessonIndex: number;
  fileCount: number;
}

export interface LearningLessonDetailModel {
  id: string;
  title: string;
  description: string | null;
  lessonIndex: number;
  files: LearningFileV2Model[];
}

export interface LearningFileV2Model {
  id: string;
  url: string;
  type: MediaTypeModel;
}

export interface ILearningCourseV2Repository {
  existsCourseForLearning(courseId: string): Promise<boolean>;

  existsSectionForLearning(
    courseId: string,
    sectionId: string,
  ): Promise<boolean>;

  findCourseOverview(
    courseId: string,
  ): Promise<LearningCourseOverviewModel | null>;

  findSections(
    courseId: string,
    params: LearningPaginationParams,
  ): Promise<PaginatedLearningRepositoryResult<LearningSectionSummaryModel>>;

  findLessons(
    courseId: string,
    sectionId: string,
    params: LearningPaginationParams,
  ): Promise<PaginatedLearningRepositoryResult<LearningLessonSummaryModel>>;

  findLessonDetail(
    courseId: string,
    lessonId: string,
  ): Promise<LearningLessonDetailModel | null>;
}
