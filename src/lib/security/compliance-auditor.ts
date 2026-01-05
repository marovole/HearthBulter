import { securityAudit } from "./security-audit";
import { logger } from "@/lib/logging/structured-logger";

// 合规标准
export enum ComplianceStandard {
  GDPR = "GDPR", // 欧盟通用数据保护条例
  CCPA = "CCPA", // 加州消费者隐私法案
  ISO27001 = "ISO27001", // 信息安全管理体系
  SOC2 = "SOC2", // 服务组织控制
  HIPAA = "HIPAA", // 健康保险便携性和责任法案
  PCI_DSS = "PCI_DSS", // 支付卡行业数据安全标准
}

// 合规要求
interface ComplianceRequirement {
  id: string;
  standard: ComplianceStandard;
  title: string;
  description: string;
  category:
    | "data_protection"
    | "access_control"
    | "audit_logging"
    | "encryption"
    | "risk_management";
  mandatory: boolean;
  controls: ComplianceControl[];
}

// 合规控制
interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  implementation: string;
  status: "implemented" | "partial" | "not_implemented" | "not_applicable";
  evidence?: string[];
  lastReviewed: Date;
  nextReview: Date;
}

// 合规报告
interface ComplianceReport {
  id: string;
  standard: ComplianceStandard;
  generatedAt: Date;
  overallScore: number; // 0-100
  status: "compliant" | "non_compliant" | "partially_compliant";
  requirements: ComplianceRequirement[];
  summary: {
    totalRequirements: number;
    implementedControls: number;
    mandatoryImplemented: number;
    highRiskItems: number;
    recommendations: string[];
  };
  evidence: {
    [requirementId: string]: string[];
  };
}

// 风险评估
interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  category: "security" | "privacy" | "operational" | "legal";
  likelihood: "low" | "medium" | "high" | "critical";
  impact: "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100
  mitigation: string;
  status: "open" | "mitigated" | "accepted";
  lastAssessed: Date;
}

/**
 * 安全合规审计器
 */
export class ComplianceAuditor {
  private static instance: ComplianceAuditor;
  private requirements: Map<ComplianceStandard, ComplianceRequirement[]> =
    new Map();
  private assessments: RiskAssessment[] = [];
  private lastAuditDate: Date | null = null;

  private constructor() {
    this.loadComplianceRequirements();
    this.performInitialAssessment();
  }

  static getInstance(): ComplianceAuditor {
    if (!ComplianceAuditor.instance) {
      ComplianceAuditor.instance = new ComplianceAuditor();
    }
    return ComplianceAuditor.instance;
  }

  /**
   * 加载合规要求
   */
  private loadComplianceRequirements(): void {
    // GDPR要求
    const gdprRequirements: ComplianceRequirement[] = [
      {
        id: "GDPR_ART_32",
        standard: ComplianceStandard.GDPR,
        title: "安全技术与组织措施",
        description: "实施适当的技术和组织措施来确保数据安全",
        category: "data_protection",
        mandatory: true,
        controls: [
          {
            id: "ENCRYPTION_AT_REST",
            title: "静态数据加密",
            description: "对存储的敏感数据进行加密",
            implementation: "使用AES-256加密算法加密数据库中的敏感字段",
            status: "implemented",
            evidence: ["数据库加密配置", "密钥管理策略"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
          {
            id: "ENCRYPTION_IN_TRANSIT",
            title: "传输数据加密",
            description: "对网络传输的数据进行加密",
            implementation: "使用TLS 1.3协议加密所有HTTP通信",
            status: "implemented",
            evidence: ["HTTPS配置", "SSL证书"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
          {
            id: "ACCESS_CONTROL",
            title: "访问控制",
            description: "基于角色的访问控制机制",
            implementation: "实现基于角色的权限管理系统",
            status: "implemented",
            evidence: ["权限管理配置", "角色定义文档"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      {
        id: "GDPR_ART_33",
        standard: ComplianceStandard.GDPR,
        title: "数据泄露通知",
        description: "在发现数据泄露后72小时内通知监管机构",
        category: "audit_logging",
        mandatory: true,
        controls: [
          {
            id: "BREACH_DETECTION",
            title: "泄露检测机制",
            description: "自动检测和报告数据泄露事件",
            implementation: "实施安全监控和异常检测系统",
            status: "partial",
            evidence: ["安全监控系统配置"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            id: "INCIDENT_RESPONSE",
            title: "事件响应计划",
            description: "定义数据泄露事件响应流程",
            implementation: "制定了详细的事件响应计划",
            status: "implemented",
            evidence: ["事件响应计划文档", "应急演练记录"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    ];

    // HIPAA要求
    const hipaaRequirements: ComplianceRequirement[] = [
      {
        id: "HIPAA_164_312_a",
        standard: ComplianceStandard.HIPAA,
        title: "访问管理",
        description: "实施技术政策和程序来限制对电子保护健康信息的访问",
        category: "access_control",
        mandatory: true,
        controls: [
          {
            id: "USER_AUTHENTICATION",
            title: "用户身份验证",
            description: "验证寻求访问电子健康信息的个人和实体",
            implementation: "多因素身份验证系统",
            status: "implemented",
            evidence: ["认证系统配置", "MFA设置文档"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
          {
            id: "ACCESS_LOGGING",
            title: "访问日志记录",
            description: "记录对电子健康信息的所有访问",
            implementation: "全面的审计日志系统",
            status: "implemented",
            evidence: ["日志系统配置", "访问日志样本"],
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    ];

    this.requirements.set(ComplianceStandard.GDPR, gdprRequirements);
    this.requirements.set(ComplianceStandard.HIPAA, hipaaRequirements);
  }

  /**
   * 执行初始评估
   */
  private performInitialAssessment(): void {
    this.lastAuditDate = new Date();

    // 创建初始风险评估
    const initialRisks: RiskAssessment[] = [
      {
        id: "RISK_001",
        title: "数据泄露风险",
        description: "未经授权访问敏感用户数据的风险",
        category: "security",
        likelihood: "medium",
        impact: "high",
        riskScore: 75,
        mitigation: "实施强访问控制、加密和监控措施",
        status: "mitigated",
        lastAssessed: new Date(),
      },
      {
        id: "RISK_002",
        title: "合规违规风险",
        description: "未能满足GDPR/HIPAA等法规要求的风险",
        category: "legal",
        likelihood: "low",
        impact: "critical",
        riskScore: 80,
        mitigation: "定期进行合规审计和更新安全措施",
        status: "open",
        lastAssessed: new Date(),
      },
      {
        id: "RISK_003",
        title: "服务可用性风险",
        description: "系统服务中断影响用户访问的风险",
        category: "operational",
        likelihood: "medium",
        impact: "medium",
        riskScore: 50,
        mitigation: "实施高可用架构和灾难恢复计划",
        status: "mitigated",
        lastAssessed: new Date(),
      },
    ];

    this.assessments = initialRisks;

    logger.info("合规审计器初始化完成", {
      type: "compliance",
      standardsLoaded: Array.from(this.requirements.keys()),
      risksIdentified: this.assessments.length,
    });
  }

  /**
   * 生成合规报告
   */
  async generateComplianceReport(
    standard: ComplianceStandard,
  ): Promise<ComplianceReport> {
    const requirements = this.requirements.get(standard) || [];
    const generatedAt = new Date();

    // 计算合规分数
    let totalControls = 0;
    let implementedControls = 0;
    let mandatoryImplemented = 0;
    let highRiskItems = 0;
    const recommendations: string[] = [];

    const assessedRequirements = requirements.map((req) => {
      const assessedControls = req.controls.map((control) => {
        totalControls++;

        if (control.status === "implemented") {
          implementedControls++;
          if (req.mandatory) {
            mandatoryImplemented++;
          }
        } else if (
          control.status === "partial" ||
          control.status === "not_implemented"
        ) {
          recommendations.push(
            `实施控制: ${control.title} - ${control.description}`,
          );
          if (req.mandatory) {
            highRiskItems++;
          }
        }

        // 检查是否需要更新审查
        const now = new Date();
        if (now > control.nextReview) {
          recommendations.push(`需要重新审查控制: ${control.title}`);
        }

        return control;
      });

      return {
        ...req,
        controls: assessedControls,
      };
    });

    const overallScore =
      totalControls > 0
        ? Math.round((implementedControls / totalControls) * 100)
        : 0;
    const status =
      overallScore >= 95
        ? "compliant"
        : overallScore >= 80
          ? "partially_compliant"
          : "non_compliant";

    const report: ComplianceReport = {
      id: `report_${standard}_${Date.now()}`,
      standard,
      generatedAt,
      overallScore,
      status,
      requirements: assessedRequirements,
      summary: {
        totalRequirements: requirements.length,
        implementedControls,
        mandatoryImplemented,
        highRiskItems,
        recommendations,
      },
      evidence: this.collectEvidence(assessedRequirements),
    };

    // 记录报告生成
    logger.info("合规报告已生成", {
      type: "compliance",
      standard,
      overallScore,
      status,
      recommendationsCount: recommendations.length,
    });

    securityAudit.logEvent({
      type: "configuration_change" as any,
      severity: overallScore >= 80 ? ("low" as any) : ("medium" as any),
      title: `${standard}合规审计报告`,
      description: `生成了${standard}合规审计报告，合规分数: ${overallScore}%`,
      outcome: "success",
      metadata: {
        standard,
        overallScore,
        status,
        recommendationsCount: recommendations.length,
      },
    });

    return report;
  }

  /**
   * 收集证据
   */
  private collectEvidence(requirements: ComplianceRequirement[]): {
    [requirementId: string]: string[];
  } {
    const evidence: { [requirementId: string]: string[] } = {};

    requirements.forEach((req) => {
      evidence[req.id] = [];
      req.controls.forEach((control) => {
        if (control.evidence) {
          evidence[req.id].push(...control.evidence);
        }
      });
    });

    return evidence;
  }

  /**
   * 执行合规检查
   */
  async performComplianceCheck(standard?: ComplianceStandard): Promise<{
    passed: boolean;
    findings: ComplianceFinding[];
    recommendations: string[];
  }> {
    const standards = standard
      ? [standard]
      : Array.from(this.requirements.keys());
    const findings: ComplianceFinding[] = [];
    const recommendations: string[] = [];

    for (const std of standards) {
      const requirements = this.requirements.get(std) || [];

      for (const req of requirements) {
        for (const control of req.controls) {
          const finding = await this.evaluateControl(control, req);
          findings.push(finding);

          if (finding.status !== "compliant") {
            recommendations.push(...finding.recommendations);
          }
        }
      }
    }

    const passed = findings.every((f) => f.status === "compliant");

    logger.info("合规检查完成", {
      type: "compliance",
      standards,
      passed,
      findingsCount: findings.length,
      recommendationsCount: recommendations.length,
    });

    return {
      passed,
      findings,
      recommendations,
    };
  }

  /**
   * 评估控制措施
   */
  private async evaluateControl(
    control: ComplianceControl,
    requirement: ComplianceRequirement,
  ): Promise<ComplianceFinding> {
    const recommendations: string[] = [];
    let status: "compliant" | "non_compliant" | "needs_attention" = "compliant";

    if (control.status === "not_implemented") {
      status = "non_compliant";
      recommendations.push(`立即实施控制: ${control.title}`);
    } else if (control.status === "partial") {
      status = "needs_attention";
      recommendations.push(`完善控制实施: ${control.title}`);
    }

    // 检查证据是否过期
    const now = new Date();
    if (now > control.nextReview) {
      status = "needs_attention";
      recommendations.push(`重新审查控制: ${control.title}`);
    }

    // 检查是否有足够的证据
    if (!control.evidence || control.evidence.length === 0) {
      status = "needs_attention";
      recommendations.push(`收集控制证据: ${control.title}`);
    }

    return {
      controlId: control.id,
      requirementId: requirement.id,
      title: control.title,
      status,
      currentImplementation: control.implementation,
      recommendations,
      lastReviewed: control.lastReviewed,
      nextReview: control.nextReview,
    };
  }

  /**
   * 更新控制状态
   */
  async updateControlStatus(
    standard: ComplianceStandard,
    requirementId: string,
    controlId: string,
    status: ComplianceControl["status"],
    evidence?: string[],
    implementation?: string,
  ): Promise<void> {
    const requirements = this.requirements.get(standard);
    if (!requirements) {
      throw new Error(`未找到标准 ${standard} 的要求`);
    }

    const requirement = requirements.find((req) => req.id === requirementId);
    if (!requirement) {
      throw new Error(`未找到要求 ${requireId}`);
    }

    const control = requirement.controls.find((ctrl) => ctrl.id === controlId);
    if (!control) {
      throw new Error(`未找到控制 ${controlId}`);
    }

    // 更新控制信息
    control.status = status;
    if (evidence) control.evidence = evidence;
    if (implementation) control.implementation = implementation;
    control.lastReviewed = new Date();
    control.nextReview = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90天后

    logger.info("控制状态已更新", {
      type: "compliance",
      standard,
      requirementId,
      controlId,
      status,
    });

    securityAudit.logEvent({
      type: "configuration_change" as any,
      severity: "low" as any,
      title: "合规控制状态更新",
      description: `更新控制 ${control.title} 状态为 ${status}`,
      outcome: "success",
      metadata: {
        standard,
        requirementId,
        controlId,
        status,
        evidenceCount: evidence?.length || 0,
      },
    });
  }

  /**
   * 获取风险评估
   */
  getRiskAssessments(): RiskAssessment[] {
    return [...this.assessments];
  }

  /**
   * 更新风险评估
   */
  async updateRiskAssessment(
    riskId: string,
    updates: Partial<RiskAssessment>,
  ): Promise<void> {
    const risk = this.assessments.find((r) => r.id === riskId);
    if (!risk) {
      throw new Error(`未找到风险评估 ${riskId}`);
    }

    // 重新计算风险分数
    if (updates.likelihood || updates.impact) {
      const likelihood = updates.likelihood || risk.likelihood;
      const impact = updates.impact || risk.impact;

      const likelihoodScore = this.getLikelihoodScore(likelihood);
      const impactScore = this.getImpactScore(impact);
      updates.riskScore = Math.round((likelihoodScore + impactScore) / 2);
    }

    Object.assign(risk, updates);
    risk.lastAssessed = new Date();

    logger.info("风险评估已更新", {
      type: "compliance",
      riskId,
      riskScore: updates.riskScore,
      status: updates.status,
    });
  }

  /**
   * 获取可能性分数
   */
  private getLikelihoodScore(likelihood: RiskAssessment["likelihood"]): number {
    switch (likelihood) {
    case "low":
      return 25;
    case "medium":
      return 50;
    case "high":
      return 75;
    case "critical":
      return 100;
    default:
      return 50;
    }
  }

  /**
   * 获取影响分数
   */
  private getImpactScore(impact: RiskAssessment["impact"]): number {
    switch (impact) {
    case "low":
      return 25;
    case "medium":
      return 50;
    case "high":
      return 75;
    case "critical":
      return 100;
    default:
      return 50;
    }
  }

  /**
   * 生成合规路线图
   */
  generateComplianceRoadmap(standard: ComplianceStandard): {
    priority: "high" | "medium" | "low";
    control: ComplianceControl;
    requirement: ComplianceRequirement;
    estimatedEffort: "low" | "medium" | "high";
    timeline: string;
  }[] {
    const requirements = this.requirements.get(standard) || [];
    const roadmap: any[] = [];

    requirements.forEach((req) => {
      req.controls.forEach((control) => {
        if (control.status !== "implemented") {
          const priority = req.mandatory ? "high" : "medium";
          const estimatedEffort = this.estimateEffort(control);
          const timeline = this.calculateTimeline(control, estimatedEffort);

          roadmap.push({
            priority,
            control,
            requirement: req,
            estimatedEffort,
            timeline,
          });
        }
      });
    });

    // 按优先级和重要性排序
    return roadmap.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 估算实施工作量
   */
  private estimateEffort(
    control: ComplianceControl,
  ): "low" | "medium" | "high" {
    if (control.status === "partial") return "low";
    if (control.implementation && control.implementation.length > 100)
      return "high";
    return "medium";
  }

  /**
   * 计算时间线
   */
  private calculateTimeline(
    control: ComplianceControl,
    effort: "low" | "medium" | "high",
  ): string {
    const now = new Date();
    let days: number;

    switch (effort) {
    case "low":
      days = 7;
      break;
    case "medium":
      days = 21;
      break;
    case "high":
      days = 60;
      break;
    }

    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().split("T")[0];
  }

  /**
   * 获取支持的合规标准
   */
  getSupportedStandards(): ComplianceStandard[] {
    return Array.from(this.requirements.keys());
  }

  /**
   * 获取合规要求
   */
  getRequirements(standard?: ComplianceStandard): ComplianceRequirement[] {
    if (standard) {
      return this.requirements.get(standard) || [];
    }
    return Array.from(this.requirements.values()).flat();
  }
}

// 合规发现
interface ComplianceFinding {
  controlId: string;
  requirementId: string;
  title: string;
  status: "compliant" | "non_compliant" | "needs_attention";
  currentImplementation: string;
  recommendations: string[];
  lastReviewed: Date;
  nextReview: Date;
}

// 创建单例实例
export const complianceAuditor = ComplianceAuditor.getInstance();

export default complianceAuditor;
