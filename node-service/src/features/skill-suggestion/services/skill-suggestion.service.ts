import { Injectable } from '@nestjs/common';
import { SkillCandidate } from '../skill-suggestion.interfaces';

@Injectable()
export class SkillSuggestionService {
  async searchSkills(query: string) {}

  async rankSkills(candidates: SkillCandidate[]) {}

  async suggestSkill(query: string) {}
}
