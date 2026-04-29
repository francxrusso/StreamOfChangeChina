# Webapp

This folder contains the Next.js webapp for the public website, admin interface, and API/backend code.

The structure is:

```text
webapp/
  src/app/
    page.tsx
    serie/
    frasi/
    danmu/
    admin/
  src/lib/
  src/components/
  public/
```

The public side should read only public views from the database.
The admin side can write to the real tables after login.

## Local development

Create `webapp/.env.local` with the Supabase values described in `../docs/supabase-setup.md`, then install dependencies and run:

```sh
npm install
npm run dev
```
