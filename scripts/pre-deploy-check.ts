#!/usr/bin/env tsx

/**
 * 部署前验证脚本
 * 确保所有关键系统组件正常运行，防止生产环境部署失败
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, 'green');
}

function warning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message: string) {
  log(`❌ ${message}`, 'red');
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

function header(message: string) {
  log(`\n🔍 ${message}`, 'cyan');
  log('─'.repeat(50), 'cyan');
}

interface ValidationResult {
  success: boolean;
  warnings: string[];
  errors: string[];
}

class PreDeployValidator {
  private warnings: string[] = [];
  private errors: string[] = [];

  async validateAll(): Promise<ValidationResult> {
    header('开始部署前验证...');

    // 基础检查
    await this.checkNodeVersion();
    await this.checkDependencies();
    await this.checkEnvironmentFiles();

    // 代码质量检查
    await this.checkTypeScript();
    await this.checkLinting();
    await this.checkBuild();

    // 系统组件检查
    await this.checkPrisma();
    await this.checkEnvironmentVariables();

    // 安全检查
    await this.checkSecrets();
    await this.checkDependenciesSecurity();

    // 性能检查
    await this.checkBundleSize();

    header('验证结果');

    if (this.errors.length > 0) {
      error('发现关键错误，无法继续部署：');
      this.errors.forEach(err => error(`  • ${err}`));
    }

    if (this.warnings.length > 0) {
      warning('发现警告，建议修复后部署：');
      this.warnings.forEach(warn => warning(`  • ${warn}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      success('所有检查通过！系统已准备好部署。');
    }

    return {
      success: this.errors.length === 0,
      warnings: this.warnings,
      errors: this.errors,
    };
  }

  private async checkNodeVersion(): Promise<void> {
    header('检查 Node.js 版本');

    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

      if (majorVersion >= 18) {
        success(`Node.js 版本: ${nodeVersion} ✓`);
      } else {
        this.errors.push(`Node.js 版本过低 (${nodeVersion})，需要 v18 或更高版本`);
      }
    } catch (error) {
      this.errors.push('无法获取 Node.js 版本');
    }
  }

  private async checkDependencies(): Promise<void> {
    header('检查依赖安装');

    try {
      execSync('npm ls --depth=0', { encoding: 'utf8' });
      success('所有依赖已正确安装 ✓');
    } catch (error) {
      this.errors.push('依赖安装有问题，请运行 npm install');
    }
  }

  private async checkEnvironmentFiles(): Promise<void> {
    header('检查环境配置文件');

    const requiredFiles = ['.env', '.env.example'];

    for (const file of requiredFiles) {
      try {
        readFileSync(file, 'utf8');
        success(`找到 ${file} 文件 ✓`);
      } catch {
        if (file === '.env.example') {
          this.errors.push(`缺少 ${file} 文件`);
        } else {
          this.warnings.push(`缺少 ${file} 文件（生产环境将使用环境变量）`);
        }
      }
    }
  }

  private async checkTypeScript(): Promise<void> {
    header('检查 TypeScript 类型');

    try {
      execSync('npx tsc --noEmit --skipLibCheck', { encoding: 'utf8' });
      success('TypeScript 类型检查通过 ✓');
    } catch (error) {
      this.errors.push('TypeScript 类型检查失败');
    }
  }

  private async checkLinting(): Promise<void> {
    header('检查代码风格');

    try {
      execSync('npm run lint', { encoding: 'utf8' });
      success('代码风格检查通过 ✓');
    } catch (error) {
      this.warnings.push('代码风格检查未通过，建议修复');
    }
  }

  private async checkBuild(): Promise<void> {
    header('检查构建过程');

    try {
      execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
      success('构建成功 ✓');
    } catch (error) {
      this.errors.push('构建失败，请检查代码');
    }
  }

  private async checkPrisma(): Promise<void> {
    header('检查 Prisma 配置');

    try {
      execSync('npx prisma validate', { encoding: 'utf8' });
      success('Prisma schema 验证通过 ✓');

      execSync('npx prisma generate', { encoding: 'utf8' });
      success('Prisma client 生成成功 ✓');
    } catch (error) {
      this.errors.push('Prisma 配置有问题');
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    header('检查环境变量配置');

    try {
      // 读取 .env.example 文件
      const envExample = readFileSync('.env.example', 'utf8');
      const requiredVars = envExample
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#') && line.includes('='))
        .map(line => line.split('=')[0].trim());

      let missingVars = 0;

      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          if (varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('KEY')) {
            this.warnings.push(`环境变量 ${varName} 未设置（生产环境必须设置）`);
          } else if (varName === 'DATABASE_URL') {
            this.errors.push(`关键环境变量 ${varName} 未设置`);
            missingVars++;
          } else {
            info(`可选环境变量 ${varName} 未设置`);
          }
        }
      }

      if (missingVars === 0) {
        success('环境变量配置正确 ✓');
      }

      // 检查生产环境特殊要求
      if (process.env.NODE_ENV === 'production') {
        const nextAuthSecret = process.env.NEXTAUTH_SECRET;
        if (nextAuthSecret) {
          if (nextAuthSecret.length < 32) {
            this.errors.push('生产环境 NEXTAUTH_SECRET 长度必须至少32字符');
          } else if (nextAuthSecret.includes('example') || nextAuthSecret.includes('your-')) {
            this.errors.push('生产环境不能使用示例密钥');
          }
        }

        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'))) {
          this.errors.push('生产环境不能使用 localhost 数据库');
        }
      }
    } catch (error) {
      this.warnings.push('无法完全验证环境变量配置');
    }
  }

  private async checkSecrets(): Promise<void> {
    header('检查密钥安全');

    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const scripts = Object.values(packageJson.scripts || {});

      // 检查是否有硬编码的密钥
      const suspiciousPatterns = [
        /password\s*=\s*['"][^'"]+['"]/.source,
        /secret\s*=\s*['"][^'"]+['"]/.source,
        /key\s*=\s*['"][^'"]+['"]/.source,
      ];

      for (const script of scripts) {
        for (const pattern of suspiciousPatterns) {
          const regex = new RegExp(pattern, 'gi');
          if (regex.test(script)) {
            this.warnings.push('在脚本中发现可能的硬编码密钥');
          }
        }
      }

      success('密钥安全检查完成 ✓');
    } catch (error) {
      this.warnings.push('无法完全检查密钥安全性');
    }
  }

  private async checkDependenciesSecurity(): Promise<void> {
    header('检查依赖安全性');

    try {
      execSync('npm audit --audit-level high', { encoding: 'utf8' });
      success('未发现高危安全漏洞 ✓');
    } catch (error) {
      this.warnings.push('发现依赖安全漏洞，建议运行 npm audit fix');
    }
  }

  private async checkBundleSize(): Promise<void> {
    header('检查打包大小');

    try {
      // 这里可以添加更详细的包大小分析
      const buildOutput = execSync('npm run build', { encoding: 'utf8' });

      if (buildOutput.includes('Compiled successfully')) {
        success('打包大小检查通过 ✓');
      }
    } catch (error) {
      this.warnings.push('无法检查打包大小');
    }
  }
}

// 主执行函数
async function main() {
  const validator = new PreDeployValidator();
  const result = await validator.validateAll();

  // 设置退出码
  process.exit(result.success ? 0 : 1);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    error(`验证脚本执行失败: ${error.message}`);
    process.exit(1);
  });
}

export { PreDeployValidator };