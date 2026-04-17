# Cloudflare Pages launch notes

This project is ready to deploy as a static Vite site.

## Recommended repo settings
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20`

## Option A — GitHub connected deploy
1. Push this project to GitHub.
2. In Cloudflare, go to **Workers & Pages**.
3. Create a new **Pages** application from your Git repository.
4. Choose this repo.
5. Use these build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave blank unless the repo contains multiple projects.
6. Deploy.

## Option B — Direct upload from local build
1. Run `npm install`
2. Run `npm run build`
3. Run `npx wrangler pages deploy dist`

## Custom domain
### If using `biot.game` as the apex domain
- Add the domain to the same Cloudflare account as the Pages project.
- Point the apex domain at the Pages project from the Pages **Custom domains** screen.
- Cloudflare will manage the certificate and DNS once the zone is onboarded.

### If using a subdomain instead
- You can point a CNAME like `play.yourdomain.com` at the Pages project.

## Suggested first production URL setup
- Production: `biot.game`
- Backup / share link: Cloudflare's default `*.pages.dev` URL
- Optional playtest subdomain later: `labs.biot.game`

## Quick prelaunch checklist
- [ ] `npm install`
- [ ] `npm run build`
- [ ] Verify the game loads from the built `dist`
- [ ] Deploy to Pages
- [ ] Attach `biot.game`
- [ ] Share the `pages.dev` URL for early feedback before the apex domain propagates
