"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "@/features/wishlist/api/wishlist-api";
import type { WishlistItem } from "@/features/wishlist/types/wishlist";

type WishlistContextValue = {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  errorMessage: string | null;
  loadWishlist: () => Promise<void>;
  addToWishlist: (
    courseId: string,
  ) => Promise<{ courseId: string; added: boolean } | null>;
  removeFromWishlist: (
    courseId: string,
  ) => Promise<{ courseId: string; removed: boolean } | null>;
  isWishlisted: (courseId: string) => boolean;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { accessToken, status } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadWishlist = useCallback(async () => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getWishlist(accessToken);
      if (currentRequestId === requestId.current) {
        setItems(response ?? []);
      }
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load your wishlist.",
        );
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  }, [accessToken, status]);

  useEffect(() => {
    let active = true;
    if (status === "authenticated") {
      const timer = window.setTimeout(() => {
        if (active) {
          void loadWishlist();
        }
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    } else if (status === "guest") {
      const timer = window.setTimeout(() => {
        requestId.current += 1;
        setItems([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }
    return () => {
      active = false;
    };
  }, [loadWishlist, status]);

  const addCourse = useCallback(
    async (courseId: string) => {
      if (!accessToken) {
        setError("Please sign in to add courses to your wishlist.");
        return null;
      }

      setError(null);
      setLoading(true);
      try {
        const response = await addToWishlist(courseId, accessToken);
        const result = response;
        if (result.added) {
          setItems((current) =>
            current.some((item) => item.courseId === courseId)
              ? current
              : [...current, { courseId, createdAt: new Date().toISOString() }],
          );
          setSuccessMessage("Course added to your wishlist.");
        } else {
          setSuccessMessage("This course is already in your wishlist.");
          await loadWishlist();
        }
        return result;
      } catch (addError) {
        setError(
          addError instanceof Error
            ? addError.message
            : "Failed to add course to your wishlist.",
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [accessToken, loadWishlist],
  );

  const removeCourse = useCallback(
    async (courseId: string) => {
      if (!accessToken) {
        setError("Please sign in to remove courses from your wishlist.");
        return null;
      }

      setError(null);
      setLoading(true);
      try {
        const response = await removeFromWishlist(courseId, accessToken);
        const result = response;
        if (result.removed) {
          setItems((current) =>
            current.filter((item) => item.courseId !== courseId),
          );
          setSuccessMessage("Course removed from your wishlist.");
        } else {
          setSuccessMessage("This course was not in your wishlist.");
        }
        return result;
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : "Failed to remove course from your wishlist.",
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  const isWishlisted = useCallback(
    (courseId: string) => items.some((item) => item.courseId === courseId),
    [items],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      loading,
      error,
      successMessage,
      errorMessage: error,
      loadWishlist,
      addToWishlist: addCourse,
      removeFromWishlist: removeCourse,
      isWishlisted,
    }),
    [
      addCourse,
      error,
      isWishlisted,
      items,
      loadWishlist,
      loading,
      removeCourse,
      successMessage,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlistContext() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }
  return context;
}
