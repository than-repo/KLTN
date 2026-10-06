import { Module } from '@nestjs/common';

import { SkillSuggestionService } from './services/skill-suggestion.service';
import { SkillSuggestionController } from './skill-suggestion.controller';

@Module({
  providers: [SkillSuggestionService],
  controllers: [SkillSuggestionController],
  exports: [SkillSuggestionService],
})
export class SkillSuggestionModule {}
