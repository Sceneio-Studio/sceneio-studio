# SCENEIO STUDIO static site

The site is a cinematic static portfolio and publishing journal for SCENEIO STUDIO — digital marketing and branding. It is ready to deploy to Netlify as a plain static site.

## Publish a new project

Open `/dashboard`, sign in with a Supabase email/password account, and upload:

- Video file
- Title
- Caption
- Category: `Final Ad`, `BTS`, `Short Film`, or `Other`
- Optional cover-image URL

The browser sends the video directly to Mux. Netlify Functions create the upload securely, save the project metadata in Supabase, wait for Mux playback processing, and publish the project when its playback ID is ready.

The old `api/` folder is kept inactive for reference. The live integration uses `netlify/functions/`.

## Netlify

`netlify.toml` sets the project root as the publish directory, routes `/dashboard`, and enables the Mux functions. Connect the GitHub repository to Netlify and enable automatic deploys from the main branch.

## One-time setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Enable Email provider authentication and create the studio user.
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the Netlify environment. Netlify generates the public `config.js` during each build.
4. Add `SUPABASE_SERVICE_ROLE_KEY`, `MUX_TOKEN_ID`, and `MUX_TOKEN_SECRET` to Netlify. Keep the service-role and Mux values server-only.
5. Give the Mux token permission to create direct uploads and read assets.

For local preview, put the same public Supabase values in `config.js`; never put the service-role or Mux values there.

## Editing default work

`content.js` holds the initial portfolio and journal entries used when Supabase is not configured. The public reel reads published projects from Supabase when configured.
