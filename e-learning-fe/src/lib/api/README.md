# API Boundary Conventions

This folder will contain the shared API client boundary when integration starts.

- Read the API base URL from `NEXT_PUBLIC_API_BASE_URL`.
- Keep auth/token behavior isolated from feature modules.
- Normalize backend errors in one place before feature code consumes them.
- Do not call `fetch` directly from feature components once the client exists.