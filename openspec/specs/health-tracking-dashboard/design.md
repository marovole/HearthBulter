# Health Tracking Dashboard - Technical Design

## Chart Library

**Recharts** (React图表库):
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function WeightTrendChart({ data }: { data: HealthData[] }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="measuredAt" />
      <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
      <Tooltip />
      <Line type="monotone" dataKey="weight" stroke="#8884d8" />
    </LineChart>
  );
}
```

## Health Score Calculation

```typescript
function calculateHealthScore(member: FamilyMember, recentData: HealthData[]) {
  let score = 0;

  // 1. BMI评分（30分）
  const bmi = calculateBMI(member.height, member.weight);
  if (bmi >= 18.5 && bmi <= 24.9) score += 30;
  else if (bmi >= 25 && bmi <= 29.9) score += 20;
  else score += 10;

  // 2. 营养达标率（30分）
  const nutritionScore = calculateNutritionAdherence(member);
  score += nutritionScore * 30;

  // 3. 运动频率（20分）
  const activityScore = calculateActivityScore(recentData);
  score += activityScore * 20;

  // 4. 数据完整性（20分）
  const completeness = recentData.length / 30; // 30天内记录天数
  score += completeness * 20;

  return Math.round(score);
}
```

## Dashboard API

```
GET /api/dashboard/overview          # 仪表盘概览
GET /api/dashboard/weight-trend      # 体重趋势
GET /api/dashboard/nutrition-analysis # 营养分析
GET /api/dashboard/health-score      # 健康评分
GET /api/dashboard/weekly-report     # 周报
```

**最后更新**: 2025-10-29
