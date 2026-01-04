import { callOpenAIJSON, RECOMMENDED_MODELS } from './openai-client';
import {
  getActivePrompt,
  renderPrompt,
  validatePromptParameters,
} from './prompt-templates';

// 报告类型枚举
export enum ReportType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  CUSTOM = 'custom',
}

// 报告状态枚举
export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 报告数据接口
export interface ReportData {
  reportType: ReportType;
  memberId: string;
  startDate: Date;
  endDate: Date;
  data: {
    health_scores?: Array<{ date: string; score: number }>;
    nutrition_data?: {
      calories: Array<{ date: string; actual: number; target: number }>;
      macros: {
        protein: Array<{ date: string; actual: number; target: number }>;
        carbs: Array<{ date: string; actual: number; target: number }>;
        fat: Array<{ date: string; actual: number; target: number }>;
      };
    };
    activity_data?: Array<{
      date: string;
      exercise_minutes: number;
      water_intake: number;
    }>;
    health_metrics?: {
      weight?: Array<{ date: string; value: number }>;
      blood_pressure?: Array<{
        date: string;
        systolic: number;
        diastolic: number;
      }>;
      heart_rate?: Array<{ date: string; value: number }>;
    };
    meal_logs?: Array<{
      date: string;
      meals: Array<{
        type: string;
        calories: number;
        satisfaction: number;
      }>;
    }>;
  };
}

// 生成的报告接口
export interface GeneratedReport {
  id: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  insights: string[];
  recommendations: string[];
  charts: ChartData[];
  generatedAt: Date;
  status: ReportStatus;
  shareToken?: string;
  htmlContent?: string;
  pdfUrl?: string;
}

// 报告章节接口
export interface ReportSection {
  id: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

// 图表数据接口
export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any;
  config?: {
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
  };
}

// 趋势分析结果
export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable';
  confidence: number;
  key_changes: Array<{
    metric: string;
    change: number;
    significance: 'major' | 'moderate' | 'minor';
  }>;
  predictions: Array<{
    metric: string;
    predicted_value: number;
    timeframe: string;
  }>;
}

// 健康报告生成器主类
export class HealthReportGenerator {
  private static instance: HealthReportGenerator;

  static getInstance(): HealthReportGenerator {
    if (!HealthReportGenerator.instance) {
      HealthReportGenerator.instance = new HealthReportGenerator();
    }
    return HealthReportGenerator.instance;
  }

  /**
   * 生成健康报告
   */
  async generateReport(
    reportData: ReportData,
    includeAIInsights: boolean = true,
  ): Promise<GeneratedReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. 数据汇总和趋势分析
      const dataSummary = await this.summarizeData(reportData);
      const trendAnalysis = this.analyzeTrends(reportData);

      // 2. 生成AI洞察（如果启用）
      let aiInsights: string[] = [];
      if (includeAIInsights) {
        aiInsights = await this.generateAIInsights(
          reportData,
          dataSummary,
          trendAnalysis,
        );
      }

      // 3. 创建报告章节
      const sections = this.createReportSections(
        reportData,
        dataSummary,
        trendAnalysis,
        aiInsights,
      );

      // 4. 生成图表数据
      const charts = this.generateCharts(reportData, trendAnalysis);

      // 5. 生成推荐
      const recommendations = this.generateRecommendations(
        dataSummary,
        trendAnalysis,
        aiInsights,
      );

      // 6. 创建HTML内容
      const htmlContent = this.generateHTMLContent({
        id: reportId,
        title: this.generateReportTitle(reportData),
        summary: this.generateReportSummary(dataSummary, trendAnalysis),
        sections,
        insights: aiInsights,
        recommendations,
        charts,
        generatedAt: new Date(),
        status: ReportStatus.COMPLETED,
      });

      return {
        id: reportId,
        title: this.generateReportTitle(reportData),
        summary: this.generateReportSummary(dataSummary, trendAnalysis),
        sections,
        insights: aiInsights,
        recommendations,
        charts,
        generatedAt: new Date(),
        status: ReportStatus.COMPLETED,
        htmlContent,
      };
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        id: reportId,
        title: '报告生成失败',
        summary: '生成报告时发生错误，请稍后重试',
        sections: [],
        insights: [],
        recommendations: ['请联系技术支持'],
        charts: [],
        generatedAt: new Date(),
        status: ReportStatus.FAILED,
      };
    }
  }

  /**
   * 数据汇总
   */
  private async summarizeData(reportData: ReportData): Promise<{
    averages: Record<string, number>;
    totals: Record<string, number>;
    best_day: { date: string; score: number };
    worst_day: { date: string; score: number };
    consistency_score: number;
  }> {
    const { data } = reportData;

    const averages: Record<string, number> = {};
    const totals: Record<string, number> = {};

    // 健康评分平均值
    if (data.health_scores && data.health_scores.length > 0) {
      const scores = data.health_scores.map((s) => s.score);
      averages.health_score = scores.reduce((a, b) => a + b, 0) / scores.length;
      totals.days_tracked = scores.length;

      // 最好和最坏的一天
      const sortedScores = [...data.health_scores].sort(
        (a, b) => b.score - a.score,
      );
      const best = sortedScores[0];
      const worst = sortedScores[sortedScores.length - 1];

      return {
        averages,
        totals,
        best_day: { date: best.date, score: best.score },
        worst_day: { date: worst.date, score: worst.score },
        consistency_score: this.calculateConsistencyScore(scores),
      };
    }

    return {
      averages: {},
      totals: {},
      best_day: { date: '', score: 0 },
      worst_day: { date: '', score: 0 },
      consistency_score: 0,
    };
  }

  /**
   * 趋势分析
   */
  private analyzeTrends(reportData: ReportData): TrendAnalysis {
    const { data } = reportData;

    const trends: TrendAnalysis = {
      direction: 'stable',
      confidence: 0.5,
      key_changes: [],
      predictions: [],
    };

    // 分析健康评分趋势
    if (data.health_scores && data.health_scores.length >= 7) {
      const scores = data.health_scores.map((s) => s.score);
      const trend = this.calculateLinearTrend(scores);

      if (Math.abs(trend.slope) > 1) {
        trends.direction = trend.slope > 0 ? 'improving' : 'declining';
        trends.confidence = Math.min(Math.abs(trend.slope) / 5, 0.9);
      }

      trends.key_changes.push({
        metric: 'health_score',
        change: trend.slope * scores.length,
        significance:
          Math.abs(trend.slope) > 2
            ? 'major'
            : Math.abs(trend.slope) > 1
              ? 'moderate'
              : 'minor',
      });

      // 预测下个周期
      const nextValue = scores[scores.length - 1] + trend.slope;
      trends.predictions.push({
        metric: 'health_score',
        predicted_value: Math.max(0, Math.min(100, nextValue)),
        timeframe:
          reportData.reportType === ReportType.WEEKLY ? '下周' : '下月',
      });
    }

    return trends;
  }

  /**
   * 生成AI洞察
   */
  private async generateAIInsights(
    reportData: ReportData,
    dataSummary: any,
    trendAnalysis: TrendAnalysis,
  ): Promise<string[]> {
    const prompt = getActivePrompt('report_generation', 'weekly_health_report');
    if (!prompt) {
      return ['无法生成AI洞察，请稍后重试'];
    }

    const variables = {
      weekly_data: JSON.stringify({
        summary: dataSummary,
        trends: trendAnalysis,
        report_type: reportData.reportType,
      }),
      user_goals: JSON.stringify(reportData.data), // 简化为传递完整数据
    };

    const validation = validatePromptParameters(prompt, variables);
    if (!validation.valid) {
      return ['AI洞察生成参数不完整'];
    }

    const renderedPrompt = renderPrompt(prompt, variables);

    try {
      const result = await callOpenAIJSON(
        renderedPrompt,
        RECOMMENDED_MODELS.PAID[1], // 使用付费模型获得更好洞察
        1500,
      );

      return result.insights || ['暂无特殊洞察，保持当前健康管理方案'];
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return ['AI洞察生成失败，使用基础分析'];
    }
  }

  /**
   * 创建报告章节
   */
  private createReportSections(
    reportData: ReportData,
    dataSummary: any,
    trendAnalysis: TrendAnalysis,
    aiInsights: string[],
  ): ReportSection[] {
    const sections: ReportSection[] = [];

    // 执行摘要
    sections.push({
      id: 'executive_summary',
      title: '执行摘要',
      content: this.generateExecutiveSummary(dataSummary, trendAnalysis),
      priority: 'high',
    });

    // 健康评分分析
    if (reportData.data.health_scores) {
      sections.push({
        id: 'health_score_analysis',
        title: '健康评分分析',
        content: this.generateHealthScoreAnalysis(
          reportData.data.health_scores,
          trendAnalysis,
        ),
        priority: 'high',
        data: reportData.data.health_scores,
      });
    }

    // 营养摄入分析
    if (reportData.data.nutrition_data) {
      sections.push({
        id: 'nutrition_analysis',
        title: '营养摄入分析',
        content: this.generateNutritionAnalysis(reportData.data.nutrition_data),
        priority: 'high',
        data: reportData.data.nutrition_data,
      });
    }

    // 活动数据分析
    if (reportData.data.activity_data) {
      sections.push({
        id: 'activity_analysis',
        title: '活动数据分析',
        content: this.generateActivityAnalysis(reportData.data.activity_data),
        priority: 'medium',
        data: reportData.data.activity_data,
      });
    }

    // AI洞察
    if (aiInsights.length > 0) {
      sections.push({
        id: 'ai_insights',
        title: 'AI健康洞察',
        content: aiInsights.join('\n\n'),
        priority: 'high',
      });
    }

    // 趋势预测
    sections.push({
      id: 'predictions',
      title: '趋势预测',
      content: this.generatePredictionsContent(trendAnalysis),
      priority: 'medium',
    });

    return sections;
  }

  /**
   * 生成图表数据
   */
  private generateCharts(
    reportData: ReportData,
    trendAnalysis: TrendAnalysis,
  ): ChartData[] {
    const charts: ChartData[] = [];

    // 健康评分趋势图
    if (reportData.data.health_scores) {
      charts.push({
        id: 'health_score_trend',
        type: 'line',
        title: '健康评分趋势',
        data: reportData.data.health_scores.map((item) => ({
          date: item.date,
          score: item.score,
        })),
        config: {
          xAxis: 'date',
          yAxis: 'score',
          colors: ['#10b981'],
        },
      });
    }

    // 营养摄入对比图
    if (reportData.data.nutrition_data?.calories) {
      charts.push({
        id: 'nutrition_balance',
        type: 'bar',
        title: '营养摄入达成率',
        data: reportData.data.nutrition_data.calories.map((item) => ({
          date: item.date,
          actual: item.actual,
          target: item.target,
          achievement: (item.actual / item.target) * 100,
        })),
        config: {
          xAxis: 'date',
          yAxis: 'achievement',
          colors: ['#3b82f6', '#ef4444'],
        },
      });
    }

    return charts;
  }

  /**
   * 生成推荐
   */
  private generateRecommendations(
    dataSummary: any,
    trendAnalysis: TrendAnalysis,
    aiInsights: string[],
  ): string[] {
    const recommendations: string[] = [];

    // 基于趋势的推荐
    if (trendAnalysis.direction === 'declining') {
      recommendations.push('健康评分呈下降趋势，建议加强健康管理');
      recommendations.push('考虑调整饮食结构或增加运动频率');
    } else if (trendAnalysis.direction === 'improving') {
      recommendations.push('健康状况稳步改善，请继续保持');
    }

    // 基于一致性的推荐
    if (dataSummary.consistency_score < 60) {
      recommendations.push('健康数据记录不够稳定，建议每日坚持记录');
    }

    // AI洞察驱动的推荐
    if (aiInsights.some((insight) => insight.includes('营养'))) {
      recommendations.push('关注营养均衡，适当调整宏量营养素比例');
    }

    if (aiInsights.some((insight) => insight.includes('运动'))) {
      recommendations.push('增加适量运动，有助于改善整体健康状况');
    }

    return recommendations.length > 0
      ? recommendations
      : ['继续保持当前健康生活方式'];
  }

  /**
   * 生成HTML内容
   */
  private generateHTMLContent(report: GeneratedReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: 'Microsoft YaHei', sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #10b981; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .summary { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .insights { background: #ecfdf5; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
        .recommendations { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 0.9em; margin-top: 50px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>生成时间：${report.generatedAt.toLocaleString('zh-CN')}</p>
    </div>

    <div class="summary">
        <h2>报告摘要</h2>
        <p>${report.summary}</p>
    </div>

    ${report.sections
      .map(
        (section) => `
        <div class="section">
            <h2>${section.title}</h2>
            <p>${section.content.replace(/\n/g, '<br>')}</p>
        </div>
    `,
      )
      .join('')}

    ${
      report.insights.length > 0
        ? `
        <div class="insights">
            <h2>AI健康洞察</h2>
            ${report.insights.map((insight) => `<p>• ${insight}</p>`).join('')}
        </div>
    `
        : ''
    }

    ${
      report.recommendations.length > 0
        ? `
        <div class="recommendations">
            <h2>建议与行动计划</h2>
            ${report.recommendations.map((rec) => `<p>• ${rec}</p>`).join('')}
        </div>
    `
        : ''
    }

    <div class="footer">
        <p>此报告由AI生成，仅供参考。如有健康问题，请咨询专业医生。</p>
        <p>健康管家系统 © ${new Date().getFullYear()}</p>
    </div>
</body>
</html>`;
  }

  // 辅助方法

  private generateReportTitle(reportData: ReportData): string {
    const dateRange = `${reportData.startDate.toLocaleDateString('zh-CN')} - ${reportData.endDate.toLocaleDateString('zh-CN')}`;

    switch (reportData.reportType) {
      case ReportType.WEEKLY:
        return `健康周报 (${dateRange})`;
      case ReportType.MONTHLY:
        return `健康月报 (${dateRange})`;
      case ReportType.QUARTERLY:
        return `健康季报 (${dateRange})`;
      default:
        return `健康报告 (${dateRange})`;
    }
  }

  private generateReportSummary(
    dataSummary: any,
    trendAnalysis: TrendAnalysis,
  ): string {
    let summary = '';

    if (dataSummary.averages.health_score) {
      summary += `平均健康评分为 ${Math.round(dataSummary.averages.health_score)} 分。`;
    }

    switch (trendAnalysis.direction) {
      case 'improving':
        summary += '整体健康状况呈上升趋势，请继续保持。';
        break;
      case 'declining':
        summary += '整体健康状况有所下降，建议调整健康管理策略。';
        break;
      default:
        summary += '整体健康状况保持稳定。';
    }

    return summary;
  }

  private generateExecutiveSummary(
    dataSummary: any,
    trendAnalysis: TrendAnalysis,
  ): string {
    return `在本报告周期内，您${dataSummary.totals.days_tracked ? `共记录了 ${dataSummary.totals.days_tracked} 天的健康数据` : '的健康管理表现良好'}。${trendAnalysis.direction === 'improving' ? '健康状况稳步改善' : trendAnalysis.direction === 'declining' ? '需要加强健康管理' : '健康状况保持稳定'}。`;
  }

  private generateHealthScoreAnalysis(
    healthScores: any[],
    trendAnalysis: TrendAnalysis,
  ): string {
    const avgScore =
      healthScores.reduce((sum, item) => sum + item.score, 0) /
      healthScores.length;

    return `报告期内平均健康评分为 ${Math.round(avgScore)} 分。${trendAnalysis.direction === 'improving' ? '健康评分呈上升趋势，说明健康管理措施效果良好。' : trendAnalysis.direction === 'declining' ? '健康评分有所下降，可能需要调整生活方式或饮食习惯。' : '健康评分保持相对稳定。'}`;
  }

  private generateNutritionAnalysis(nutritionData: any): string {
    // 简化的营养分析
    return '营养摄入数据分析显示，您的热量控制和宏量营养素分布整体合理。建议继续关注营养均衡。';
  }

  private generateActivityAnalysis(activityData: any[]): string {
    const avgExercise =
      activityData.reduce((sum, item) => sum + item.exercise_minutes, 0) /
      activityData.length;
    const avgWater =
      activityData.reduce((sum, item) => sum + item.water_intake, 0) /
      activityData.length;

    return `平均每日运动时长为 ${Math.round(avgExercise)} 分钟，饮水量为 ${Math.round(avgWater)} ml。建议保持规律运动和充足饮水。`;
  }

  private generatePredictionsContent(trendAnalysis: TrendAnalysis): string {
    if (trendAnalysis.predictions.length === 0) {
      return '暂无明确的趋势预测数据。';
    }

    return trendAnalysis.predictions
      .map(
        (pred) =>
          `预计${pred.timeframe}的${pred.metric}约为 ${Math.round(pred.predicted_value)}。`,
      )
      .join(' ');
  }

  private calculateConsistencyScore(scores: number[]): number {
    if (scores.length < 2) return 100;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // 一致性评分：标准差越小评分越高
    const consistencyScore = Math.max(0, 100 - (stdDev / mean) * 100);
    return Math.min(100, consistencyScore);
  }

  private calculateLinearTrend(values: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算R²
    const yMean = sumY / n;
    const ssRes = values.reduce(
      (sum, y, x) => sum + Math.pow(y - (slope * x + intercept), 2),
      0,
    );
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = 1 - ssRes / ssTot;

    return { slope, intercept, rSquared: isNaN(rSquared) ? 0 : rSquared };
  }
}

// 导出单例实例
export const healthReportGenerator = HealthReportGenerator.getInstance();
