import { useWishlistContext } from "@/providers/wishlist-provider";

export function useWishlist() {
  return useWishlistContext();
}
