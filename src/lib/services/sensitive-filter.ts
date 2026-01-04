/**
 * 敏感信息过滤服务
 * 用于检测和过滤医疗报告、AI对话等内容中的敏感个人信息
 */

export interface SensitiveInfoPattern {
  type:
    | "id_card"
    | "phone"
    | "email"
    | "address"
    | "bank_account"
    | "medical_record"
    | "name"
    | "age"
    | "custom";
  pattern: RegExp;
  replacement: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface FilterResult {
  originalText: string;
  filteredText: string;
  detectedItems: Array<{
    type: SensitiveInfoPattern["type"];
    matchedText: string;
    position: number;
    severity: SensitiveInfoPattern["severity"];
    replacement: string;
  }>;
  hasSensitiveInfo: boolean;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
}

export interface FilterOptions {
  preserveStructure?: boolean; // 是否保持原文结构（用于报告解析）
  maskMode?: "full" | "partial" | "redact"; // 掩码模式：完全替换/部分显示/完全删除
  customPatterns?: SensitiveInfoPattern[]; // 自定义过滤规则
  excludeTypes?: SensitiveInfoPattern["type"][]; // 排除的类型
  includeTypes?: SensitiveInfoPattern["type"][]; // 仅包含的类型
}

class SensitiveFilterService {
  private defaultPatterns: SensitiveInfoPattern[] = [
    // 身份证号 (18位或15位，优先匹配)
    {
      type: "id_card",
      pattern: /\b\d{15}(\d{3}[0-9xX])?\b|\b\d{17}[0-9xX]\b/g,
      replacement: "***身份证号已隐藏***",
      description: "身份证号码",
      severity: "critical",
    },
    // 银行卡号 (13-19位，排除身份证号)
    {
      type: "bank_account",
      pattern: /\b\d{13,19}\b/g,
      replacement: "***银行卡号已隐藏***",
      description: "银行卡号",
      severity: "critical",
    },
    // 中国手机号
    {
      type: "phone",
      pattern: /\b1[3-9]\d{9}\b/g,
      replacement: "***手机号已隐藏***",
      description: "手机号码",
      severity: "high",
    },
    // 固定电话
    {
      type: "phone",
      pattern: /\b(?:0\d{2,3}-)?[1-9]\d{6,8}(?:-\d{1,4})?\b/g,
      replacement: "***电话已隐藏***",
      description: "固定电话",
      severity: "high",
    },
    // 邮箱地址
    {
      type: "email",
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      replacement: "***邮箱已隐藏***",
      description: "邮箱地址",
      severity: "medium",
    },
    // 详细地址信息
    {
      type: "address",
      pattern: /(?:地址|住址|所在地)[\s:]*[^\n\r]{10,50}/g,
      replacement: "***地址信息已隐藏***",
      description: "地址信息",
      severity: "high",
    },
    // 医疗记录号
    {
      type: "medical_record",
      pattern: /(?:病历号|住院号|门诊号|诊疗号)[\s:]*[A-Za-z0-9-]{4,20}/g,
      replacement: "***病历号已隐藏***",
      description: "医疗记录号",
      severity: "high",
    },
    // 年龄信息 (防止间接识别)
    {
      type: "age",
      pattern: /(?:年龄|岁数|出生)[\s:]*\d{1,3}(?:\s*岁)?/g,
      replacement: "***年龄已隐藏***",
      description: "年龄信息",
      severity: "medium",
    },
    // 姓名 (中文姓名)
    {
      type: "name",
      pattern: /(?:患者|姓名|名字)[\s:]*[\u4e00-\u9fa5]{2,4}/g,
      replacement: "***姓名已隐藏***",
      description: "患者姓名",
      severity: "high",
    },
  ];

  /**
   * 过滤敏感信息
   */
  filter(text: string, options: FilterOptions = {}): FilterResult {
    if (!text || typeof text !== "string") {
      return {
        originalText: text,
        filteredText: text,
        detectedItems: [],
        hasSensitiveInfo: false,
        riskLevel: "none",
      };
    }

    const {
      preserveStructure = false,
      maskMode = "redact",
      customPatterns = [],
      excludeTypes = [],
      includeTypes,
    } = options;

    // 合并默认和自定义模式
    let patterns = [...this.defaultPatterns, ...customPatterns];

    // 过滤模式
    if (includeTypes && includeTypes.length > 0) {
      patterns = patterns.filter((p) => includeTypes.includes(p.type));
    } else if (excludeTypes.length > 0) {
      patterns = patterns.filter((p) => !excludeTypes.includes(p.type));
    }

    let filteredText = text;
    const detectedItems: FilterResult["detectedItems"] = [];

    // 按严重程度排序，先处理严重程度高的，但保留原始顺序进行替换
    const sortedPatterns = [...patterns].sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    // 先检测所有敏感信息
    const allMatches: Array<{
      pattern: SensitiveInfoPattern;
      match: RegExpExecArray;
      matchedText: string;
    }> = [];

    for (const pattern of sortedPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          pattern,
          match,
          matchedText: match[0],
        });
        if (!pattern.pattern.global) break;
      }
    }

    // 按位置排序，避免替换时的位置偏移问题
    allMatches.sort((a, b) => a.match.index - b.match.index);

    // 去重：移除重叠的匹配，优先保留更具体的匹配类型
    const filteredMatches: typeof allMatches = [];

    for (const match of allMatches) {
      let shouldInclude = true;

      for (const existing of filteredMatches) {
        const matchStart = match.match.index;
        const matchEnd = matchStart + match.matchedText.length;
        const existingStart = existing.match.index;
        const existingEnd = existingStart + existing.matchedText.length;

        // 检查是否有重叠
        if (matchStart < existingEnd && matchEnd > existingStart) {
          // 类型优先级：身份证号 > 银行卡号 > 其他
          const typePriority = {
            id_card: 3,
            bank_account: 2,
            phone: 1,
            email: 1,
            address: 1,
            medical_record: 1,
            name: 1,
            age: 1,
          };

          const matchPriority = typePriority[match.pattern.type] || 0;
          const existingPriority = typePriority[existing.pattern.type] || 0;

          if (matchPriority > existingPriority) {
            // 替换现有匹配
            const index = filteredMatches.indexOf(existing);
            filteredMatches[index] = match;
            shouldInclude = false;
            break;
          } else if (matchPriority === existingPriority) {
            // 相同优先级，保留较长的匹配
            if (match.matchedText.length > existing.matchedText.length) {
              const index = filteredMatches.indexOf(existing);
              filteredMatches[index] = match;
              shouldInclude = false;
              break;
            } else {
              shouldInclude = false;
              break;
            }
          } else {
            // 较低优先级，跳过
            shouldInclude = false;
            break;
          }
        }
      }

      if (shouldInclude) {
        filteredMatches.push(match);
      }
    }

    // 执行替换
    let offset = 0;
    for (const { pattern, match, matchedText } of filteredMatches) {
      const position = match.index;

      // 生成替换文本
      let replacement = pattern.replacement;
      if (maskMode === "partial") {
        replacement = this.generatePartialMask(matchedText, pattern.type);
      } else if (maskMode === "full") {
        replacement = "*".repeat(Math.min(matchedText.length, 20));
      }

      // 如果需要保持结构，使用更简洁的替换
      if (preserveStructure) {
        replacement = this.generateStructuredReplacement(
          matchedText,
          pattern.type,
        );
      }

      // 记录检测到的项目
      detectedItems.push({
        type: pattern.type,
        matchedText,
        position,
        severity: pattern.severity,
        replacement,
      });

      // 执行替换，考虑偏移
      const actualPosition = position + offset;
      filteredText =
        filteredText.slice(0, actualPosition) +
        replacement +
        filteredText.slice(actualPosition + matchedText.length);

      // 更新偏移
      offset += replacement.length - matchedText.length;
    }

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(detectedItems);

    return {
      originalText: text,
      filteredText,
      detectedItems,
      hasSensitiveInfo: detectedItems.length > 0,
      riskLevel,
    };
  }

  /**
   * 批量过滤多个文本
   */
  filterBatch(texts: string[], options: FilterOptions = {}): FilterResult[] {
    return texts.map((text) => this.filter(text, options));
  }

  /**
   * 检查文本是否包含敏感信息（不执行过滤）
   */
  detect(
    text: string,
    options: FilterOptions = {},
  ): Omit<FilterResult, "filteredText"> {
    const result = this.filter(text, { ...options, maskMode: "redact" });
    return {
      originalText: result.originalText,
      detectedItems: result.detectedItems,
      hasSensitiveInfo: result.hasSensitiveInfo,
      riskLevel: result.riskLevel,
    };
  }

  /**
   * 验证过滤结果
   */
  validateFilter(originalText: string, filteredText: string): boolean {
    // 检查过滤后的文本是否还包含敏感信息
    const detection = this.detect(filteredText);
    return !detection.hasSensitiveInfo;
  }

  /**
   * 添加自定义过滤规则
   */
  addPattern(pattern: SensitiveInfoPattern): void {
    this.defaultPatterns.push(pattern);
  }

  /**
   * 移除过滤规则
   */
  removePattern(type: SensitiveInfoPattern["type"]): void {
    this.defaultPatterns = this.defaultPatterns.filter((p) => p.type !== type);
  }

  /**
   * 获取所有可用模式
   */
  getPatterns(): SensitiveInfoPattern[] {
    return [...this.defaultPatterns];
  }

  /**
   * 生成部分掩码
   */
  private generatePartialMask(
    text: string,
    type: SensitiveInfoPattern["type"],
  ): string {
    switch (type) {
      case "id_card":
        // 身份证：显示前6位和后4位
        return text.length >= 10
          ? `${text.slice(0, 6)}****${text.slice(-4)}`
          : "***身份证***";
      case "phone":
        // 手机号：显示前3位和后4位
        return text.length >= 11
          ? `${text.slice(0, 3)}****${text.slice(-4)}`
          : "***电话***";
      case "email":
        // 邮箱：显示@前2个字符和域名
        const [local, domain] = text.split("@");
        return local && domain
          ? `${local.slice(0, 2)}***@${domain}`
          : "***邮箱***";
      case "bank_account":
        // 银行卡：显示前6位和后4位
        return text.length >= 10
          ? `${text.slice(0, 6)}****${text.slice(-4)}`
          : "***卡号***";
      default:
        return "***已隐藏***";
    }
  }

  /**
   * 生成结构化替换（保持文档格式）
   */
  private generateStructuredReplacement(
    text: string,
    type: SensitiveInfoPattern["type"],
  ): string {
    switch (type) {
      case "id_card":
        return "[身份证号]";
      case "phone":
        return "[联系电话]";
      case "email":
        return "[电子邮箱]";
      case "address":
        return "[地址信息]";
      case "medical_record":
        return "[病历编号]";
      case "name":
        return "[患者姓名]";
      case "age":
        return "[年龄]";
      case "bank_account":
        return "[银行卡号]";
      default:
        return "[敏感信息]";
    }
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(
    detectedItems: FilterResult["detectedItems"],
  ): FilterResult["riskLevel"] {
    if (detectedItems.length === 0) return "none";

    const severityCounts = detectedItems.reduce(
      (acc, item) => {
        acc[item.severity] = (acc[item.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    if (severityCounts.critical > 0) return "critical";
    if (severityCounts.high > 0) return "high";
    if (severityCounts.medium > 0) return "medium";
    return "low";
  }
}

// 导出单例实例
export const sensitiveFilter = new SensitiveFilterService();

// 导出工具函数
export function filterSensitiveInfo(
  text: string,
  options?: FilterOptions,
): string {
  return sensitiveFilter.filter(text, options).filteredText;
}

export function hasSensitiveInfo(
  text: string,
  options?: FilterOptions,
): boolean {
  return sensitiveFilter.detect(text, options).hasSensitiveInfo;
}

export function getSensitiveInfoRisk(
  text: string,
  options?: FilterOptions,
): FilterResult["riskLevel"] {
  return sensitiveFilter.detect(text, options).riskLevel;
}
