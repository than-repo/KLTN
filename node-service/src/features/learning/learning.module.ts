import { Module } from '@nestjs/common';
import { LearnerCoursesController } from './controllers/learning-courses.controller';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { LearningCoursesService } from './services/learning-courses.service';
import { LearningCourseRepository } from './repositories/learning-course.repository';
import { LEARNING_COURSE_REPOSITORY } from './repositories/learning-course.repository.token';
import { LearnerCoursesV2Controller } from './controllers/learning-courses-v2.controller';
import { LearningCoursesV2Service } from './services/learning-courses-v2.service';
import { LEARNING_COURSE_V2_REPOSITORY } from './repositories/learning-course-v2.repository.token';
import { LearningCourseV2Repository } from './repositories/learning-course-v2.repository';

@Module({
  imports: [EnrollmentsModule],
  exports: [],
  controllers: [LearnerCoursesController, LearnerCoursesV2Controller],
  providers: [
    LearningCoursesService,
    LearningCoursesV2Service,
    {
      provide: LEARNING_COURSE_REPOSITORY,
      useClass: LearningCourseRepository,
    },
    {
      provide: LEARNING_COURSE_V2_REPOSITORY,
      useClass: LearningCourseV2Repository,
    },
  ],
})
export class LearningModule {}
