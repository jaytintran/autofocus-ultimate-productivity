# Switch from pnpm to npm ✅ (Deploy-ready for Vercel)

## Completed Steps:

- ✅ Deleted `pnpm-lock.yaml`.
- ✅ Deleted `node_modules/` and `.next/`.
- ✅ Ran `npm install` → Fresh `package-lock.json` generated and deps installed (npm now active).
- ✅ Verified: `npx next dev` launches dev server successfully.

## Vercel Deployment (Safe w/ npm):

1. **Push to GitHub** (if not already): `git add . && git commit -m "Switch to npm" && git push`.
2. **Connect Vercel**: Vercel dashboard → New Project → Import GitHub repo.
3. **Framework Preset**: Auto-detects Next.js.
4. **Root/Build Settings**: Defaults OK (`npm run build` uses package-lock.json).
5. **Environment Vars**: Add any from `.env.local` (Supabase keys etc.).
6. **Deploy**: Vercel uses `npm ci && npm run build && npm run start`.

**No issues expected** - Vercel supports npm natively. Ignore pnpm-lock.yaml in .gitignore.

CLI to test build locally: `npm run build`
