## Why
代码审查发现多个影响代码质量和项目健康度的问题，包括 TypeScript 配置过于保守、存在大量 any 类型使用、缺失关键配置文件等，需要系统性地修复这些问题以提升代码质量和开发体验。

## What Changes
- 更新 TypeScript 配置以使用现代 ES 特性
- 修复代码中的 any 类型使用，添加明确的类型定义
- 添加缺失的 next.config.js 和 .eslintrc.json 配置文件
- 更新依赖版本以解决潜在的安全问题
- 添加更严格的 ESLint 规则配置

## Impact
- Affected Specs: code-quality
- Affected Code: tsconfig.json, package.json, src/**/*.{ts,tsx}, 配置文件
- Breaking Changes: 无
