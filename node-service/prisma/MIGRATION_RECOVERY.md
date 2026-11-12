# Migration history recovery

The original `20260604015206_elearning` migration was lost. The six subsequent
migrations could not recreate an empty database and did not describe the full
existing schema. They are preserved unchanged under
`migrations-archive/pre-baseline-20261112` for reference, outside the active history.

The active history is now:

1. `0_baseline`: the existing database schema before the `afterLesson` change.
   It creates all 24 application tables and contains no application data.
2. `20261112082917_add_assessment_after_lesson`: adds the nullable lesson reference
   to assessments, with `ON DELETE SET NULL`.

## Fresh databases

Run `npx prisma migrate deploy`, then `npx prisma generate`. Fresh databases must
execute both migrations. Do not mark the baseline as applied on an empty database.

## Existing databases with the old history

This is a coordinated, one-time operation. Stop application writes and other
migration runners for the duration. Do not run `migrate reset`, replay the baseline
against existing application tables, or blindly mark the six archived migrations
as applied.

The local database configured by `.development.env` has already been recovered.
Do not repeat its metadata cleanup. Follow this procedure separately for each
other existing database before deploying the new migrations there.

### 1. Select the target and create verified backups

Run commands from the `node-service` directory. The Prisma configuration loads
`.development.env`; shell `DATABASE_URL` and `SHADOW_DATABASE_URL` values take
precedence. For another environment, obtain these values from its existing secret
configuration. Check the host and database shown by Prisma before proceeding.

The shadow URL must identify a separate disposable database. Prisma resets its
contents. Never point it at an application database or a database containing
backups. The shadow URL is optional for `migrate deploy` and `prisma generate`,
but required for the baseline comparison below if the database user cannot create
temporary databases automatically.

Using a MySQL-version-compatible dump client, back up the complete database and
export `_prisma_migrations` separately. Include triggers, routines, and events if
present. Use password prompts or existing secret configuration, not passwords in
command arguments. Store backups outside version control; `.tmp/` is ignored.

Restore the complete backup into a separate disposable database and verify its
schema, per-table row counts, and migration records against the source. Retain
backup checksums. Stop if restoration or verification fails.

The generated baseline does not represent triggers, routines, events, or views.
If another database has these objects or differs from the verified baseline,
stop and reconcile it before changing migration records.

### 2. Compare only the baseline against the target

The lesson-reference migration must not participate in this comparison because
the existing database does not have that column yet. Create a baseline-only
verification directory with PowerShell. Use a new directory, or first confirm
that it contains only `0_baseline` and `migration_lock.toml`:

```powershell
New-Item -ItemType Directory -Force .tmp/baseline-verification | Out-Null
Copy-Item -LiteralPath prisma/migrations/0_baseline -Destination .tmp/baseline-verification -Recurse -Force
Copy-Item -LiteralPath prisma/migrations/migration_lock.toml -Destination .tmp/baseline-verification -Force
npx prisma migrate diff --from-migrations .tmp/baseline-verification --to-config-datasource --exit-code
```

Continue only when Prisma reports `No difference detected` and returns exit code
0. Exit code 2 means the schema differs; any other nonzero exit code indicates a
failed check. This comparison recreates the baseline in the configured shadow
database without modifying application tables in the target database.

Inspect the target's migration records as well:

```sql
SELECT migration_name, checksum, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY started_at;
```

If `0_baseline` is already registered, skip the metadata cleanup and use
`prisma migrate status` to inspect that environment instead. Otherwise, confirm
that the verified metadata export contains all existing rows and that no
migration is running or failed before proceeding.

### 3. Replace only the obsolete migration records

With application writes and migration runners still paused, clear the obsolete
records from the target database. This SQL intentionally affects migration
metadata only; it must never be used without the verified backups and empty
schema comparison above.

```sql
START TRANSACTION;
SELECT id, migration_name FROM _prisma_migrations FOR UPDATE;
DELETE FROM _prisma_migrations;
COMMIT;
```

Immediately register the baseline without executing its table-creation SQL:

```bash
npx prisma migrate resolve --applied 0_baseline
```

If registration fails, stop before applying any migrations and restore only the
saved migration-metadata export. Do not restore application data unnecessarily or
try to recover by resetting the database.

### 4. Deploy and verify the lesson reference

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma --exit-code
```

Both migrations must be successfully registered, with no schema difference.
Verify all application-table row counts against the backup before resuming
writes. Existing assessments should have `afterLessonId = NULL`.

Assessments may share the same lesson reference. The foreign key clears that
reference when a lesson is hard-deleted; soft deletion still requires service
handling. This change does not add API inputs or permission checks for assigning
the reference.

## Local recovery evidence

Private backups and verification snapshots are retained in
`.tmp/migration-recovery-20261112/`. `elearning_db.before.sql` is the complete
pre-recovery backup, `before.json` contains original per-table counts and all old
migration records, and `backup-manifest.json` records the backup SHA-256 checksum.
These files may contain sensitive data and must not be committed.

Local verification passed for backup restoration, unchanged row counts across
all 24 application tables, both migrations deploying from empty, schema equality,
multiple assessments sharing a lesson, rejection of nonexistent lesson IDs, and
preserving assessments with null references after a lesson is hard-deleted.
Disposable fixture data was rolled back. `npm run build` also passed.

The full Jest run reported 23 passing suites and 5 failing suites (211 passing
tests and 16 failing tests). Running the original committed source and generated
client from `d9dc0c4` in an isolated directory reproduced those same totals and
failures. They concern existing reviewer-course, learning-course, and Prisma error
handling tests; no application services or test expectations were changed by this
recovery. Detailed original-source Jest output is retained with the private
verification evidence.

Reference: [Prisma baseline workflow](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining).
