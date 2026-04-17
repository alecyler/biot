# Biot.Game — quickest cheap test launch + ad setup

## Cheapest path to public testing
1. **Do not buy a domain yet.**
2. Put this project in a **GitHub repo**.
3. Create a **free Cloudflare account**.
4. In Cloudflare, go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
5. Connect GitHub and choose the repo.
6. For the build settings use:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
7. Click **Save and Deploy**.
8. Share the resulting `*.pages.dev` URL with testers.

That gives you a public test build with **no domain cost yet**.

## When to buy the domain
Buy `biot.game` **after** the test build works and you like the project name.

## If you want the custom domain later
1. Buy the domain from any registrar you like.
2. Add the domain to Cloudflare.
3. Switch the domain nameservers at the registrar to Cloudflare's nameservers.
4. In your Pages project, go to **Custom domains** and add `biot.game`.
5. Optionally add `www.biot.game` and redirect it.

## Bottom banner ad setup for web
This project now has a bottom-center AdSense banner slot that stays hidden until you add real IDs.

### What you need first
1. A live public site.
2. A Google AdSense account.
3. Site approval in AdSense.
4. A banner/display ad unit.

### What to edit after approval
Open `src/config/ads.ts` and set:
- `enabled: true`
- `client: "ca-pub-..."`
- `slot: "..."`

## Why I used AdSense for this pass
This build is a **website**, not a mobile-native app, so **AdSense** is the right Google product for the browser version. AdMob is for mobile apps.
