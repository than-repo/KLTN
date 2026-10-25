export type ReviewerAuthorizedCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ReviewerCategoryAuthorizations = {
  categories: ReviewerAuthorizedCategory[];
  reviewerId: string;
};

export type ReplaceReviewerCategoryAuthorizationsPayload = {
  categoryIds: string[];
};
