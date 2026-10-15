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
