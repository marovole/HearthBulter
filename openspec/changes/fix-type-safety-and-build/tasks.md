## 1. Dependency Hygiene
- [ ] 1.1 Remove `package-lock.json` and `yarn.lock` (if present).
- [ ] 1.2 Verify `pnpm-lock.yaml` integrity with `pnpm install`.
- [ ] 1.3 Add `engines` field to `package.json` to enforce Node.js and pnpm versions.

## 2. Type Safety Restoration
- [ ] 2.1 Update `tsconfig.json` to ensure `strict: true` (or incremental strictness).
- [ ] 2.2 Run `tsc --noEmit` to capture the baseline of errors.
- [ ] 2.3 Systematically fix critical errors (e.g., incorrect imports, missing props).
- [ ] 2.4 Suppress non-critical legacy errors with `@ts-expect-error` or `TODO` types to unblock the build, creating follow-up tickets.
- [ ] 2.5 Update `next.config.js` to set `typescript.ignoreBuildErrors: false`.
- [ ] 2.6 Update `package.json` build scripts to include type checking.

## 3. Linting & CI
- [ ] 3.1 Fix ESLint configuration issues.
- [ ] 3.2 Update `next.config.js` to set `eslint.ignoreDuringBuilds: false`.
- [ ] 3.3 Verify `build:cloudflare` passes with checks enabled.
