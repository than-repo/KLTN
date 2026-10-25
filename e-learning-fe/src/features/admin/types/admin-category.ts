export type AdminCategorySortBy = "name" | "order" | "createdAt" | "updatedAt";

export type AdminCategorySortOrder = "asc" | "desc";

export type AdminCourseCategory = {
  children?: AdminCourseCategory[];
  childrenCount?: number;
  courseCount?: number;
  createdAt?: string;
  deletedAt?: string | null;
  description?: string | null;
  id: string;
  isActive: boolean;
  name: string;
  order?: number;
  parentId?: string | null;
  parentName?: string | null;
  slug: string;
  updatedAt?: string;
};

export type AdminCategoryQuery = {
  includeDeleted?: boolean;
  isActive?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: AdminCategorySortBy;
  sortOrder?: AdminCategorySortOrder;
};

export type CreateAdminCategoryPayload = {
  description?: string;
  name: string;
  parentId?: string;
};

export type UpdateAdminCategoryPayload = {
  description?: string | null;
  isActive?: boolean;
  name?: string;
  order?: number;
  parentId?: string | null;
};

export type AdminCategoriesResponse = {
  data: AdminCourseCategory[];
  meta: {
    limit: number;
    page: number;
    total: number;
  };
};
