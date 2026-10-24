import { forwardRef, Module } from '@nestjs/common';
import { SkillController } from './skill.controller';
import { SkillService } from './services/skill.service';
import { EmbeddingService } from './services/embedding.service';
import { SkillRepository } from './repositories/skill.repository';
import { SkillSuggestionService } from './services/skill-suggestion.service';
import { CoursesModule } from '../courses/courses.module';
import { AssessmentsModule } from '../assessments/assessments.module';

@Module({
  controllers: [SkillController],
  providers: [
    SkillService,
    EmbeddingService,
    SkillRepository,
    SkillSuggestionService,
  ],

  imports: [forwardRef(() => CoursesModule), AssessmentsModule],
  exports: [SkillService],
})
export class SkillModule {}
