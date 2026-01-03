## ADDED Requirements

### Requirement: 禁止魔法数字

业务逻辑代码 SHALL NOT 包含未命名的数字常量（魔法数字）。

#### Scenario: 数字常量定义
- **WHEN** 代码中需要使用数字常量
- **THEN** 应定义为命名常量
- **AND** 常量名应使用 UPPER_SNAKE_CASE 格式
- **AND** 常量应包含 JSDoc 注释说明用途

#### Scenario: 算法阈值常量
- **WHEN** 算法需要判断阈值
- **THEN** 阈值应定义在 `lib/constants/algorithm.ts`
- **AND** 常量名应描述其业务含义（如 `TREND_STABLE_THRESHOLD`）
- **AND** 注释应说明阈值的选择依据

#### Scenario: 业务配置常量
- **WHEN** 业务逻辑需要配置值
- **THEN** 配置应定义在对应的常量文件中
- **AND** 考虑未来是否需要改为环境变量或数据库配置
- **AND** 相关常量应分组在同一文件中

### Requirement: 常量文件组织

常量 SHALL 按功能域组织在 `lib/constants/` 目录下。

#### Scenario: 常量文件结构
- **WHEN** 添加新常量
- **THEN** 应放入对应功能域的常量文件
- **AND** 若文件不存在应新建
- **AND** 所有常量文件应通过 `index.ts` 统一导出

#### Scenario: 常量命名规范
- **WHEN** 命名常量
- **THEN** 应使用 UPPER_SNAKE_CASE 格式
- **AND** 名称应包含功能前缀（如 `BUDGET_`、`TREND_`）
- **AND** 名称应自解释，避免缩写
