# 故障恢复指南

本文档提供Health Butler系统的故障诊断和恢复流程。

## 目录

1. [概述](#概述)
2. [常见故障场景](#常见故障场景)
3. [故障诊断](#故障诊断)
4. [恢复流程](#恢复流程)
5. [数据恢复](#数据恢复)
6. [事后分析](#事后分析)

## 概述

本指南旨在帮助团队快速诊断和恢复系统故障，最小化服务中断时间。

### 故障级别

- **P0 - 紧急**: 系统完全不可用
- **P1 - 严重**: 核心功能不可用
- **P2 - 重要**: 部分功能不可用
- **P3 - 一般**: 性能下降或小功能问题

### 响应时间

| 级别 | 响应时间 | 解决时间目标 |
|-----|---------|------------|
| P0  | 立即    | < 1小时    |
| P1  | < 15分钟 | < 4小时    |
| P2  | < 1小时  | < 24小时   |
| P3  | < 4小时  | < 72小时   |

## 常见故障场景

### 1. 应用服务不可用

**症状**:
- API返回502/503错误
- 网站无法访问
- PM2显示应用停止

**快速检查**:
\`\`\`bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs health-butler --lines 100

# 检查端口占用
netstat -tlnp | grep 3000
\`\`\`

**恢复步骤**:
1. 尝试重启应用
   \`\`\`bash
   pm2 restart health-butler
   \`\`\`

2. 如果重启失败，检查错误日志
   \`\`\`bash
   pm2 logs health-butler --err --lines 200
   \`\`\`

3. 检查环境变量配置
   \`\`\`bash
   cat .env | grep -v "^#"
   \`\`\`

4. 如果配置有问题，修复后重启
   \`\`\`bash
   pm2 restart health-butler
   \`\`\`

5. 验证服务恢复
   \`\`\`bash
   curl http://localhost:3000/health
   \`\`\`

### 2. 数据库连接失败

**症状**:
- API返回500错误
- 日志显示"Cannot connect to database"
- Prisma连接错误

**快速检查**:
\`\`\`bash
# 检查数据库状态
sudo systemctl status postgresql

# 测试数据库连接
psql -h localhost -U postgres -d health_butler

# 检查连接数
SELECT count(*) FROM pg_stat_activity;
\`\`\`

**恢复步骤**:
1. 重启数据库服务
   \`\`\`bash
   sudo systemctl restart postgresql
   \`\`\`

2. 检查数据库日志
   \`\`\`bash
   sudo tail -100 /var/log/postgresql/postgresql-14-main.log
   \`\`\`

3. 如果是连接池耗尽，重启应用
   \`\`\`bash
   pm2 restart health-butler
   \`\`\`

4. 验证连接恢复
   \`\`\`bash
   npx prisma db execute --stdin < test-query.sql
   \`\`\`

### 3. 内存溢出

**症状**:
- 应用频繁重启
- 日志显示"JavaScript heap out of memory"
- 系统内存使用率 > 90%

**快速检查**:
\`\`\`bash
# 检查内存使用
free -h

# 检查进程内存
pm2 monit

# 查看Node.js堆内存
node --max-old-space-size=8192 -e "console.log(v8.getHeapStatistics())"
\`\`\`

**恢复步骤**:
1. 临时增加Node.js内存限制
   \`\`\`bash
   pm2 delete health-butler
   pm2 start npm --name health-butler --node-args="--max-old-space-size=4096" -- start
   \`\`\`

2. 清理缓存
   \`\`\`bash
   # 清理Redis缓存
   redis-cli FLUSHALL
   
   # 清理应用缓存
   rm -rf .next/cache
   \`\`\`

3. 重启应用
   \`\`\`bash
   pm2 restart health-butler
   \`\`\`

4. 监控内存使用
   \`\`\`bash
   pm2 monit
   \`\`\`

### 4. 性能下降

**症状**:
- API响应时间 > 2秒
- 用户报告页面加载缓慢
- CPU使用率 > 80%

**快速检查**:
\`\`\`bash
# 检查系统负载
top

# 检查慢查询
# 在数据库中执行
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# 检查API响应时间
curl -w "@curl-format.txt" -o /dev/null -s https://api.healthbutler.com/health
\`\`\`

**恢复步骤**:
1. 识别慢查询并优化
2. 检查是否有死锁
   \`\`\`sql
   SELECT * FROM pg_locks WHERE NOT granted;
   \`\`\`

3. 重启应用清理连接
   \`\`\`bash
   pm2 restart health-butler
   \`\`\`

4. 启用查询缓存
5. 考虑扩容服务器

### 5. 数据丢失或损坏

**症状**:
- 用户报告数据丢失
- 查询返回意外结果
- 数据完整性约束失败

**快速检查**:
\`\`\`bash
# 检查数据库完整性
# 在数据库中执行
SELECT * FROM pg_stat_database;

# 检查事务日志
SELECT * FROM pg_stat_activity WHERE state != 'idle';

# 检查备份状态
ls -lh /var/backups/health_butler/
\`\`\`

**恢复步骤**:
1. 立即停止相关操作
2. 评估损坏范围
3. 从最近的备份恢复（见数据恢复章节）
4. 验证数据完整性
5. 重新运行失败的操作

## 故障诊断

### 诊断流程

1. **收集信息**
   - 故障时间
   - 受影响功能
   - 错误消息
   - 用户反馈

2. **检查日志**
   \`\`\`bash
   # 应用日志
   pm2 logs health-butler --lines 500
   
   # 数据库日志
   sudo tail -500 /var/log/postgresql/postgresql-14-main.log
   
   # 系统日志
   sudo journalctl -u health-butler -n 500
   \`\`\`

3. **检查监控指标**
   - CPU使用率
   - 内存使用率
   - 磁盘使用率
   - 网络流量
   - 数据库连接数

4. **复现问题**
   - 尝试重现故障
   - 记录复现步骤
   - 收集复现数据

### 诊断工具

\`\`\`bash
# 健康检查
curl https://api.healthbutler.com/health

# 数据库诊断
npx prisma validate

# 依赖检查
npm audit

# 性能分析
node --prof app.js
node --prof-process isolate-*.log
\`\`\`

## 恢复流程

### 标准恢复流程

1. **评估影响**
   - 确定故障级别
   - 识别受影响用户
   - 评估数据风险

2. **隔离问题**
   - 停止问题服务
   - 切换到备用服务
   - 启用维护模式

3. **执行修复**
   - 应用修复方案
   - 测试修复结果
   - 监控系统状态

4. **验证恢复**
   - 运行健康检查
   - 测试关键功能
   - 验证数据完整性

5. **恢复服务**
   - 逐步恢复流量
   - 监控错误率
   - 确认用户反馈

### 紧急回滚

如果修复失败，立即回滚：

\`\`\`bash
# 1. 回滚代码
git checkout <last-stable-tag>
npm ci
npm run build

# 2. 回滚数据库（如需要）
npx prisma migrate resolve --rolled-back <migration>

# 3. 重启服务
pm2 restart health-butler

# 4. 验证恢复
curl https://api.healthbutler.com/health
\`\`\`

## 数据恢复

### 备份策略

- **全量备份**: 每日凌晨3点
- **增量备份**: 每4小时
- **备份保留**: 30天
- **异地备份**: 是

### 从备份恢复

#### 1. 数据库恢复

\`\`\`bash
# 列出可用备份
ls -lh /var/backups/health_butler/

# 停止应用
pm2 stop health-butler

# 恢复数据库
pg_restore -d health_butler -c /var/backups/health_butler/backup_20250102.dump

# 验证恢复
psql -d health_butler -c "SELECT count(*) FROM users;"

# 重启应用
pm2 restart health-butler
\`\`\`

#### 2. 文件恢复

\`\`\`bash
# 恢复上传文件
rsync -av /var/backups/health_butler/uploads/ /app/uploads/

# 恢复配置文件
cp /var/backups/health_butler/.env /app/.env

# 重启应用
pm2 restart health-butler
\`\`\`

#### 3. 时间点恢复

使用WAL日志恢复到特定时间点：

\`\`\`bash
# 配置恢复目标时间
cat > recovery.conf << EOF
restore_command = 'cp /var/backups/wal/%f %p'
recovery_target_time = '2025-01-02 10:30:00'
EOF

# 重启PostgreSQL
sudo systemctl restart postgresql

# 验证恢复点
psql -d health_butler -c "SELECT now();"
\`\`\`

### 数据验证

恢复后必须验证数据完整性：

\`\`\`sql
-- 检查用户数
SELECT count(*) FROM users;

-- 检查最近的数据
SELECT * FROM health_data 
ORDER BY created_at DESC 
LIMIT 10;

-- 检查数据完整性
SELECT table_name, 
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) 
FROM information_schema.tables 
WHERE table_schema = 'public';
\`\`\`

## 事后分析

### 事故报告

每个P0/P1故障都需要事故报告，包括：

1. **事故概述**
   - 发生时间
   - 持续时间
   - 影响范围
   - 严重程度

2. **根因分析**
   - 直接原因
   - 根本原因
   - 触发因素
   - 时间线

3. **影响评估**
   - 用户影响
   - 数据影响
   - 业务影响
   - 声誉影响

4. **响应和恢复**
   - 检测时间
   - 响应时间
   - 恢复时间
   - 采取的措施

5. **改进措施**
   - 短期措施
   - 长期措施
   - 预防措施
   - 责任人和期限

### 预防措施

从故障中学习，实施预防措施：

- [ ] 更新监控告警规则
- [ ] 改进测试覆盖率
- [ ] 加强代码审查
- [ ] 优化系统架构
- [ ] 改进部署流程
- [ ] 更新文档
- [ ] 团队培训

## 应急联系方式

### 关键人员

**运维团队**
- 值班工程师: ops-oncall@healthbutler.com
- 运维主管: ops-manager@healthbutler.com
- 24/7热线: +86-xxx-xxxx

**开发团队**
- 技术负责人: tech-lead@healthbutler.com
- 后端负责人: backend-lead@healthbutler.com
- 前端负责人: frontend-lead@healthbutler.com

**数据库团队**
- DBA: dba@healthbutler.com
- 数据主管: data-manager@healthbutler.com

### 升级路径

1. **值班工程师** (0-15分钟)
2. **团队负责人** (15-30分钟)
3. **技术总监** (30-60分钟)
4. **CTO** (>1小时或P0故障)

## 故障演练

定期进行故障演练：

- **频率**: 每季度一次
- **类型**: 数据库故障、应用故障、网络故障
- **参与者**: 运维、开发、测试团队
- **目标**: 验证恢复流程、提升响应能力

### 演练检查清单

- [ ] 故障场景设计
- [ ] 参与人员通知
- [ ] 演练时间安排
- [ ] 恢复流程文档
- [ ] 演练执行
- [ ] 结果评估
- [ ] 改进建议
- [ ] 文档更新

## 相关文档

- [API安全指南](../security/API_SECURITY_GUIDE.md)
- [性能优化文档](../performance/PERFORMANCE_OPTIMIZATION.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- [权限管理文档](../security/PERMISSION_MANAGEMENT.md)
