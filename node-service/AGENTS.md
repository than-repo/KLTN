# AGENTS.md

## Project Overview

This is a private NestJS backend API for an e-learning system.
Core stack:

- **NestJS 11**
- **TypeScript**
- **Prisma 7**
- **MySQL 8.4**
- **JWT + Passport authentication**
- **Google OAuth 2.0**
- **bcrypt** for password hashing
- **class-validator / class-transformer**
- **Swagger/OpenAPI**
- **NestJS Throttler**
- **NestJS Schedule**
- **Cloudinary**
- **Cookie-based refresh token handling**
- **Helmet** for security headers
- **Jest + Supertest**
- **ESLint + Prettier**
- **Docker Compose** for local MySQL

## Important Directories

- `src/features/` — feature modules such as courses, auth, users, categories
- `src/core/` — shared infrastructure such as database.
- `src/common` - is for code that is **shared**, **generic**, helper.
- `src/features/*/controllers/` — HTTP route handlers
- `src/features/*/services/` — business logic
- `src/features/*/repositories/` — Prisma-backed data access implementations
- `src/features/*/interfaces/` — repository contracts and application-level types
- `src/features/*/dtos/` — request/response DTOs
- `prisma/` — Prisma schema and migrations
- `generated\prisma\` — models, client, enums, commonInputTypes.
- `.development.env` — environment variable for development.

## Setup

Install dependencies:

```bash
npm install
```

Create environment file:

```
cp .env.example .env
```

Update database connection variables in `.development.env`
Generate Prisma client:

```
npx prisma generate
```

Run database migrations:

```
npx prisma migrate dev
```

## Running the Project

Run in development mode:

```
npm run start:dev
```

Run in normal mode:

```
npm run start
```

Run in production mode:

```
npm run start:prod
```

## Build, Test, and Lint

Build:

```
npm run build
```

Run tests:

```
npm run test
```

Run test coverage:

```
npm run test:cov
```

Run lint:

```
npm run lint
```

Format code:

```
npm run format
```

Before finishing a task, run the smallest relevant check. For broad changes, run build and tests.

## Engineering Conventions

- Need: Production-level, not over-engineered and safety.
- Code is maintainable:
  -Make code easy to understand, change, test, and safely extend without breaking existing behavior
  -have clear responsibility.
  -be easy to read before it is clever.
  -Names should reveal intent.

- Using SOLID principle:
  -Apply SOLID principles pragmatically, but do not over-engineer.  
   Keep each class focused on one responsibility.  
  -Prefer dependency injection over manually creating dependencies.  
  -Depend on interfaces or tokens at service boundaries when the project already uses that pattern.
- Extend behavior with small focused classes/functions instead of modifying unrelated code.
- Do not introduce abstractions unless they reduce real duplication or protect an important boundary.
- Follow the existing project structure, naming style, and module organization before creating a new pattern.
- Keep changes small, focused, and directly related to the requested task.
- Prefer simple, readable code over clever abstractions.
- Prefer explicit TypeScript types over loose or implicit types.
- Avoid `any` unless there is no reasonable alternative.
- Do not introduce new packages unless the existing stack cannot reasonably solve the problem.
- Do not change public API behavior, response shape, database schema, or authentication flow unless the task requires it.
- Preserve validation, authorization, error handling, logging, and security-related behavior when modifying existing code.
- Update related DTOs, Swagger decorators, tests, mappings, and repository interfaces when changing API behavior.
- Keep error messages useful, but do not expose sensitive internal details.
- Use NestJS built-in patterns where possible instead of creating custom framework-like abstractions.
- Keep environment-specific values in configuration or environment variables, not hardcoded in application logic.
- Avoid large rewrites when a small targeted change is enough.
- Do not modify unrelated files just to improve style.
- Do not leave temporary code, unused imports, debug logs, commented-out blocks, or dead code.
- Make code easy to review: clear names, small functions, predictable control flow, and minimal side effects.
- When behavior changes, update or add tests when practical.
- Before marking work complete, run the smallest relevant verification command and report what was checked.

## Layering Conventions

The project follows this flow:  
 Controller → Service → Repository Interface → Repository Implementation → Prisma  
 Try to apply clean architecture ( keep business logic only in services. )

- Controllers handle HTTP concerns.
- Services handle business logic.
- Repository interfaces define application-level data contracts.
- Repository implementations handle database access.
- Prisma should stay inside repository implementations when possible.

## Controller Conventions

Controllers should be thin HTTP adapters.
Controllers should:

- name by Rest convention.
- define routes and HTTP methods
- apply guards, roles, interceptors, and decorators,
- receive `params`, `query`, `body`, headers, cookies, and current user
- call service methods for business logic
- return service results
- handle HTTP transport details when needed, such as setting or clearing cookies, setting response headers, and choosing status codes
- group endpoints with Swagger tags using `@ApiTags(...)`
- document important endpoints with Swagger decorators when appropriate

Controllers should not:

- contain business logic
- call Prisma directly
- access repositories directly
- perform complex data mapping
- generate tokens or hash passwords directly
- decide authorization rules manually when guards/policies/services should handle them
- return sensitive internal fields
- duplicate validation that belongs in DTOs, pipes, guards, or services

## Service Conventions

Services should:

- validate business rules
- check permissions and ownership.
- coordinate repositories (interfaces through @Inject() )
- service depends on repository interfaces like `ICourseRepository` ( Dependency inversion)
- throw proper NestJS exceptions
- map results to response DTOs when needed
- service decides what show for user.
- use `plainToInstance` with group property to exclude sensitive field.( at DTOs have group for all fields)
- try to apply clean architecture (business logic is only inside services. Services is not tight coupling with other layer, Separate business logic from technical details.)
- Background jobs are used for slow work
  Services should not directly use Prisma.

## Repository Conventions

Repositories should:

- implement a interface.
- query the database
- build database filters and ordering
- handle database-specific details
- map database results to application-level models.
- Consider using `prisma.$stransaction`.
- Consider Model's state. Example `isActive, DeleteAt`

Repository interfaces should use application-defined types, not Prisma-specific types.

Prisma types may be used inside Prisma repository implementation files.

## DTO Conventions

Use DTOs for request validation, query validation, and response shaping.

DTOs define which fields controllers may receive and which fields responses may expose. Choose response fields carefully and safely.

Use:

- `class-validator` for validation
- `class-transformer` for transformation and serialization
- Swagger decorators when the DTO is part of public API documentation

### Output DTOs

For output DTOs, prefer creating a complete response DTO for the model, then use `@Expose({ groups: [...] })` to control which fields are visible for each audience.
Common output groups may include:

- public
- learner
- instructor
- admin
  Example:

```ts
export const COURSE_VIEW_GROUPS = {
  PUBLIC: 'course:public',
  LEARNER: 'course:learner',
  INSTRUCTOR: 'course:instructor',
  ADMIN: 'course:admin',
} as const;

export class CourseResponseDto {
  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.LEARNER,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  id: string;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.LEARNER,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  title: string;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.INSTRUCTOR, COURSE_VIEW_GROUPS.ADMIN],
  })
  status: string;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.INSTRUCTOR, COURSE_VIEW_GROUPS.ADMIN],
  })
  deletedAt?: Date | null;
}
```

Use groups when the same resource has mostly the same response shape but different field visibility.

Use separate response DTOs when the response structure is very different.

For related models in output DTOs:

- show only the related fields needed by the client
- prefer summary DTOs for relations
- do not expose full internal/database models directly

Example:

```ts
export class CategorySummaryDto {
  id: string;
  name: string;
  slug: string;
}

export class CourseResponseDto {
  @Type(() => CategorySummaryDto)
  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.LEARNER,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  categories?: CategorySummaryDto[];
}
```

### Input DTOs

For input DTOs, prefer shared base classes when multiple input DTOs reuse the same fields.

Use mapped types such as `PartialType`, `PickType`, and `OmitType` when they make the DTO clearer.

Example:

```ts
export class CourseBaseInputDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

export class CreateCourseDto extends CourseBaseInputDto {}

export class UpdateCourseDto extends PartialType(CourseBaseInputDto) {}
```

Input DTO relation fields should usually be IDs, not nested objects.

Good:

```ts
categoryIds: string[];
instructorIds?: string[];
```

Avoid unless explicitly required:

```ts
categories: CategoryDto[];
instructors: InstructorDto[];
```

Do not use base classes if they make validation unclear or allow a role to send fields it should not control.

Be careful with base input DTOs. They can create tight coupling between different use cases if too many DTOs extend the same base class.

Create separate input DTOs for different roles when permissions differ.

Do not include server-controlled fields in client input DTOs unless the use case explicitly requires them.

Examples of server-controlled fields:

- `id`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `status`
- `ownerId`
- authenticated `userId`

### Input Transformation

Use `@Transform` for basic input normalization when appropriate.
For important string fields, trim whitespace:

```ts
@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
```

Use this especially for fields such as:

- email
- username
- title
- slug
- search keyword
- short text input  
  For optional query fields, convert empty strings to `undefined` before validation when appropriate.

Boolean transform example:

```ts
@Transform(({ value }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;

  return value;
})
```

Number transform example:

```ts
@Transform(({ value }) => {
  if (value === undefined || value === null || value === '') return undefined;

  return Number(value);
})
```

For arrays, follow the existing project request style consistently. Do not introduce a different array format for one endpoint only.

## Security Rules

Never trust client input.

Always consider:

- authentication by JWT Strategy
- authorization by RBAC with @Roles
- ownership should handle in services.
- parent-child relationship
- sensitive fields in responses must be handle in service.

User identity should usually come from the authenticated request/JWT, not from request body.

Use global throttling as a baseline if the app is configured for it, then apply `@Throttle(...)` on specific controllers or routes that need stricter or different limits.

## Concurrency Conventions

- Do not rely only on pre-checks like `exists()` for correctness when concurrent requests can conflict.
- Business rules that require concurrency safety should be decided in services.
- Database-level protection should be enforced with unique constraints, transactions, locks, atomic updates, or upserts inside repositories as appropriate.
- Services may coordinate retries or business decisions after repository/database conflicts.

## Constraints and Do-Not Rules

Do not:

- call Prisma directly from controllers
- put business logic in controllers
- expose password hashes, tokens, or sensitive internal fields
- remove validation, guards, or permission checks without replacing them properly
- introduce new libraries without a clear need
- rewrite unrelated files
- rename files/classes casually
- change public API response shape unless the task requires it
- mark work complete if TypeScript/build/test errors remain

## PR / Change Expectations

When making changes:

- Keep changes small and focused.
- Read nearby files before editing.
- Follow existing patterns in the same feature.
- Update DTOs, Swagger decorators, and tests when behavior changes.
- Explain important design decisions briefly.
- Mention any checks that were run.
- Mention any checks that could not be run.

## Definition of Done

A task is done only when:

- the requested behavior is implemented
- TypeScript compiles for affected code
- relevant tests pass, or missing tests are clearly mentioned
- validation and authorization are preserved
- API response shape is correct and safety.
- Prisma schema/client/migrations are updated if database shape changed
- Swagger docs are updated if API shape changed
- no unrelated files were modified
- no sensitive fields are exposed

## Verification

For small DTO/service/controller changes, run:

```
npm run build
```

For logic changes, run:

```
npm run test
```

For formatting/linting changes, run:

```
npm run lint
```

For Prisma schema changes, run:

```
npx prisma generatenpx prisma migrate devnpm run build
```

If a command cannot be run, explain why and state what was checked manually.
