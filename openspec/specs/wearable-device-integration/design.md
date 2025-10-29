# Wearable Device Integration - Technical Design

## SDK Integration

**Apple HealthKit** (iOS):
```typescript
import HealthKit from 'react-native-health';

async function syncAppleHealth() {
  const permissions = {
    permissions: {
      read: [HealthKit.Constants.Permissions.Steps, HealthKit.Constants.Permissions.HeartRate],
    }
  };

  await HealthKit.initHealthKit(permissions);
  const steps = await HealthKit.getDailyStepCountSamples({ startDate: yesterday });

  return steps;
}
```

**Huawei Health SDK** (Android):
```typescript
import { HmsHealthKit } from '@hmscore/react-native-hms-health';

async function syncHuaweiHealth() {
  await HmsHealthKit.signIn();
  const data = await HmsHealthKit.readDailySummation(DataType.SLEEP);

  return data;
}
```

## Data Deduplication

```typescript
async function deduplicateHealthData(newData: HealthDataInput) {
  const existing = await prisma.healthData.findFirst({
    where: {
      memberId: newData.memberId,
      measuredAt: {
        gte: subHours(newData.measuredAt, 1),
        lte: addHours(newData.measuredAt, 1)
      }
    }
  });

  if (existing && existing.source === 'WEARABLE') {
    return existing; // 设备数据优先
  }

  return prisma.healthData.create({ data: newData });
}
```

**最后更新**: 2025-10-29
