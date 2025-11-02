# Proposal: Add Wearable Device Sync

## Why

可穿戴设备（Apple Watch、华为手环等）能自动记录运动量、睡眠、心率等数据，减少用户手动录入负担。对接设备SDK可大幅提升用户体验和数据完整性。

## What Changes

- 对接Apple HealthKit SDK（iOS）
- 对接华为Health SDK（Android）
- 实现自动数据同步机制
- 添加设备连接管理
- 实现数据去重策略（避免与手动录入冲突）

## Impact

**Affected Specs**:
- `wearable-device-integration` (NEW)

**Affected Code**:
- `src/lib/services/healthkit-service.ts` - Apple HealthKit集成
- `src/lib/services/huawei-health-service.ts` - 华为Health集成
- `src/lib/services/data-deduplication.ts` - 数据去重
- `src/app/api/devices/**` - 设备管理API

**Breaking Changes**: 无

**Dependencies**:
- react-native-health (Apple HealthKit)
- @hmscore/react-native-hms-health (华为Health)

**Estimated Effort**: 5天开发 + 2天测试（需iOS/Android设备）
