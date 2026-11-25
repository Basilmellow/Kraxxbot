# KRAXXBot Free hosting release

Generated from source commit 1410fd8e3da4b2471049812abbb1816e39afe3d7. Contains compiled JavaScript, no credentials.

Set startup to:

```sh
npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm run db:generate && exec node --max-old-space-size=128 dist/index.js
```

Do not run TypeScript compilation on the hosting container. Keep existing environment variables. Database migrations are a separate administrative operation, never automatic at boot.
