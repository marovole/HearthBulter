import {
  codeReviewService,
  CodeReviewInput,
  CodeReviewResult,
} from "@/lib/services/code-review-service";

describe("CodeReviewService", () => {
  describe("reviewCode", () => {
    it("should review TypeScript files correctly", async () => {
      const input: CodeReviewInput = {
        content: `
          interface User {
            id: number;
            name: string;
            email: string;
          }

          function createUser(data: any): User {
            return data;
          }

          console.log('User created');
        `,
        filePath: "src/user.ts",
        fileType: "typescript",
      };

      const result: CodeReviewResult =
        await codeReviewService.reviewCode(input);

      expect(result).toBeDefined();
      expect(result.approved).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(Array.isArray(result.issues)).toBeTruthy();
      expect(result.metrics).toBeDefined();
      expect(result.metadata.filePath).toBe(input.filePath);
    });

    it("should detect any type usage", async () => {
      const input: CodeReviewInput = {
        content: "const user: any = {};",
        filePath: "src/test.ts",
        fileType: "typescript",
      };

      const result = await codeReviewService.reviewCode(input);

      const anyTypeIssues = result.issues.filter(
        (issue) =>
          issue.type === "typescript" && issue.description.includes("any"),
      );

      expect(anyTypeIssues.length).toBeGreaterThan(0);
    });

    it("should detect console.log statements", async () => {
      const input: CodeReviewInput = {
        content: 'console.log("debug message");',
        filePath: "src/debug.ts",
        fileType: "typescript",
      };

      const result = await codeReviewService.reviewCode(input);

      const consoleIssues = result.issues.filter(
        (issue) =>
          issue.type === "style" && issue.description.includes("console.log"),
      );

      expect(consoleIssues.length).toBeGreaterThan(0);
    });

    it("should handle React component files", async () => {
      const input: CodeReviewInput = {
        content: `
          'use client';

          import React from 'react';

          interface Props {
            title: string;
          }

          export function MyComponent({ title }: Props) {
            return <div>{title}</div>;
          }
        `,
        filePath: "src/MyComponent.tsx",
        fileType: "react",
      };

      const result = await codeReviewService.reviewCode(input);

      expect(result).toBeDefined();
      expect(result.metadata.filePath).toBe(input.filePath);
    });

    it("should calculate metrics correctly", async () => {
      const input: CodeReviewInput = {
        content: "const a = 1;\nconst b = 2;\nconst c = 3;",
        filePath: "src/simple.ts",
        fileType: "typescript",
      };

      const result = await codeReviewService.reviewCode(input);

      expect(result.metrics.linesOfCode).toBeGreaterThan(0);
      expect(result.metrics.complexity).toBeGreaterThan(0);
      expect(result.metrics.securityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.securityScore).toBeLessThanOrEqual(100);
      expect(result.metrics.maintainabilityIndex).toBeGreaterThanOrEqual(0);
      expect(result.metrics.maintainabilityIndex).toBeLessThanOrEqual(100);
    });
  });

  describe("reviewBatch", () => {
    it("should review multiple files", async () => {
      const inputs: CodeReviewInput[] = [
        {
          content: 'const goodCode = "hello";',
          filePath: "src/good.ts",
          fileType: "typescript",
        },
        {
          content: 'const badCode: any = "world";',
          filePath: "src/bad.ts",
          fileType: "typescript",
        },
      ];

      const results = await codeReviewService.reviewBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });
  });

  describe("generateReport", () => {
    it("should generate summary report", async () => {
      const mockResults: CodeReviewResult[] = [
        {
          approved: true,
          riskLevel: "low",
          issues: [],
          warnings: [],
          suggestions: [],
          metrics: {
            complexity: 5,
            linesOfCode: 20,
            duplicateLines: 0,
            securityScore: 90,
            maintainabilityIndex: 80,
          },
          metadata: {
            reviewTimestamp: new Date(),
            processingTime: 100,
            reviewerVersion: "1.0.0",
            filePath: "src/good.ts",
          },
        },
        {
          approved: false,
          riskLevel: "high",
          issues: [
            {
              type: "typescript",
              severity: "high",
              description: "any type usage",
            },
            {
              type: "style",
              severity: "low",
              description: "console.log found",
            },
          ],
          warnings: ["TypeScript issues found"],
          suggestions: ["Use proper types"],
          metrics: {
            complexity: 15,
            linesOfCode: 50,
            duplicateLines: 2,
            securityScore: 60,
            maintainabilityIndex: 50,
          },
          metadata: {
            reviewTimestamp: new Date(),
            processingTime: 150,
            reviewerVersion: "1.0.0",
            filePath: "src/bad.ts",
          },
        },
      ];

      const report = codeReviewService.generateReport(mockResults);

      expect(report.summary.totalFiles).toBe(2);
      expect(report.summary.approvedFiles).toBe(1);
      expect(report.issues.total).toBe(2);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe("rule management", () => {
    it("should allow adding custom rules", () => {
      const customRule = {
        id: "custom-test-rule",
        name: "Custom Test Rule",
        description: "A test rule",
        condition: () => true,
        severity: "low" as const,
        type: "style" as const,
        recommendation: "Test recommendation",
        enabled: true,
      };

      const initialRuleCount = codeReviewService.getRules().length;

      codeReviewService.addRule(customRule);

      expect(codeReviewService.getRules()).toHaveLength(initialRuleCount + 1);
    });

    it("should allow removing rules", () => {
      const customRule = {
        id: "test-rule-to-remove",
        name: "Test Rule to Remove",
        description: "A test rule to remove",
        condition: () => false,
        severity: "low" as const,
        type: "style" as const,
        recommendation: "Test recommendation",
        enabled: true,
      };

      codeReviewService.addRule(customRule);
      const ruleCountAfterAdd = codeReviewService.getRules().length;

      codeReviewService.removeRule(customRule.id);

      expect(codeReviewService.getRules()).toHaveLength(ruleCountAfterAdd - 1);
    });

    it("should allow toggling rule enabled state", () => {
      const customRule = {
        id: "test-toggle-rule",
        name: "Test Toggle Rule",
        description: "A test rule for toggling",
        condition: () => false,
        severity: "low" as const,
        type: "style" as const,
        recommendation: "Test recommendation",
        enabled: true,
      };

      codeReviewService.addRule(customRule);

      // Initially enabled
      let rule = codeReviewService
        .getRules()
        .find((r) => r.id === customRule.id);
      expect(rule?.enabled).toBe(true);

      // Toggle to disabled
      codeReviewService.toggleRule(customRule.id, false);
      rule = codeReviewService.getRules().find((r) => r.id === customRule.id);
      expect(rule?.enabled).toBe(false);

      // Toggle back to enabled
      codeReviewService.toggleRule(customRule.id, true);
      rule = codeReviewService.getRules().find((r) => r.id === customRule.id);
      expect(rule?.enabled).toBe(true);
    });
  });
});
