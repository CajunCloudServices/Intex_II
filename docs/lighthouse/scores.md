# Lighthouse Accessibility Scores

Minimum gate: **90** on every required page. HTML reports are CI artifacts — not committed to the repo.

| Page | Route | Last Score | Status | Date |
|------|-------|-----------|--------|------|
| Home | `/` | — | pending | — |
| Impact dashboard | `/impact` | — | pending | — |
| Donate | `/donate` | — | pending | — |
| Login | `/login` | — | pending | — |

Update this table after each audit pass. Run locally with:

```bash
cd frontend
npm run build
npx lhci autorun
```

Full HTML reports are saved to `docs/lighthouse/` (git-ignored) and uploaded as CI artifacts on each PR.
