# Health Data Collection - Technical Design

## Data Models

```prisma
model HealthData {
  id        String   @id @default(cuid())
  memberId  String

  // 健康指标
  weight    Float?   // kg
  bodyFat   Float?   // %
  muscleMass Float?  // kg
  bloodPressureSystolic  Int? // 收缩压 mmHg
  bloodPressureDiastolic Int? // 舒张压 mmHg
  heartRate Int?     // bpm

  // 元数据
  measuredAt DateTime @default(now())
  source     DataSource @default(MANUAL)
  notes      String?

  createdAt  DateTime @default(now())

  member FamilyMember @relation(fields: [memberId], references: [id])

  @@map("health_data")
  @@index([memberId, measuredAt])
}

enum DataSource {
  MANUAL          // 手动录入
  WEARABLE        // 可穿戴设备
  MEDICAL_REPORT  // 体检报告
}
```

## API Design

```
GET    /api/members/:memberId/health-data     # 查询历史数据
POST   /api/members/:memberId/health-data     # 录入新数据
GET    /api/members/:memberId/health-data/trends # 趋势分析
DELETE /api/members/:memberId/health-data/:id # 删除错误记录
```

## Validation Service

```typescript
function validateHealthData(data: HealthDataInput): ValidationResult {
  const errors: string[] = []

  if (data.weight && (data.weight < 20 || data.weight > 300)) {
    errors.push('体重超出合理范围（20-300kg）')
  }

  if (data.bodyFat && (data.bodyFat < 3 || data.bodyFat > 50)) {
    errors.push('体脂率超出合理范围（3-50%）')
  }

  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
    if (data.bloodPressureSystolic < data.bloodPressureDiastolic) {
      errors.push('收缩压不应低于舒张压')
    }
  }

  return { valid: errors.length === 0, errors }
}
```

## Anomaly Detection

```typescript
async function detectAnomaly(memberId: string, newData: HealthDataInput) {
  const lastRecord = await prisma.healthData.findFirst({
    where: { memberId },
    orderBy: { measuredAt: 'desc' }
  })

  if (!lastRecord) return false

  // 检测体重异常变化（>5kg/天）
  if (newData.weight && lastRecord.weight) {
    const daysDiff = differenceInDays(new Date(), lastRecord.measuredAt)
    const weightChange = Math.abs(newData.weight - lastRecord.weight)

    if (weightChange / daysDiff > 5) {
      return {
        isAnomaly: true,
        message: `体重变化异常：${weightChange.toFixed(1)}kg，请确认数据准确性`
      }
    }
  }

  return false
}
```

**最后更新**: 2025-10-29
