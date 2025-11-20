#!/usr/bin/env node

/**
 * P0验证脚本：检测假迁移问题
 *
 * 扫描所有标记为"已迁移"的端点，检测是否真正使用Supabase
 * CodeX反馈要求：24小时内必须完成
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// 颜色输出
const colors = {
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  green: (str: string) => `\x1b[32m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  blue: (str: string) => `\x1b[34m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
};

interface MigrationCommit {
  hash: string;
  message: string;
  date: string;
  batchNumber?: number;
  files: string[];
}

interface EndpointAnalysis {
  filePath: string;
  route: string;
  httpMethods: string[];
  batchNumber: number;
  commitHash: string;
  commitMessage: string;
  // 技术栈检测
  usesSupabase: boolean;
  usesPrismaDirectly: boolean; // 直接从@prisma/client导入
  usesPrismaFromAdapter: boolean; // 使用supabase-adapter中的prisma
  hasMigrationComment: boolean;
  // 详细分析
  imports: {
    supabase: boolean;
    prismaClient: boolean;
    prismaAdapter: boolean;
  };
  calls: {
    supabaseQueries: number; // supabase.from().select()
    prismaQueries: number; // prisma.model.findMany()
  };
  // 风险评估
  migrationStatus: "FULL" | "PARTIAL" | "NONE" | "FAKE";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  issues: string[];
  codeSamples: {
    supabase?: string;
    prisma?: string;
  };
}

interface AnalysisReport {
  generatedAt: string;
  totalCommits: number;
  totalEndpoints: number;
  migrationSummary: {
    full: number;
    partial: number;
    none: number;
    fake: number;
  };
  riskSummary: {
    high: number;
    medium: number;
    low: number;
  };
  endpoints: EndpointAnalysis[];
  recommendations: string[];
}

/**
 * 从Git历史提取迁移提交
 */
function getMigrationCommits(): MigrationCommit[] {
  try {
    // 获取包含 'batch', 'migration', 'migrate' 的提交（不区分大小写）
    const logOutput = execSync(
      'git log --grep="batch" --grep="migration" --grep="migrate" -i --oneline --name-only -20',
      { encoding: "utf-8" },
    ).trim();

    const commits: MigrationCommit[] = [];
    const lines = logOutput.split("\n");
    let currentCommit: Partial<MigrationCommit> | null = null;

    for (const line of lines) {
      if (!line.trim()) continue;

      // 匹配提交行格式: "abc123 消息"
      const commitMatch = line.match(/^([a-f0-9]{7,})\s+(.+)$/);
      if (commitMatch && commitMatch[1] && commitMatch[2]) {
        // 保存上一个提交
        if (currentCommit) {
          commits.push(currentCommit as MigrationCommit);
        }

        // 开始新提交
        const hash = commitMatch[1];
        const message = commitMatch[2];
        const batchMatch = message.match(/batch\s+(\d+)/i);

        currentCommit = {
          hash,
          message,
          date: "", // 将在后续获取
          batchNumber:
            batchMatch && batchMatch[1] ? parseInt(batchMatch[1]) : undefined,
          files: [],
        };

        continue;
      }

      // 文件路径行（以空格或特殊字符开头）
      const filePath = line.trim();
      if (
        currentCommit &&
        filePath.startsWith("src/app/api/") &&
        filePath.endsWith(".ts")
      ) {
        if (!currentCommit.files!.includes(filePath)) {
          currentCommit.files!.push(filePath);
        }
      }
    }

    // 保存最后一个提交
    if (currentCommit) {
      commits.push(currentCommit as MigrationCommit);
    }

    return commits;
  } catch (error) {
    console.error(colors.red("获取Git提交历史失败:"), error);
    return [];
  }
}

/**
 * 获取提交日期
 */
function getCommitDate(hash: string): string {
  try {
    const date = execSync(`git show -s --format=%ci ${hash}`, {
      encoding: "utf-8",
    }).trim();
    return date.split(" ")[0] || "unknown"; // 只返回日期部分
  } catch {
    return "unknown";
  }
}

/**
 * 从文件路径提取HTTP方法和路由
 * 例如: GET /api/recipes/favorites
 */
function extractRouteInfo(
  filePath: string,
  content: string,
): { methods: string[]; route: string } {
  const methods: string[] = [];

  // 检测导出函数
  if (
    content.includes("export async function GET") ||
    content.includes("export function GET")
  ) {
    methods.push("GET");
  }
  if (
    content.includes("export async function POST") ||
    content.includes("export function POST")
  ) {
    methods.push("POST");
  }
  if (
    content.includes("export async function PUT") ||
    content.includes("export function PUT")
  ) {
    methods.push("PUT");
  }
  if (
    content.includes("export async function DELETE") ||
    content.includes("export function DELETE")
  ) {
    methods.push("DELETE");
  }
  if (
    content.includes("export async function PATCH") ||
    content.includes("export function PATCH")
  ) {
    methods.push("PATCH");
  }

  // 从文件路径推导路由
  const route = `/${filePath.replace("src/app", "").replace("/route.ts", "")}`;

  return { methods, route };
}

/**
 * 检测文件中的技术栈使用
 */
function detectTechStack(
  filePath: string,
  content: string,
): {
  supabase: boolean;
  prismaClient: boolean;
  prismaAdapter: boolean;
  supabaseQueries: number;
  prismaQueries: number;
  hasMigrationComment: boolean;
} {
  const lines = content.split("\n");

  const detections = {
    supabase: false,
    prismaClient: false,
    prismaAdapter: false,
    supabaseQueries: 0,
    prismaQueries: 0,
    hasMigrationComment: false,
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测导入
    if (
      trimmed.includes("from '@prisma/client'") ||
      trimmed.includes('from "@prisma/client"')
    ) {
      detections.prismaClient = true;
    }
    if (trimmed.includes("supabase-adapter")) {
      detections.prismaAdapter = true;
    }
    if (
      trimmed.includes("/db/supabase-adapter") ||
      trimmed.includes("/db/supabase")
    ) {
      detections.supabase = true;
    }

    // 检测调用
    if (trimmed.includes("supabase.from(")) {
      detections.supabaseQueries++;
    }
    if (trimmed.match(/prisma\.[A-Z]/) && !trimmed.includes("//")) {
      detections.prismaQueries++;
    }

    // 检测迁移注释
    if (
      trimmed.toLowerCase().includes("migrated") ||
      trimmed.toLowerCase().includes("migration")
    ) {
      detections.hasMigrationComment = true;
    }
  }

  return detections;
}

/**
 * 从文件中提取代码样本
 */
function extractCodeSamples(content: string): {
  supabase?: string;
  prisma?: string;
} {
  const lines = content.split("\n");
  const samples: { supabase?: string; prisma?: string } = {};

  // 提取supabase查询样本
  const supabaseLineIndex = lines.findIndex((line) =>
    line.includes("supabase.from("),
  );
  if (supabaseLineIndex !== -1) {
    // 提取该查询的上下文（前后3行）
    const start = Math.max(0, supabaseLineIndex - 1);
    const end = Math.min(lines.length, supabaseLineIndex + 4);
    samples.supabase = lines.slice(start, end).join("\n");
  }

  // 提取prisma查询样本
  const prismaLineIndex = lines.findIndex((line, idx) => {
    if (line.includes("//")) return false;
    return line.includes("prisma.") && lines[idx + 1]?.includes("find");
  });
  if (prismaLineIndex !== -1) {
    const start = Math.max(0, prismaLineIndex - 1);
    const end = Math.min(lines.length, prismaLineIndex + 5);
    samples.prisma = lines.slice(start, end).join("\n");
  }

  return samples;
}

/**
 * 分析单个端点文件
 */
function analyzeEndpoint(
  filePath: string,
  commit: MigrationCommit,
): EndpointAnalysis | null {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const { methods, route } = extractRouteInfo(filePath, content);

  if (methods.length === 0) {
    return null; // 不是有效的API端点
  }

  const stack = detectTechStack(filePath, content);
  const samples = extractCodeSamples(content);

  // 判断迁移状态
  let migrationStatus: "FULL" | "PARTIAL" | "NONE" | "FAKE";
  let riskLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  const issues: string[] = [];

  // 使用supabase
  if (stack.supabaseQueries > 0) {
    // 但同时也使用prisma（直接导入）
    if (stack.prismaClient) {
      migrationStatus = "PARTIAL";
      riskLevel = "HIGH";
      issues.push("混合使用Supabase和Prisma（从@prisma/client直接导入）");
    }
    // 使用prismaAdapter中的prisma
    else if (stack.prismaQueries > 0 && stack.prismaAdapter) {
      // 这是可以接受的（通过adapter使用）
      migrationStatus = "FULL";
      riskLevel = "LOW";
    }
    // 纯supabase
    else {
      migrationStatus = "FULL";
      riskLevel = "LOW";
    }
  } else {
    // 没有supabase查询
    if (stack.prismaQueries > 0) {
      migrationStatus = "NONE";
      riskLevel = "MEDIUM";
      issues.push("未迁移到Supabase，仍在使用Prisma");
    } else {
      migrationStatus = "NONE";
      riskLevel = "LOW";
      issues.push("无数据库查询（可能是代理或转发端点）");
    }
  }

  // 特殊规则：如果标记为已迁移但实际没有，计为FAKE
  if (stack.hasMigrationComment && migrationStatus === "NONE") {
    migrationStatus = "FAKE";
    riskLevel = "HIGH";
    issues.unshift("[CRITICAL] 标记为已迁移但实际上未迁移（假迁移）");
  }

  return {
    filePath,
    route,
    httpMethods: methods,
    batchNumber: commit.batchNumber || 0,
    commitHash: commit.hash,
    commitMessage: commit.message,
    usesSupabase: stack.supabaseQueries > 0,
    usesPrismaDirectly: stack.prismaClient,
    usesPrismaFromAdapter: stack.prismaQueries > 0 && stack.prismaAdapter,
    hasMigrationComment: stack.hasMigrationComment,
    imports: {
      supabase: stack.supabase,
      prismaClient: stack.prismaClient,
      prismaAdapter: stack.prismaAdapter,
    },
    calls: {
      supabaseQueries: stack.supabaseQueries,
      prismaQueries: stack.prismaQueries,
    },
    migrationStatus,
    riskLevel,
    issues,
    codeSamples: samples,
  };
}

/**
 * 生成详细报告
 */
function generateReport(commits: MigrationCommit[]): AnalysisReport {
  console.log(colors.blue("正在分析迁移提交历史..."));

  const endpoints: EndpointAnalysis[] = [];

  for (const commit of commits) {
    commit.date = getCommitDate(commit.hash);

    for (const filePath of commit.files) {
      console.log(colors.gray(`  分析: ${filePath}`));
      const analysis = analyzeEndpoint(filePath, commit);
      if (analysis) {
        endpoints.push(analysis);
      }
    }
  }

  // 统计
  const report: AnalysisReport = {
    generatedAt: new Date().toISOString(),
    totalCommits: commits.length,
    totalEndpoints: endpoints.length,
    migrationSummary: {
      full: 0,
      partial: 0,
      none: 0,
      fake: 0,
    },
    riskSummary: {
      high: 0,
      medium: 0,
      low: 0,
    },
    endpoints,
    recommendations: [],
  };

  for (const ep of endpoints) {
    report.migrationSummary[
      ep.migrationStatus.toLowerCase() as keyof typeof report.migrationSummary
    ]++;
    report.riskSummary[
      ep.riskLevel.toLowerCase() as keyof typeof report.riskSummary
    ]++;
  }

  // 生成建议
  if (report.migrationSummary.fake > 0) {
    report.recommendations.push(
      `[URGENT] 发现 ${report.migrationSummary.fake} 个假迁移端点，需要立即重新迁移。`,
    );
  }

  if (report.migrationSummary.partial > 0) {
    report.recommendations.push(
      `[WARNING] 发现 ${report.migrationSummary.partial} 个部分迁移端点，混合使用Prisma是危险的。`,
    );
  }

  if (report.migrationSummary.none > 0) {
    report.recommendations.push(
      `[INFO] 有 ${report.migrationSummary.none} 个端点未迁移，符合预期（不在迁移计划中）。`,
    );
  }

  report.recommendations.push(
    "建议为所有HIGH风险端点实施双写策略，防止数据丢失。",
  );

  return report;
}

/**
 * 打印命令行报告
 */
function printReport(report: AnalysisReport): void {
  console.log("\n");
  console.log("=".repeat(80));
  console.log(colors.blue("P0 迁移验证报告"));
  console.log("=".repeat(80));
  console.log(`生成时间: ${new Date(report.generatedAt).toLocaleString()}`);
  console.log(`迁移提交数: ${report.totalCommits}`);
  console.log(`API端点数: ${report.totalEndpoints}`);
  console.log("=".repeat(80));

  // 迁移状态摘要
  console.log("\n📊 迁移状态分布:");
  console.log(
    `  ${colors.green("✓ FULL (完全迁移):")} ${report.migrationSummary.full}`,
  );
  console.log(
    `  ${colors.yellow("⚠ PARTIAL (部分迁移):")} ${report.migrationSummary.partial}`,
  );
  console.log(
    `  ${colors.red("✗ NONE (未迁移):")} ${report.migrationSummary.none}`,
  );
  console.log(
    `  ${colors.red("✗ FAKE (假迁移 ⭐ 严重):")} ${report.migrationSummary.fake}`,
  );

  // 风险等级摘要
  console.log("\n🚨 风险等级分布:");
  console.log(`  ${colors.red("🔴 HIGH:")} ${report.riskSummary.high}`);
  console.log(`  ${colors.yellow("🟡 MEDIUM:")} ${report.riskSummary.medium}`);
  console.log(`  ${colors.green("🟢 LOW:")} ${report.riskSummary.low}`);

  // 高风险端点详情
  const highRiskEndpoints = report.endpoints.filter(
    (ep) => ep.riskLevel === "HIGH",
  );
  if (highRiskEndpoints.length > 0) {
    console.log(`\n${colors.red("🔴 高风险端点 (需要立即处理):")}`);
    console.log("=".repeat(80));
    for (const ep of highRiskEndpoints) {
      console.log(`\n[${ep.migrationStatus}] ${ep.route}`);
      console.log(`  文件: ${ep.filePath}`);
      console.log(`  Batch: ${ep.batchNumber || "unknown"}`);
      console.log(`  提交: ${ep.commitHash} - ${ep.commitMessage}`);
      console.log(`  HTTP: ${ep.httpMethods.join(", ")}`);
      console.log(
        `  使用Supabase: ${ep.usesSupabase ? colors.green("是") : colors.red("否")}`,
      );
      console.log(
        `  使用Prisma: ${ep.usesPrismaDirectly ? colors.red("直接导入 ⭐ 严重") : ep.usesPrismaFromAdapter ? colors.yellow("通过Adapter") : colors.gray("否")}`,
      );

      if (ep.issues.length > 0) {
        console.log("  ⚠ 问题:");
        for (const issue of ep.issues) {
          console.log(`     - ${issue}`);
        }
      }

      if (ep.codeSamples.prisma) {
        console.log("  Prisma示例代码:");
        console.log(
          colors.gray(
            ep.codeSamples.prisma
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n"),
          ),
        );
      }
    }
  }

  // 所有端点列表
  console.log(`\n${colors.blue("📋 所有端点详细清单:")}`);
  console.log("=".repeat(80));
  for (const ep of report.endpoints) {
    const statusIcon =
      ep.migrationStatus === "FULL"
        ? "✓"
        : ep.migrationStatus === "FAKE"
          ? "✗"
          : "~";
    const statusColor =
      ep.migrationStatus === "FULL"
        ? colors.green
        : ep.migrationStatus === "FAKE"
          ? colors.red
          : colors.yellow;
    const riskColor =
      ep.riskLevel === "LOW"
        ? colors.green
        : ep.riskLevel === "MEDIUM"
          ? colors.yellow
          : colors.red;

    console.log(
      `${statusColor(`${statusIcon} [${ep.migrationStatus}]`)} ${ep.route} ${riskColor(`(${ep.riskLevel})`)}`,
    );
    console.log(colors.gray(`   └─ ${ep.filePath}`));
    console.log(
      colors.gray(
        `   └─ Supabase: ${ep.calls.supabaseQueries} 次, Prisma: ${ep.calls.prismaQueries} 次`,
      ),
    );

    if (ep.issues.length > 0) {
      console.log(colors.yellow(`   └─ ⚠ ${ep.issues.join(", ")}`));
    }
  }

  // 建议
  console.log(`\n${colors.blue("💡 建议:")}`);
  console.log("=".repeat(80));
  for (const rec of report.recommendations) {
    console.log(`  • ${rec}`);
  }

  console.log("\n");
  console.log("=".repeat(80));
  console.log(colors.green("报告生成完成！"));
  console.log("=".repeat(80));
}

/**
 * 主函数
 */
function main(): void {
  console.log(colors.blue("开始检测假迁移问题..."));
  console.log(colors.gray("此操作将分析Git提交历史和代码内容。\n"));

  const commits = getMigrationCommits();

  if (commits.length === 0) {
    console.log(colors.red("未找到迁移提交历史，请检查Git仓库状态。"));
    process.exit(1);
  }

  console.log(colors.green(`找到 ${commits.length} 个迁移提交`));
  for (const commit of commits) {
    if (commit.batchNumber) {
      console.log(
        colors.gray(
          `  └─ Batch ${commit.batchNumber}: ${commit.hash} - ${commit.message}`,
        ),
      );
    } else {
      console.log(colors.gray(`  └─ ${commit.hash}: ${commit.message}`));
    }
  }

  const report = generateReport(commits);

  // 保存JSON报告
  const reportPath = path.join(
    process.cwd(),
    "migration-validation-report.json",
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  // 打印命令行报告
  printReport(report);

  console.log(colors.gray(`\n详细JSON报告已保存到: ${reportPath}\n`));

  // 如果检测到严重问题，退出码为非0
  if (report.migrationSummary.fake > 0) {
    console.log(colors.red("⚠ 检测到假迁移问题！退出码为1。"));
    process.exit(1);
  }

  if (report.riskSummary.high > 0) {
    console.log(colors.yellow("⚠ 检测到高风险端点。"));
    process.exit(0); // 不是错误，但值得关注
  }

  console.log(colors.green("✓ 未检测到严重问题。"));
  process.exit(0);
}

// 运行主函数
main();
