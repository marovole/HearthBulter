## ADDED Requirements
### Requirement: Recommendation Schema Synchronization
系统必须确保推荐引擎所需的数据模型在数据库中完成迁移与验证。

#### Scenario: 迁移执行
- **WHEN** 部署或更新推荐引擎
- **THEN** 应执行 `prisma migrate deploy` 或等效命令以创建/更新相关数据表

#### Scenario: 结构校验
- **WHEN** 迁移执行完成
- **THEN** 应校验数据库中已存在 RecipeRating、RecipeFavorite、UserPreference、RecipeView、IngredientSubstitution 等表及索引

#### Scenario: 失败回滚
- **WHEN** 迁移执行失败
- **THEN** 应提供恢复或重新执行指引，避免数据库处于不一致状态
