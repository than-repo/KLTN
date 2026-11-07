import { apiRequest } from "@/lib/api/client";
import { getSpringApiBaseUrl } from "@/lib/config/env";

import type {
  WishlistAddResult,
  WishlistItem,
  WishlistRemoveResult,
} from "../types/wishlist";

const wishlistDevHeaders: HeadersInit = {
  "ngrok-skip-browser-warning": "true",
};

function wishlistUrl(path: string) {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${getSpringApiBaseUrl()}/api/wishlist${normalizedPath}`;
}

export function addToWishlist(courseId: string, accessToken: string) {
  return apiRequest<WishlistAddResult>(
    wishlistUrl(`/courses/${encodeURIComponent(courseId)}`),
    {
      accessToken,
      method: "POST",
      headers: wishlistDevHeaders,
    },
  );
}

export function removeFromWishlist(courseId: string, accessToken: string) {
  return apiRequest<WishlistRemoveResult>(
    wishlistUrl(`/courses/${encodeURIComponent(courseId)}`),
    {
      accessToken,
      method: "DELETE",
      headers: wishlistDevHeaders,
    },
  );
}

export function getWishlist(accessToken: string) {
  return apiRequest<WishlistItem[]>(wishlistUrl(""), {
    accessToken,
    method: "GET",
  });
}
