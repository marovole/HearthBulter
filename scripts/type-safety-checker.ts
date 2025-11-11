#!/usr/bin/env tsx
/**
 * 类型安全迁移检查工具
 * 验证 Prisma → Supabase 迁移的类型安全
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface CheckResult {
  passed: boolean;
  file: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

class TypeSafetyChecker {
  private results: CheckResult[] = [];

  async runAllChecks(): Promise<void> {
    console.log('🔍 开始类型安全检查...\n');

    // 1. 检查类型文件存在
    this.checkTypeFiles();

    // 2. 检查 Schema 文件
    this.checkSchemaFiles();

    // 3. 检查 Zod 验证
    this.checkZodValidation();

    // 4. 检查 RPC 函数类型
    this.checkRPCFunctionTypes();

    // 5. 运行 TypeScript 编译
    await this.runTypeScriptCheck();

    // 6. 检查迁移脚本
    this.checkMigrationScripts();

    // 输出结果
    this.printResults();
  }

  private checkTypeFiles(): void {
    console.log('📁 检查类型文件...');
    const typeFiles = [
      'src/types/supabase-generated.ts',
      'src/types/supabase-rpc.ts',
    ];

    typeFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);

      this.results.push({
        passed: exists,
        file,
        message: exists ? '类型文件存在' : '类型文件缺失',
        severity: exists ? 'info' : 'error',
      });
    });

    console.log('✅ 类型文件检查完成\n');
  }

  private checkSchemaFiles(): void {
    console.log('📝 检查 Schema 文件...');
    const schemaFiles = [
      'src/schemas/supabase-schemas.ts',
    ];

    schemaFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);

      this.results.push({
        passed: exists,
        file,
        message: exists ? 'Schema 文件存在' : 'Schema 文件缺失',
        severity: exists ? 'info' : 'error',
      });

      if (exists) {
        // 检查 Schema 文件内容
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasZodImports = content.includes("from 'zod'");
        const hasExports = content.includes('export const');

        this.results.push({
          passed: hasZodImports && hasExports,
          file,
          message: hasZodImports && hasExports ? 'Schema 格式正确' : 'Schema 格式不正确',
          severity: hasZodImports && hasExports ? 'info' : 'warning',
        });
      }
    });

    console.log('✅ Schema 文件检查完成\n');
  }

  private checkZodValidation(): void {
    console.log('🎯 检查 Zod 验证...');
    
    // 检查 API 路由是否使用 Zod 验证
    const apiRoutes = this.findFiles('src/app/api', 'route.ts');
    
    apiRoutes.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const hasZodValidation = content.includes('z.') || content.includes('schema');

      this.results.push({
        passed: hasZodValidation,
        file,
        message: hasZodValidation ? '使用 Zod 验证' : '未使用 Zod 验证',
        severity: hasZodValidation ? 'info' : 'warning',
      });
    });

    console.log('✅ Zod 验证检查完成\n');
  }

  private checkRPCFunctionTypes(): void {
    console.log('⚡ 检查 RPC 函数类型...');
    const rpcFiles = [
      'supabase/migrations/rpc-functions/001_accept_family_invite.sql',
      'supabase/migrations/rpc-functions/002_record_spending_tx.sql',
      'supabase/migrations/rpc-functions/003_create_inventory_notifications_batch.sql',
      'supabase/migrations/rpc-functions/004_update_shopping_list_item_atomic.sql',
    ];

    rpcFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);

      this.results.push({
        passed: exists,
        file,
        message: exists ? 'RPC 函数文件存在' : 'RPC 函数文件缺失',
        severity: exists ? 'info' : 'error',
      });

      if (exists) {
        // 检查 RPC 函数是否有类型定义
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasCreateFunction = content.includes('CREATE OR REPLACE FUNCTION');
        const hasReturnType = content.includes('RETURNS');

        this.results.push({
          passed: hasCreateFunction && hasReturnType,
          file,
          message: hasCreateFunction && hasReturnType ? 'RPC 函数格式正确' : 'RPC 函数格式不正确',
          severity: hasCreateFunction && hasReturnType ? 'info' : 'error',
        });
      }
    });

    console.log('✅ RPC 函数类型检查完成\n');
  }

  private async runTypeScriptCheck(): Promise<void> {
    console.log('🔍 运行 TypeScript 类型检查...');
    
    try {
      execSync('npx tsc --noEmit --skipLibCheck', {
        stdio: 'pipe',
        timeout: 60000,
      });

      this.results.push({
        passed: true,
        file: 'TypeScript',
        message: 'TypeScript 类型检查通过',
        severity: 'info',
      });
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);
      const lines = output.split('\n').slice(0, 20);

      this.results.push({
        passed: false,
        file: 'TypeScript',
        message: `TypeScript 类型检查失败:\n${lines.join('\n')}`,
        severity: 'error',
      });
    }

    console.log('✅ TypeScript 类型检查完成\n');
  }

  private checkMigrationScripts(): void {
    console.log('📦 检查迁移脚本...');
    const migrationFiles = this.findFiles('supabase/migrations', '*.sql');

    migrationFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const hasTransactions = content.includes('BEGIN') && content.includes('END');
      const hasErrorHandling = content.includes('EXCEPTION') || content.includes('WHEN OTHERS');

      this.results.push({
        passed: hasTransactions || hasErrorHandling,
        file,
        message: hasTransactions || hasErrorHandling 
          ? '迁移脚本包含错误处理' 
          : '迁移脚本缺少错误处理',
        severity: hasTransactions || hasErrorHandling ? 'info' : 'warning',
      });
    });

    console.log('✅ 迁移脚本检查完成\n');
  }

  private findFiles(dir: string, pattern: string): string[] {
    const files: string[] = [];
    const dirPath = path.join(process.cwd(), dir);

    if (!fs.existsSync(dirPath)) {
      return files;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findFiles(path.join(dir, item), pattern));
      } else if (item.match(pattern.replace('*', '.*'))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private printResults(): void {
    console.log('📊 类型安全检查结果\n');
    console.log('='.repeat(80));

    const errors = this.results.filter(r => r.severity === 'error');
    const warnings = this.results.filter(r => r.severity === 'warning');
    const infos = this.results.filter(r => r.severity === 'info');

    console.log(`\n❌ 错误: ${errors.length}`);
    errors.forEach(r => {
      console.log(`   ${r.file}: ${r.message}`);
    });

    console.log(`\n⚠️  警告: ${warnings.length}`);
    warnings.forEach(r => {
      console.log(`   ${r.file}: ${r.message}`);
    });

    console.log(`\n✅ 通过: ${infos.length}`);

    console.log('\n' + '='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ 类型安全检查失败，存在严重错误');
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('\n⚠️  类型安全检查通过，但有改进建议');
    } else {
      console.log('\n🎉 类型安全检查完全通过！');
    }
  }
}

// 运行检查
const checker = new TypeSafetyChecker();
checker.runAllChecks().catch(console.error);
