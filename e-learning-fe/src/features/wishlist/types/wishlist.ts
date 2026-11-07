export type WishlistItem = {
  courseId: string;
  createdAt: string;
};

export type WishlistAddResult = {
  courseId: string;
  added: boolean;
};

export type WishlistRemoveResult = {
  courseId: string;
  removed: boolean;
};
