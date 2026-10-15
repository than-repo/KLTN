import { Module } from '@nestjs/common';
import { SkillController } from './skill.controller';
import { SkillService } from './services/skill.service';
import { EmbeddingService } from './services/embedding.service';
import { SkillRepository } from './repositories/skill.repository';
import { SkillSuggestionService } from './services/skill-suggestion.service';

@Module({
  controllers: [SkillController],
  providers: [
    SkillService,
    EmbeddingService,
    SkillRepository,
    SkillSuggestionService,
  ],

  imports: [],
  exports: [],
})
export class SkillModule {}
