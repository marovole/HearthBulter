## Why
The project currently has disabled type checking (`ignoreBuildErrors: true`) and linting during builds, masking over 1375 type errors. This creates a high risk of runtime failures and technical debt accumulation. Additionally, the presence of conflicting lockfiles (`package-lock.json` vs `pnpm-lock.yaml`) causes dependency instability.

## What Changes
- Remove `package-lock.json` to enforce `pnpm` usage.
- Enable `typescript.ignoreBuildErrors: false` and `eslint.ignoreDuringBuilds: false` in `next.config.js`.
- Fix or suppress existing type errors systematically to achieve a clean build.
- Enforce strict type checking in CI pipelines.
- Update documentation to reflect strict mode requirements.

## Impact
- **Specs**: `code-quality`
- **Code**: `package.json`, `next.config.js`, `tsconfig.json`, and widespread type fixes across `src/`.
