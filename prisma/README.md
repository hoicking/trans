# Database Notes

This project is designed for Postgres. Create a database, copy `.env.example` to
`.env`, fill `DATABASE_URL`, then run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Better Auth uses the `User`, `Session`, `Account`, and `Verification` models in
this schema. The translation domain models are project-scoped and store the
latest translated/reviewed state timestamps and actors.
