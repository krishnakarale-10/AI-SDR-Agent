# 📂 `prisma/` - Database Blueprint

This directory is dedicated to PostgreSQL database models, relationships, and migration history.

## Expected Files:
* `schema.prisma`: Main Prisma schema file defining database models (`User`, `Campaign`, `Lead`, `Email`, `Reply`, etc.), enums, and indexes.
* `migrations/`: Auto-generated SQL migration history tracked by Prisma.

## Key Operations:
* `npx prisma migrate dev` - Run database migrations during development.
* `npx prisma generate` - Generate Prisma Client definitions.
* `npx prisma studio` - Open visual database editor.
