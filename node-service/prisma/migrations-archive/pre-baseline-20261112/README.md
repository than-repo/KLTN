# Archived migration history

These six migration SQL files are preserved unchanged for audit and recovery.
They depended on the lost `20260604015206_elearning` migration and cannot rebuild
the database from empty.

They are not active Prisma migrations. Do not copy them back into `prisma/migrations`
or execute them after the replacement baseline; their resulting schema is already
represented by `0_baseline`.

See `prisma/MIGRATION_RECOVERY.md` for the coordinated recovery procedure for
existing databases. Fresh databases use the active migration history directly.
