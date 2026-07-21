# SCENEIO STUDIO static site

The site is a cinematic static portfolio and publishing journal for SCENEIO STUDIO — digital marketing and branding. It is ready to deploy to Netlify as a plain static site.

## Publish a new project

Open the website and choose **Publish update**. Enter:

- Project title
- YouTube video link
- Caption
- Project type
- Optional custom cover-image link

Press **Publish to website**. The project is added to the work reel, and its YouTube video plays inside its project page.

The `api/` folder contains inactive future publishing endpoints. Nothing in the static front end calls them yet, so Netlify will serve the site without CMS or serverless integration.

## Netlify

`netlify.toml` sets the project root as the publish directory. Connect the GitHub repository to Netlify and enable automatic deploys from the main branch.

## Editing default work

`content.js` holds the initial portfolio and journal entries. Supported filters are `film`, `commercial`, and `brand`.
