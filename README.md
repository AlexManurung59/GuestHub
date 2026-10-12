This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Login and Role-Based Redirects: What I Learned

The login API successfully authenticated a user and created an `auth_token`, but the browser was not staying logged in. The API attached the cookie to one response object, then returned a newly created response instead. Since cookies are sent to the browser in the response's `Set-Cookie` header, the browser never received the cookie from the response that was actually returned.

The fix was to return the same response object that had the cookie attached. Then the login page could use the user's role to send an admin to `/admin` and a regular user to `/user`. The protected-route proxy can verify the cookie on the next request.

### What to learn from this

- **A response is more than its JSON body.** Headers and cookies belong to a specific response. If you create or modify a response, make sure that exact response is returned.
- **Trace the whole request flow.** Login involves the API response, browser cookie storage, role-based navigation, the request to the destination, and the protected-route check. A failure at any handoff can look like a redirect problem.
- **Check the role value and its format.** Exact string comparisons are case-sensitive and whitespace-sensitive. Normalize values before comparing when the input may vary.
- **Use the browser Network panel to inspect the flow.** Check the login response for `Set-Cookie`, confirm the cookie is stored, and check whether the destination request sends it. Do not log passwords or authentication tokens.
- **Validate both successful paths.** Test admin login to `/admin` and user login to `/user`, and also confirm that each role is blocked from the other role's protected page.

## Alarm API and Missing Database Table: What I Learned

The admin page reported that it could not load the TV alarm state. The API logs showed Prisma error `P2021`: the `alarm_control` table did not exist in the configured MySQL database. The `AlarmControl` model was already present in `prisma/schema.prisma`, and the route compiled, but defining a Prisma model does not by itself create its table in the database. The API's `findUnique()` call therefore failed when it tried to query a table that had not been synchronized yet.

For local development in this project, the schema was applied to the database configured by `DATABASE_URL` with:

```bash
npx prisma db push
```

After the command reported that the database was in sync, `GET /api/alarm` returned HTTP 200 with the initial state. The response now includes the visitor linked to a manual alarm: `{"active":false,"revision":0,"visitorId":null}`.

### What to learn from this

- **Schema and database are separate states.** Adding or changing a model in `schema.prisma` is not the same as applying that change to MySQL. Keep the schema and target database synchronized.
- **Check the exact error and target database.** Prisma `P2021` means a queried table is missing. Check `DATABASE_URL` and ensure the command is being run against the same database the app uses before changing data.
- **Choose the right workflow for the environment.** `prisma db push` is useful for local development/prototyping. For a production database or a project using migrations, create and apply a reviewed migration (for example, `npx prisma migrate dev --name add_alarm_control` in development and the project's deployment migration command in production) rather than casually pushing schema changes.
- **Verify the fix through the same path that failed.** After synchronizing the schema, request `GET /api/alarm` and confirm it returns the expected state. A successful TypeScript build alone cannot prove that a required database table exists.
- **Keep generated Prisma Client current after schema changes.** Run `npx prisma generate` if the generated client does not reflect the updated schema. For example, adding `visitorId` to `AlarmControl` requires updating both the generated client and the database table before the API can read/write that field.
- **Keep separate behaviors separate.** TV waiting-time reminders are calculated from visitor status and check-in time. Admin-triggered alarms are stored separately with a visitor ID, so stopping a manual alarm does not disable the automatic reminder.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
