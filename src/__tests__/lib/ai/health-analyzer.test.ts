/**
 * AI健康分析器单元测试
 */

import { HealthAnalyzer } from '@/lib/services/ai/health-analyzer';
import { MedicalIndicator, IndicatorType } from '@/lib/types/medical';

// Mock AI client
jest.mock('@/lib/services/ai/openai-client', () => ({
  openaiClient: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

import { openaiClient } from '@/lib/services/ai/openai-client';

describe('Health Analyzer', () => {
  let healthAnalyzer: HealthAnalyzer;

  beforeEach(() => {
    healthAnalyzer = new HealthAnalyzer();
    jest.clearAllMocks();
  });

  describe('医疗数据结构化', () => {
    it('应该能够结构化体检指标', () => {
      const rawIndicators = [
        {
          name: '血压',
          value: '120/80',
          unit: 'mmHg',
          category: '心血管',
          referenceRange: '90-140/60-90',
          status: 'normal',
        },
        {
          name: '总胆固醇',
          value: 4.8,
          unit: 'mmol/L',
          category: '血脂',
          referenceRange: '<5.2',
          status: 'normal',
        },
        {
          name: '空腹血糖',
          value: 5.2,
          unit: 'mmol/L',
          category: '血糖',
          referenceRange: '3.9-6.1',
          status: 'normal',
        },
      ];

      const structuredData = healthAnalyzer.structureMedicalData(rawIndicators);

      expect(structuredData).toBeDefined();
      expect(structuredData.vitals).toBeDefined();
      expect(structuredData.blood_work).toBeDefined();
      expect(structuredData.vitals.blood_pressure).toBe('120/80');
      expect(structuredData.blood_work.cholesterol).toBe(4.8);
      expect(structuredData.blood_work.glucose).toBe(5.2);
    });

    it('应该处理异常指标', () => {
      const indicatorsWithIssues = [
        {
          name: '血压',
          value: '150/95',
          unit: 'mmHg',
          category: '心血管',
          referenceRange: '90-140/60-90',
          status: 'high',
        },
        {
          name: '总胆固醇',
          value: 6.5,
          unit: 'mmol/L',
          category: '血脂',
          referenceRange: '<5.2',
          status: 'high',
        },
      ];

      const structuredData =
        healthAnalyzer.structureMedicalData(indicatorsWithIssues);

      expect(structuredData.abnormal_indicators).toHaveLength(2);
      expect(structuredData.abnormal_indicators[0].name).toBe('血压');
      expect(structuredData.abnormal_indicators[0].severity).toBe('moderate');
      expect(structuredData.risk_factors).toContain('hypertension');
      expect(structuredData.risk_factors).toContain('hyperlipidemia');
    });

    it('应该处理趋势数据', () => {
      const trendIndicators = [
        {
          name: '体重',
          values: [75, 74, 73, 72, 71],
          unit: 'kg',
          dates: [
            '2024-01-01',
            '2024-02-01',
            '2024-03-01',
            '2024-04-01',
            '2024-05-01',
          ],
          category: '体格测量',
        },
        {
          name: 'BMI',
          values: [25.2, 24.8, 24.4, 24.0, 23.6],
          unit: 'kg/m²',
          dates: [
            '2024-01-01',
            '2024-02-01',
            '2024-03-01',
            '2024-04-01',
            '2024-05-01',
          ],
          category: '体格测量',
        },
      ];

      const structuredData =
        healthAnalyzer.structureMedicalData(trendIndicators);

      expect(structuredData.trends).toBeDefined();
      expect(structuredData.trends.weight.trend).toBe('decreasing');
      expect(structuredData.trends.weight.change_rate).toBeGreaterThan(0);
      expect(structuredData.trends.bmi.trend).toBe('decreasing');
      expect(structuredData.positive_trends).toContain('weight_loss');
    });

    it('应该处理缺失或不完整数据', () => {
      const incompleteIndicators = [
        {
          name: '血压',
          value: '', // 空值
          unit: 'mmHg',
          category: '心血管',
          status: 'unknown',
        },
        {
          name: '心率',
          value: 72,
          unit: 'bpm', // 缺少reference range
          category: '心血管',
        },
        {
          name: '体温', // 缺少value
          unit: '°C',
          category: '生命体征',
        },
      ];

      const structuredData =
        healthAnalyzer.structureMedicalData(incompleteIndicators);

      expect(structuredData.complete_indicators).toBeLessThan(
        incompleteIndicators.length,
      );
      expect(structuredData.missing_data).toContain('血压');
      expect(structuredData.incomplete_data).toContain('体温');
    });
  });

  describe('健康风险评估', () => {
    it('应该评估心血管风险', async () => {
      const userProfile = {
        age: 45,
        gender: 'male',
        height: 175,
        weight: 85,
        bmi: 27.8,
        health_goals: ['weight_loss'],
        dietary_preferences: ['balanced'],
        allergies: [],
      };

      // 将原始 medical 数据转换为 MedicalIndicator 数组
      const medicalIndicators: MedicalIndicator[] = [
        {
          id: '1',
          reportId: 'report-1',
          indicatorType: IndicatorType.TOTAL_CHOLESTEROL,
          name: '总胆固醇',
          value: 6.2,
          unit: 'mmol/L',
          isAbnormal: true,
          status: 'ABNORMAL',
          isCorrected: false,
        },
        {
          id: '2',
          reportId: 'report-1',
          indicatorType: IndicatorType.HDL_CHOLESTEROL,
          name: 'HDL胆固醇',
          value: 1.0,
          unit: 'mmol/L',
          isAbnormal: false,
          status: 'NORMAL',
          isCorrected: false,
        },
        {
          id: '3',
          reportId: 'report-1',
          indicatorType: IndicatorType.LDL_CHOLESTEROL,
          name: 'LDL胆固醇',
          value: 4.2,
          unit: 'mmol/L',
          isAbnormal: true,
          status: 'ABNORMAL',
          isCorrected: false,
        },
        {
          id: '4',
          reportId: 'report-1',
          indicatorType: IndicatorType.TRIGLYCERIDES,
          name: '甘油三酯',
          value: 2.1,
          unit: 'mmol/L',
          isAbnormal: true,
          status: 'ABNORMAL',
          isCorrected: false,
        },
        {
          id: '5',
          reportId: 'report-1',
          indicatorType: IndicatorType.FASTING_GLUCOSE,
          name: '空腹血糖',
          value: 5.8,
          unit: 'mmol/L',
          isAbnormal: false,
          status: 'NORMAL',
          isCorrected: false,
        },
      ];

      // 使用 structureMedicalData 转换数据格式
      const structuredMedicalData =
        await healthAnalyzer.structureMedicalData(medicalIndicators);

      // 添加缺失的个人信息（血压、家族史等）
      structuredMedicalData.other_indicators = {
        blood_pressure: '150/95',
        family_history: ['heart_disease'],
        smoking_status: 'former',
        exercise_frequency: 'rarely',
      };

      const riskAssessment = await healthAnalyzer.assessHealthRisks(
        structuredMedicalData,
      );

      expect(riskAssessment.cardiovascular_risk).toBeDefined();
      expect(riskAssessment.cardiovascular_risk.level).toBe('high');
      expect(riskAssessment.cardiovascular_risk.score).toBeGreaterThan(0);
      expect(riskAssessment.cardiovascular_risk.factors).toContain(
        'hypertension',
      );
      expect(riskAssessment.cardiovascular_risk.factors).toContain(
        'hyperlipidemia',
      );
      expect(riskAssessment.cardiovascular_risk.factors).toContain('obesity');
    });

    it('应该评估代谢风险', async () => {
      const userProfile = {
        age: 35,
        gender: 'female',
        height: 165,
        weight: 75,
        bmi: 27.5,
        health_goals: [],
        dietary_preferences: [],
        allergies: [],
      };

      // 将原始 medical 数据转换为 MedicalIndicator 数组
      const medicalIndicators: MedicalIndicator[] = [
        {
          id: '1',
          reportId: 'report-2',
          indicatorType: IndicatorType.FASTING_GLUCOSE,
          name: '空腹血糖',
          value: 6.0,
          unit: 'mmol/L',
          isAbnormal: true,
          status: 'ABNORMAL',
          isCorrected: false,
        },
        {
          id: '2',
          reportId: 'report-2',
          indicatorType: IndicatorType.HDL_CHOLESTEROL,
          name: 'HDL胆固醇',
          value: 1.1,
          unit: 'mmol/L',
          isAbnormal: false,
          status: 'NORMAL',
          isCorrected: false,
        },
        {
          id: '3',
          reportId: 'report-2',
          indicatorType: IndicatorType.TRIGLYCERIDES,
          name: '甘油三酯',
          value: 1.9,
          unit: 'mmol/L',
          isAbnormal: false,
          status: 'NORMAL',
          isCorrected: false,
        },
      ];

      // 使用 structureMedicalData 转换数据格式
      const structuredMedicalData =
        await healthAnalyzer.structureMedicalData(medicalIndicators);

      // 添加缺失的个人信息（腰围、血压等）
      structuredMedicalData.other_indicators = {
        waist_circumference: 88,
        blood_pressure: '135/85',
      };

      const riskAssessment = await healthAnalyzer.assessHealthRisks(
        structuredMedicalData,
      );

      expect(riskAssessment.metabolic_syndrome_risk).toBeDefined();
      expect(
        riskAssessment.metabolic_syndrome_risk.criteria_met,
      ).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.metabolic_syndrome_risk.diagnosis_risk).toBe(
        'moderate',
      );
    });

    it('应该评估营养风险', () => {
      const userProfile = {
        age: 25,
        gender: 'male',
        height: 180,
        weight: 65,
        bmi: 20.1,
        health_goals: ['muscle_gain'],
        dietary_preferences: ['vegetarian'],
        allergies: ['dairy', 'nuts'],
      };

      const nutritionData = {
        dietary_restrictions: ['vegetarian', 'dairy_free', 'nut_free'],
        supplement_use: ['protein_powder'],
        recent_weight_change: -2,
        appetite_level: 'poor',
      };

      const riskAssessment = healthAnalyzer.assessNutritionalRisks(
        userProfile,
        nutritionData,
      );

      expect(riskAssessment.malnutrition_risk).toBeDefined();
      expect(riskAssessment.deficiencies).toContain('protein');
      expect(riskAssessment.deficiencies).toContain('calcium');
      expect(riskAssessment.deficiencies).toContain('vitamin_b12');
    });
  });

  describe('营养目标生成', () => {
    it('应该为减重目标生成营养目标', () => {
      const userProfile = {
        age: 30,
        gender: 'male',
        height: 175,
        weight: 85,
        bmi: 27.8,
        health_goals: ['weight_loss'],
        dietary_preferences: ['balanced'],
        allergies: [],
      };

      const healthAnalysis = {
        risk_level: 'medium',
        key_findings: ['Overweight', 'Elevated blood pressure'],
        activity_level: 'sedentary',
        risk_assessment: {
          level: 'medium',
          concerns: ['超重', '血压升高'],
          urgent_actions: ['控制饮食', '增加运动'],
        },
        nutritional_recommendations: {
          macro_distribution: {
            carbs_percent: 45,
            protein_percent: 25,
            fat_percent: 30,
          },
        },
      };

      const nutritionTargets = healthAnalyzer.generateNutritionTargets(
        userProfile,
        healthAnalysis,
        ['weight_loss'],
      );

      expect(nutritionTargets.daily_calories).toBeLessThan(2000); // 低于维持热量
      expect(nutritionTargets.macros.protein_percent).toBeGreaterThanOrEqual(
        25,
      ); // 高蛋白
      expect(nutritionTargets.macros.fat_percent).toBeLessThanOrEqual(30); // 适量脂肪
      expect(nutritionTargets.macros.carbs_percent).toBeGreaterThanOrEqual(35); // 复合碳水
      expect(nutritionTargets.calorie_deficit).toBe(500); // 500卡路里缺口
    });

    it('应该为增肌目标生成营养目标', () => {
      const userProfile = {
        age: 25,
        gender: 'male',
        height: 180,
        weight: 70,
        bmi: 21.6,
        health_goals: ['muscle_gain'],
        dietary_preferences: ['high_protein'],
        allergies: [],
      };

      const healthAnalysis = {
        risk_level: 'low',
        key_findings: ['Normal weight', 'Good muscle mass'],
        activity_level: 'active',
        risk_assessment: {
          level: 'low',
          concerns: [],
          urgent_actions: [],
        },
        nutritional_recommendations: {
          macro_distribution: {
            carbs_percent: 50,
            protein_percent: 30,
            fat_percent: 20,
          },
        },
      };

      const nutritionTargets = healthAnalyzer.generateNutritionTargets(
        userProfile,
        healthAnalysis,
        ['muscle_gain'],
      );

      expect(nutritionTargets.daily_calories).toBeGreaterThan(2500); // 热量盈余
      expect(nutritionTargets.macros.protein_percent).toBeGreaterThanOrEqual(
        30,
      ); // 很高蛋白
      expect(nutritionTargets.protein_grams).toBeGreaterThan(120); // 每公斤体重1.6g以上
      expect(nutritionTargets.calorie_surplus).toBe(300); // 300卡路里盈余
    });

    it('应该考虑特殊饮食需求', () => {
      const userProfile = {
        age: 35,
        gender: 'female',
        height: 165,
        weight: 60,
        bmi: 22.0,
        health_goals: ['weight_maintenance'],
        dietary_preferences: ['vegetarian'],
        allergies: ['dairy', 'gluten'],
      };

      const healthAnalysis = {
        risk_level: 'low',
        key_findings: ['Healthy weight'],
        activity_level: 'moderate',
        risk_assessment: {
          level: 'low',
          concerns: [],
          urgent_actions: [],
        },
        nutritional_recommendations: {
          macro_distribution: {
            carbs_percent: 50,
            protein_percent: 20,
            fat_percent: 30,
          },
        },
      };

      const nutritionTargets = healthAnalyzer.generateNutritionTargets(
        userProfile,
        healthAnalysis,
        ['weight_maintenance'],
      );

      expect(nutritionTargets.daily_calories).toBeGreaterThan(0);
      expect(nutritionTargets.special_considerations).toContain('vegetarian');
      expect(nutritionTargets.special_considerations).toContain('dairy_free');
      expect(nutritionTargets.special_considerations).toContain('gluten_free');
      expect(nutritionTargets.micronutrients).toContain('iron');
      expect(nutritionTargets.micronutrients).toContain('b12');
      expect(nutritionTargets.micronutrients).toContain('calcium');
    });
  });

  describe('饮食调整建议', () => {
    it('应该为高血压提供饮食建议', () => {
      const healthIssues = ['hypertension', 'high_sodium_intake'];
      const currentDiet = {
        processed_foods: 'high',
        sodium_intake: 'high',
        fruit_vegetable_intake: 'low',
        alcohol_consumption: 'moderate',
      };

      const adjustments = healthAnalyzer.generateDietaryAdjustments({
        health_issues,
        current_diet: currentDiet,
      });

      expect(adjustments).toContain('减少钠盐摄入至每日<5g');
      expect(adjustments).toContain('增加富含钾的食物（香蕉、菠菜等）');
      expect(adjustments).toContain('选择DASH饮食模式');
      expect(adjustments).toContain('限制加工食品和高盐调味品');
    });

    it('应该为高胆固醇提供饮食建议', () => {
      const healthIssues = ['hyperlipidemia', 'high_ldl'];
      const currentDiet = {
        saturated_fat: 'high',
        fiber_intake: 'low',
        omega_3_intake: 'low',
      };

      const adjustments = healthAnalyzer.generateDietaryAdjustments({
        health_issues,
        current_diet: currentDiet,
      });

      expect(adjustments).toContain('减少饱和脂肪摄入');
      expect(adjustments).toContain('增加可溶性纤维（燕麦、豆类等）');
      expect(adjustments).toContain('增加Omega-3脂肪酸摄入');
      expect(adjustments).toContain('选择植物固醇丰富的食物');
    });

    it('应该为糖尿病前期提供饮食建议', () => {
      const healthIssues = ['prediabetes', 'insulin_resistance'];
      const currentDiet = {
        refined_carbs: 'high',
        fiber_intake: 'low',
        meal_timing: 'irregular',
      };

      const adjustments = healthAnalyzer.generateDietaryAdjustments({
        health_issues,
        current_diet: currentDiet,
      });

      expect(adjustments).toContain('选择低升糖指数碳水化合物');
      expect(adjustments).toContain('增加膳食纤维摄入');
      expect(adjustments).toContain('规律进餐，控制份量');
      expect(adjustments).toContain('限制含糖饮料和甜食');
    });
  });

  describe('健康关注优先级排序', () => {
    it('应该按严重程度排序健康问题', () => {
      const healthAnalysis = {
        overall_score: 65,
        risk_level: 'medium',
        key_findings: [
          { issue: '轻度高血压', severity: 'moderate', urgency: 'medium' },
          { issue: '维生素D缺乏', severity: 'mild', urgency: 'low' },
          { issue: '肥胖', severity: 'moderate', urgency: 'high' },
          { issue: '高胆固醇', severity: 'moderate', urgency: 'medium' },
        ],
        risk_assessment: {
          immediate_risks: ['cardiovascular_disease'],
          long_term_risks: ['diabetes', 'osteoporosis'],
        },
      };

      const prioritizedConcerns =
        healthAnalyzer.prioritizeHealthConcerns(healthAnalysis);

      expect(prioritizedConcerns).toHaveLength(4);
      expect(prioritizedConcerns[0].issue).toBe('肥胖'); // 高紧急度
      expect(prioritizedConcerns[1].severity).toBe('moderate'); // 中等严重程度
      expect(prioritizedConcerns[3].issue).toBe('维生素D缺乏'); // 低严重程度
    });

    it('应该考虑用户目标调整优先级', () => {
      const healthAnalysis = {
        overall_score: 70,
        risk_level: 'low',
        key_findings: [
          { issue: '运动不足', severity: 'mild', urgency: 'low' },
          { issue: '睡眠质量差', severity: 'mild', urgency: 'low' },
          { issue: '压力过大', severity: 'moderate', urgency: 'medium' },
        ],
      };

      const userGoals = ['weight_loss', 'muscle_gain'];

      const prioritizedConcerns = healthAnalyzer.prioritizeHealthConcerns(
        healthAnalysis,
        userGoals,
      );

      // 运动不足应该优先级更高，因为与用户目标相关
      const exerciseIndex = prioritizedConcerns.findIndex(
        (c) => c.issue === '运动不足',
      );
      const sleepIndex = prioritizedConcerns.findIndex(
        (c) => c.issue === '睡眠质量差',
      );

      expect(exerciseIndex).toBeLessThan(sleepIndex);
    });
  });

  describe('AI分析集成', () => {
    const mockCreate = openaiClient.chat.completions.create as jest.Mock;

    beforeEach(() => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overall_score: 75,
                risk_level: 'medium',
                key_findings: ['体重略超重', '血压偏高', '需要改善饮食结构'],
                risk_assessment: {
                  level: 'medium',
                  concerns: ['hypertension_risk', 'metabolic_syndrome_risk'],
                  urgent_actions: ['减重5-10kg', '降低血压至130/80以下'],
                },
                nutritional_recommendations: {
                  macro_distribution: {
                    carbs_percent: 45,
                    protein_percent: 25,
                    fat_percent: 30,
                  },
                  daily_calories: 1800,
                  micronutrients: ['vitamin_d', 'omega_3', 'magnesium'],
                },
                lifestyle_modifications: [
                  '每周至少150分钟中等强度运动',
                  '保证7-8小时睡眠',
                  '学习压力管理技巧',
                ],
              }),
            },
          },
        ],
      });
    });

    it('应该使用AI进行综合健康分析', async () => {
      const userProfile = {
        age: 40,
        gender: 'male',
        height: 175,
        weight: 82,
        bmi: 26.8,
        health_goals: ['weight_loss'],
        dietary_preferences: ['balanced'],
        allergies: [],
      };

      const medicalData = {
        blood_pressure: '145/90',
        heart_rate: 78,
        cholesterol: 5.8,
        glucose: 5.6,
        weight_trend: 'increasing',
        exercise_level: 'low',
      };

      const analysis = await healthAnalyzer.analyzeHealthStatus(
        userProfile,
        medicalData,
      );

      expect(analysis).toBeDefined();
      expect(analysis.overall_score).toBe(75);
      expect(analysis.risk_level).toBe('medium');
      expect(analysis.key_findings).toContain('体重略超重');
      expect(analysis.nutritional_recommendations.daily_calories).toBe(1800);
      expect(analysis.lifestyle_modifications).toContain(
        '每周至少150分钟中等强度运动',
      );
    });

    it('应该处理AI分析失败', async () => {
      mockCreate.mockRejectedValue(new Error('AI service unavailable'));

      const userProfile = {
        age: 30,
        gender: 'female',
        height: 165,
        weight: 60,
        bmi: 22.0,
        health_goals: [],
        dietary_preferences: [],
        allergies: [],
      };

      const medicalData = {
        blood_pressure: '120/80',
        heart_rate: 72,
      };

      await expect(
        healthAnalyzer.analyzeHealthStatus(userProfile, medicalData),
      ).rejects.toThrow('AI service unavailable');
    });

    it('应该缓存分析结果', async () => {
      const userProfile = {
        age: 30,
        gender: 'male',
        height: 175,
        weight: 70,
        bmi: 22.9,
        health_goals: [],
        dietary_preferences: [],
        allergies: [],
      };

      const medicalData = {
        blood_pressure: '120/80',
        heart_rate: 70,
      };

      // 第一次分析
      await healthAnalyzer.analyzeHealthStatus(userProfile, medicalData);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // 第二次分析相同数据
      await healthAnalyzer.analyzeHealthStatus(userProfile, medicalData);
      expect(mockCreate).toHaveBeenCalledTimes(1); // 应该使用缓存
    });
  });

  describe('报告生成', () => {
    it('应该生成详细的健康报告', () => {
      const analysisResults = {
        overall_score: 75,
        risk_level: 'medium',
        key_findings: ['体重略超重', '血压偏高'],
        nutritional_recommendations: {
          macro_distribution: {
            carbs_percent: 45,
            protein_percent: 25,
            fat_percent: 30,
          },
          daily_calories: 1800,
          micronutrients: ['vitamin_d', 'omega_3'],
        },
        lifestyle_modifications: ['增加运动', '改善睡眠'],
        follow_up_suggestions: ['3个月后复查血压', '6个月后全面体检'],
      };

      const report = healthAnalyzer.generateHealthReport(analysisResults);

      expect(report).toBeDefined();
      expect(report.summary).toContain('健康综合评分: 75');
      expect(report.key_findings).toHaveLength(2);
      expect(report.recommendations.nutrition).toBeDefined();
      expect(report.recommendations.lifestyle).toBeDefined();
      expect(report.action_plan).toBeDefined();
      expect(report.follow_up).toBeDefined();
    });

    it('应该生成用户友好的建议', () => {
      const technicalResults = {
        risk_factors: ['hypertension_stage_1', 'overweight_class_1'],
        metabolic_profile: {
          insulin_resistance: 'mild',
          lipid_profile: 'borderline_high',
        },
        nutritional_deficiencies: [
          'vitamin_d_insufficient',
          'omega_3_deficient',
        ],
      };

      const userFriendlyAdvice =
        healthAnalyzer.generateUserFriendlyAdvice(technicalResults);

      expect(userFriendlyAdvice).toBeDefined();
      expect(userFriendlyAdvice.explanation).not.toContain('stage_1');
      expect(userFriendlyAdvice.explanation).not.toContain(
        'insulin_resistance',
      );
      expect(userFriendlyAdvice.action_items).toContain(
        '增加户外活动以补充维生素D',
      );
      expect(userFriendlyAdvice.action_items).toContain(
        '增加富含Omega-3的食物',
      );
    });
  });

  describe('质量评估', () => {
    it('应该评估分析结果的可靠性', () => {
      const analysisResult = {
        data_completeness: 0.8,
        data_recency: 0.9,
        consistency_score: 0.85,
        confidence_level: 0.78,
      };

      const quality = healthAnalyzer.assessAnalysisQuality(analysisResult);

      expect(quality.overall_quality).toBeGreaterThan(0);
      expect(quality.overall_quality).toBeLessThanOrEqual(100);
      expect(quality.data_quality_score).toBe(0.85);
      expect(quality.reliability_level).toBe('good');
      expect(quality.limitations).toBeDefined();
      expect(quality.recommendations).toBeDefined();
    });

    it('应该识别数据质量问题和建议改进', () => {
      const poorQualityData = {
        blood_pressure: { value: null, last_measured: '2023-01-01' },
        weight: { value: 70, last_measured: '2024-10-30' },
        cholesterol: { value: undefined, last_measured: '2022-12-01' },
      };

      const qualityIssues =
        healthAnalyzer.identifyDataQualityIssues(poorQualityData);

      expect(qualityIssues.missing_data).toContain('blood_pressure');
      expect(qualityIssues.outdated_data).toContain('cholesterol');
      expect(qualityIssues.recommendations).toContain('建议测量血压');
      expect(qualityIssues.recommendations).toContain('建议检查血脂');
    });
  });
});
