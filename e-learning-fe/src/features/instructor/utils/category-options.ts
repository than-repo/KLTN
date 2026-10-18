import type { CategoryTreeNode } from "@/features/courses/types/course";

export type CategoryOption = {
  depth: number;
  id: string;
  isLeaf: boolean;
  name: string;
};

export function buildCategoryOptions(
  categories: CategoryTreeNode[],
  depth = 0,
): CategoryOption[] {
  return categories.flatMap((category) => {
    const children = category.children ?? [];

    const option: CategoryOption = {
      depth,
      id: category.id,
      isLeaf: children.length === 0,
      name: category.name,
    };

    return [option, ...buildCategoryOptions(children, depth + 1)];
  });
}

export function formatCategoryLabel(option: CategoryOption) {
  const prefix = option.depth > 0 ? " ".repeat(option.depth) : "";
  const suffix = option.isLeaf ? "" : " (Parent Group)";

  return `${prefix}${option.name}${suffix}`;
}
