# 🔐 `src/modules/auth/` - Authentication Module

Handles user registration, authentication, token management, and account security.

## Expected Files:
* `auth.routes.js`: Express router for `/api/auth` endpoints (`/login`, `/signup`, `/reset-password`).
* `auth.controller.js`: Request/response handler for HTTP endpoints.
* `auth.service.js`: Core business logic including password hashing (bcrypt), JWT signing/verification, and Prisma user DB operations.
