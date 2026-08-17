# TaxReturn BD — GitHub + Supabase

This version is designed specifically for GitHub Pages. GitHub Pages serves static files and does not execute PHP, so this build uses a browser frontend with Supabase Auth + Postgres for the real backend.

## Setup

1. Create a Supabase project.
2. Open SQL Editor and run `sql/schema.sql`.
3. Copy the project URL and publishable/anon key.
4. Open `assets/app.js`.
5. Replace:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_PUBLISHABLE_KEY`
6. In Supabase Authentication settings, configure the site URL to your GitHub Pages URL.
7. Push the files to a GitHub repository.
8. Enable GitHub Pages from the repository's Settings → Pages.
9. Open the published site.

## What is real

- Supabase email/password authentication
- Real Postgres persistence
- Row Level Security so a user can only access their own returns
- Return creation and updates
- Draft/submitted status
- Income and financial fields
- Browser-side validation/calculation
- Responsive UI

## Important

The tax calculation included here is deliberately illustrative. It is not a statement of current Bangladesh tax law and must be replaced with verified, configurable rules before actual filing use.

This application is an independent platform and does not submit returns to NBR.

GitHub Pages cannot execute PHP; the previous PHP package therefore cannot be deployed as a GitHub Pages application. See GitHub documentation for this limitation.
