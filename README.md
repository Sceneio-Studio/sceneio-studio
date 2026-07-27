# SCENEIO STUDIO static site

The site is a cinematic portfolio and publishing journal for SCENEIO STUDIO — digital marketing and branding. It deploys as a Cloudflare Pages site with Pages Functions for the secure publishing API.

## Publish a new project

Open `/dashboard`, sign in with a Supabase email/password account, and upload:

- Video file
- Title
- Caption
- Category: `Final Ad`, `BTS`, `Short Film`, or `Other`
- Optional cover-image URL

The browser sends the video directly to Mux. Cloudflare Pages Functions create the upload securely, save the project metadata in Supabase, wait for Mux playback processing, and publish the project when its playback ID is ready.

The old `api/` folder and `netlify/functions/` folder are kept for reference. The Cloudflare integration uses `functions/api/`.

## Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages and deploy the `main` branch with `.` as the build output directory. Use `node scripts/generate-config.js` as the build command. Pages Functions are discovered from `functions/`, and `_redirects` maps `/dashboard` to `dashboard.html`.

## One-time setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Enable Email provider authentication and create the studio user.
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the Cloudflare Pages production environment. Cloudflare generates the public `config.js` during each build.
4. Add `SUPABASE_SERVICE_ROLE_KEY`, `MUX_TOKEN_ID`, and `MUX_TOKEN_SECRET` as Cloudflare Pages secrets. Keep the service-role and Mux values server-only.
5. Give the Mux token permission to create direct uploads and read assets.

For local preview, put the same public Supabase values in `config.js`; never put the service-role or Mux values there.

## Editing default work

`content.js` holds the initial portfolio and journal entries used when Supabase is not configured. The public reel reads published projects from Supabase when configured.
