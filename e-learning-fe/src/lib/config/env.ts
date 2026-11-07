export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
  /\/$/,
  "",
);

export function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required.");
  }

  return apiBaseUrl;
}

const springApiBaseUrl = process.env.NEXT_PUBLIC_SPRING_API_BASE_URL?.replace(
  /\/$/,
  "",
);

export function getSpringApiBaseUrl() {
  if (!springApiBaseUrl) {
    throw new Error("NEXT_PUBLIC_SPRING_API_BASE_URL is required.");
  }

  return springApiBaseUrl;
}
