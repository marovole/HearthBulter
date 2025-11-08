#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 从 Neon PostgreSQL 迁移数据到 Supabase
 * 
 * 使用方法:
 * node scripts/migrate-to-supabase.js
 * 
 * 环境变量要求:
 * - DATABASE_URL: 源数据库 (Neon PostgreSQL) 连接字符串
 * - SUPABASE_URL: 目标 Supabase 项目 URL
 * - SUPABASE_SERVICE_KEY: Supabase 服务密钥
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

class DatabaseMigrator {
  constructor() {
    this.sourceDb = new PrismaClient();
    this.targetSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
    
    this.migrationLog = [];
    this.errors = [];
    this.stats = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      startTime: new Date(),
      endTime: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    console.log(logEntry);
    this.migrationLog.push(logEntry);
    
    if (type === 'error') {
      this.errors.push(message);
    }
  }

  async migrate() {
    try {
      this.log('开始数据库迁移过程...', 'info');
      
      // 1. 验证连接
      await this.validateConnections();
      
      // 2. 备份数据
      await this.backupData();
      
      // 3. 迁移用户数据
      await this.migrateUsers();
      
      // 4. 迁移家庭数据
      await this.migrateFamilies();
      
      // 5. 迁移健康数据
      await this.migrateHealthData();
      
      // 6. 迁移食物数据
      await this.migrateFoods();
      
      // 7. 迁移饮食记录
      await this.migrateMealRecords();
      
      // 8. 迁移食谱数据
      await this.migrateRecipes();
      
      // 9. 迁移库存数据
      await this.migrateInventory();
      
      // 10. 迁移购物清单
      await this.migrateShoppingLists();
      
      // 11. 生成迁移报告
      await this.generateReport();
      
      this.stats.endTime = new Date();
      
      this.log(`迁移完成！总耗时: ${(this.stats.endTime - this.stats.startTime) / 1000}秒`, 'success');
      this.log(`成功记录: ${this.stats.successfulRecords}/${this.stats.totalRecords}`, 'success');
      
      if (this.stats.failedRecords > 0) {
        this.log(`失败记录: ${this.stats.failedRecords}`, 'warning');
      }
      
    } catch (error) {
      this.log(`迁移过程失败: ${error.message}`, 'error');
      console.error(error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async validateConnections() {
    this.log('验证数据库连接...', 'info');
    
    try {
      // 验证源数据库连接
      await this.sourceDb.$queryRaw`SELECT 1`;
      this.log('源数据库连接成功', 'success');
      
      // 验证目标 Supabase 连接
      const { error } = await this.targetSupabase.rpc('test_connection');
      if (error) throw new Error(`Supabase 连接失败: ${error.message}`);
      this.log('目标 Supabase 连接成功', 'success');
      
    } catch (error) {
      this.log(`连接验证失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async backupData() {
    this.log('创建数据备份...', 'info');
    
    try {
      const backupDir = path.join(__dirname, '..', 'backups', `migration_${Date.now()}`);
      await fs.mkdir(backupDir, { recursive: true });
      
      // 备份用户数据
      const users = await this.sourceDb.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      await fs.writeFile(
        path.join(backupDir, 'users.json'),
        JSON.stringify(users, null, 2)
      );
      
      this.log(`用户数据备份完成: ${users.length} 条记录`, 'success');
      
      // 可以添加更多数据表的备份...
      
    } catch (error) {
      this.log(`备份失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateUsers() {
    this.log('开始迁移用户数据...', 'info');
    
    try {
      const users = await this.sourceDb.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      this.stats.totalRecords += users.length;
      
      for (const user of users) {
        try {
          // 迁移到 Supabase users 表
          const { error: userError } = await this.targetSupabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              name: user.name || user.email.split('@')[0],
              avatar_url: user.image,
              created_at: user.createdAt,
              updated_at: user.updatedAt
            });
          
          if (userError) {
            this.log(`用户 ${user.email} 迁移失败: ${userError.message}`, 'error');
            this.stats.failedRecords++;
            continue;
          }
          
          // 迁移用户偏好
          const preferences = await this.sourceDb.userPreference.findUnique({
            where: { userId: user.id }
          });
          
          if (preferences) {
            const { error: prefError } = await this.targetSupabase
              .from('user_preferences')
              .insert({
                member_id: user.id,
                // 转换偏好设置...
                created_at: preferences.createdAt,
                updated_at: preferences.updatedAt
              });
            
            if (prefError) {
              this.log(`用户偏好 ${user.email} 迁移失败: ${prefError.message}`, 'warning');
            }
          }
          
          this.stats.successfulRecords++;
          this.log(`用户 ${user.email} 迁移成功`, 'success');
          
        } catch (error) {
          this.log(`用户迁移失败: ${error.message}`, 'error');
          this.stats.failedRecords++;
        }
      }
      
    } catch (error) {
      this.log(`用户数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateFamilies() {
    this.log('开始迁移家庭数据...', 'info');
    
    try {
      const families = await this.sourceDb.family.findMany({
        include: {
          members: true,
          creator: true
        }
      });
      
      this.stats.totalRecords += families.length;
      
      for (const family of families) {
        try {
          // 生成邀请码
          const inviteCode = this.generateInviteCode();
          
          // 迁移家庭组
          const { error: familyError } = await this.targetSupabase
            .from('families')
            .insert({
              id: family.id,
              name: family.name,
              invite_code: inviteCode,
              creator_id: family.creatorId,
              created_at: family.createdAt,
              updated_at: family.updatedAt
            });
          
          if (familyError) {
            this.log(`家庭 ${family.name} 迁移失败: ${familyError.message}`, 'error');
            this.stats.failedRecords++;
            continue;
          }
          
          // 迁移家庭成员
          for (const member of family.members) {
            const { error: memberError } = await this.targetSupabase
              .from('family_members')
              .insert({
                id: member.id,
                family_id: member.familyId,
                user_id: member.userId,
                name: member.name,
                role: member.role,
                relationship: member.relationship,
                date_of_birth: member.dateOfBirth,
                gender: member.gender,
                height: member.height,
                activity_level: member.activityLevel,
                dietary_restrictions: JSON.stringify(member.dietaryRestrictions || []),
                health_goals: JSON.stringify(member.healthGoals || []),
                allergen_avoidance: JSON.stringify(member.allergenAvoidance || []),
                calorie_target: member.calorieTarget,
                macro_targets: JSON.stringify(member.macroTargets || {}),
                joined_at: member.joinedAt,
                created_at: member.createdAt,
                updated_at: member.updatedAt,
                deleted_at: member.deletedAt
              });
            
            if (memberError) {
              this.log(`家庭成员 ${member.name} 迁移失败: ${memberError.message}`, 'warning');
            }
          }
          
          this.stats.successfulRecords++;
          this.log(`家庭 ${family.name} 迁移成功`, 'success');
          
        } catch (error) {
          this.log(`家庭数据迁移失败: ${error.message}`, 'error');
          this.stats.failedRecords++;
        }
      }
      
    } catch (error) {
      this.log(`家庭数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateHealthData() {
    this.log('开始迁移健康数据...', 'info');
    
    try {
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const healthData = await this.sourceDb.healthData.findMany({
          skip: offset,
          take: batchSize,
          select: {
            id: true,
            memberId: true,
            dataType: true,
            value: true,
            unit: true,
            metadata: true,
            recordedAt: true,
            createdAt: true,
            updatedAt: true
          }
        });
        
        if (healthData.length === 0) {
          hasMore = false;
          break;
        }
        
        this.stats.totalRecords += healthData.length;
        
        for (const record of healthData) {
          try {
            const { error } = await this.targetSupabase
              .from('health_data')
              .insert({
                id: record.id,
                member_id: record.memberId,
                user_id: record.memberId, // 假设 memberId 就是 userId
                data_type: record.dataType,
                value: record.value,
                unit: record.unit,
                metadata: record.metadata ? JSON.stringify(record.metadata) : '{}',
                recorded_at: record.recordedAt,
                created_at: record.createdAt,
                updated_at: record.updatedAt
              });
            
            if (error) {
              this.log(`健康数据 ${record.id} 迁移失败: ${error.message}`, 'warning');
              this.stats.failedRecords++;
            } else {
              this.stats.successfulRecords++;
            }
            
          } catch (error) {
            this.log(`健康数据迁移失败: ${error.message}`, 'error');
            this.stats.failedRecords++;
          }
        }
        
        offset += batchSize;
        this.log(`已处理 ${offset} 条健康数据记录`, 'info');
      }
      
    } catch (error) {
      this.log(`健康数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateFoods() {
    this.log('开始迁移食物数据...', 'info');
    
    try {
      const foods = await this.sourceDb.food.findMany({
        select: {
          id: true,
          name: true,
          nameEn: true,
          aliases: true,
          description: true,
          category: true,
          tags: true,
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          fiber: true,
          sugar: true,
          sodium: true,
          vitaminA: true,
          vitaminC: true,
          calcium: true,
          iron: true,
          servingSize: true,
          servingUnit: true,
          source: true,
          usdaId: true,
          verified: true,
          createdBy: true,
          cachedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      this.stats.totalRecords += foods.length;
      
      for (const food of foods) {
        try {
          const { error } = await this.targetSupabase
            .from('foods')
            .insert({
              id: food.id,
              name: food.name,
              name_en: food.nameEn,
              aliases: JSON.stringify(food.aliases || []),
              description: food.description,
              category: food.category,
              tags: JSON.stringify(food.tags || []),
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              fiber: food.fiber,
              sugar: food.sugar,
              sodium: food.sodium,
              vitamin_a: food.vitaminA,
              vitamin_c: food.vitaminC,
              calcium: food.calcium,
              iron: food.iron,
              serving_size: food.servingSize,
              serving_unit: food.servingUnit,
              source: food.source,
              usda_id: food.usdaId,
              verified: food.verified,
              created_by: food.createdBy,
              cached_at: food.cachedAt,
              created_at: food.createdAt,
              updated_at: food.updatedAt
            });
          
          if (error) {
            this.log(`食物 ${food.name} 迁移失败: ${error.message}`, 'warning');
            this.stats.failedRecords++;
          } else {
            this.stats.successfulRecords++;
          }
          
        } catch (error) {
          this.log(`食物数据迁移失败: ${error.message}`, 'error');
          this.stats.failedRecords++;
        }
      }
      
    } catch (error) {
      this.log(`食物数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateMealRecords() {
    this.log('开始迁移饮食记录...', 'info');
    
    try {
      const batchSize = 500;
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const mealRecords = await this.sourceDb.mealRecord.findMany({
          skip: offset,
          take: batchSize,
          include: {
            foods: true
          }
        });
        
        if (mealRecords.length === 0) {
          hasMore = false;
          break;
        }
        
        this.stats.totalRecords += mealRecords.length;
        
        for (const record of mealRecords) {
          try {
            const { error } = await this.targetSupabase
              .from('meal_records')
              .insert({
                id: record.id,
                member_id: record.memberId,
                user_id: record.memberId, // 假设 memberId 就是 userId
                meal_type: record.mealType,
                foods: JSON.stringify(record.foods.map(food => ({
                  food_id: food.foodId,
                  quantity: food.quantity,
                  unit: food.unit
                }))),
                total_calories: record.totalCalories,
                total_protein: record.totalProtein,
                total_carbs: record.totalCarbs,
                total_fat: record.totalFat,
                total_fiber: record.totalFiber,
                total_sugar: record.totalSugar,
                total_sodium: record.totalSodium,
                notes: record.notes,
                photo_urls: JSON.stringify(record.photoUrls || []),
                location: record.location,
                mood: record.mood,
                hunger_level: record.hungerLevel,
                satisfaction_level: record.satisfactionLevel,
                recorded_at: record.recordedAt,
                created_at: record.createdAt,
                updated_at: record.updatedAt
              });
            
            if (error) {
              this.log(`饮食记录 ${record.id} 迁移失败: ${error.message}`, 'warning');
              this.stats.failedRecords++;
            } else {
              this.stats.successfulRecords++;
            }
            
          } catch (error) {
            this.log(`饮食记录迁移失败: ${error.message}`, 'error');
            this.stats.failedRecords++;
          }
        }
        
        offset += batchSize;
        this.log(`已处理 ${offset} 条饮食记录`, 'info');
      }
      
    } catch (error) {
      this.log(`饮食记录迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateRecipes() {
    this.log('开始迁移食谱数据...', 'info');
    
    try {
      const recipes = await this.sourceDb.recipe.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          ingredients: true,
          instructions: true,
          nutritionInfo: true,
          prepTime: true,
          cookTime: true,
          servings: true,
          difficulty: true,
          tags: true,
          category: true,
          cuisine: true,
          imageUrls: true,
          videoUrl: true,
          source: true,
          createdBy: true,
          isPublic: true,
          rating: true,
          ratingCount: true,
          viewCount: true,
          favoriteCount: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      this.stats.totalRecords += recipes.length;
      
      for (const recipe of recipes) {
        try {
          const { error } = await this.targetSupabase
            .from('recipes')
            .insert({
              id: recipe.id,
              name: recipe.name,
              description: recipe.description,
              ingredients: JSON.stringify(recipe.ingredients),
              instructions: JSON.stringify(recipe.instructions),
              nutrition_info: recipe.nutritionInfo ? JSON.stringify(recipe.nutritionInfo) : null,
              prep_time: recipe.prepTime,
              cook_time: recipe.cookTime,
              servings: recipe.servings,
              difficulty: recipe.difficulty,
              tags: JSON.stringify(recipe.tags || []),
              category: recipe.category,
              cuisine: recipe.cuisine,
              image_urls: JSON.stringify(recipe.imageUrls || []),
              video_url: recipe.videoUrl,
              source: recipe.source,
              created_by: recipe.createdBy,
              is_public: recipe.isPublic,
              rating: recipe.rating,
              rating_count: recipe.ratingCount,
              view_count: recipe.viewCount,
              favorite_count: recipe.favoriteCount,
              created_at: recipe.createdAt,
              updated_at: recipe.updatedAt
            });
          
          if (error) {
            this.log(`食谱 ${recipe.name} 迁移失败: ${error.message}`, 'warning');
            this.stats.failedRecords++;
          } else {
            this.stats.successfulRecords++;
          }
          
        } catch (error) {
          this.log(`食谱数据迁移失败: ${error.message}`, 'error');
          this.stats.failedRecords++;
        }
      }
      
    } catch (error) {
      this.log(`食谱数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateInventory() {
    this.log('开始迁移库存数据...', 'info');
    
    try {
      const inventoryItems = await this.sourceDb.inventoryItem.findMany({
        select: {
          id: true,
          familyId: true,
          foodId: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          brand: true,
          location: true,
          purchaseDate: true,
          expiryDate: true,
          minStock: true,
          cost: true,
          currency: true,
          status: true,
          isLowStock: true,
          daysToExpiry: true,
          photoUrl: true,
          notes: true,
          barcode: true,
          addedBy: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        }
      });
      
      this.stats.totalRecords += inventoryItems.length;
      
      for (const item of inventoryItems) {
        try {
          const { error } = await this.targetSupabase
            .from('inventory_items')
            .insert({
              id: item.id,
              family_id: item.familyId,
              food_id: item.foodId,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              brand: item.brand,
              location: item.location,
              purchase_date: item.purchaseDate,
              expiry_date: item.expiryDate,
              min_stock: item.minStock,
              cost: item.cost,
              currency: item.currency,
              status: item.status,
              is_low_stock: item.isLowStock,
              days_to_expiry: item.daysToExpiry,
              photo_url: item.photoUrl,
              notes: item.notes,
              barcode: item.barcode,
              added_by: item.addedBy,
              created_at: item.createdAt,
              updated_at: item.updatedAt,
              deleted_at: item.deletedAt
            });
          
          if (error) {
            this.log(`库存项 ${item.name} 迁移失败: ${error.message}`, 'warning');
            this.stats.failedRecords++;
          } else {
            this.stats.successfulRecords++;
          }
          
        } catch (error) {
          this.log(`库存数据迁移失败: ${error.message}`, 'error');
          this.stats.failedRecords++;
        }
      }
      
    } catch (error) {
      this.log(`库存数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateShoppingLists() {
    this.log('开始迁移购物清单数据...', 'info');
    
    try {
      const shoppingLists = await this.sourceDb.shoppingList.findMany({
        select: {
          id: true,
          familyId: true,
          name: true,
          description: true,
          items: true,
          totalEstimatedCost: true,
          status: true,
          priority: true,
          dueDate: true,
          assignedTo: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true
        }
      });
      
      this.stats.totalRecords += shoppingLists.length;
      
      for (const list of shoppingLists) {
        try {
          const { error } = await this.targetSupabase
            .from('shopping_lists')
            .insert({
              id: list.id,
              family_id: list.familyId,
              name: list.name,
              description: list.description,
              items: JSON.stringify(list.items || []),
              total_estimated_cost: list.totalEstimatedCost,
              status: list.status,
              priority: list.priority,
              due_date: list.dueDate,
              assigned_to: list.assignedTo,
              created_by: list.createdBy,
              created_at: list.createdAt,
              updated_at: list.updatedAt,
              completed_at: list.completedAt
            });
          
          if (error) {
            this.log(`购物清单 ${list.name} 迁移失败: ${error.message}`, 'warning');
            this.stats.failedRecords++;
          } else {
            this.stats.successfulRecords++;
          }
          
        } catch (error) {
          this.log(`购物清单数据迁移失败: ${error.message}`, 'error');
          this.stats.failedRecords++;
        }
      }
      
    } catch (error) {
      this.log(`购物清单数据迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async generateReport() {
    this.log('生成迁移报告...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.stats.endTime - this.stats.startTime,
      statistics: this.stats,
      errors: this.errors,
      recommendations: [
        '验证所有迁移数据的完整性',
        '测试关键功能是否正常工作',
        '检查用户认证流程',
        '验证数据关联关系',
        '进行性能测试'
      ]
    };
    
    const reportPath = path.join(__dirname, '..', 'reports', `migration_report_${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`迁移报告已生成: ${reportPath}`, 'success');
  }

  async cleanup() {
    try {
      await this.sourceDb.$disconnect();
      await this.targetSupabase.auth.signOut();
      
      // 保存迁移日志
      const logPath = path.join(__dirname, '..', 'logs', `migration_${Date.now()}.log`);
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, this.migrationLog.join('\n'));
      
      this.log(`迁移日志已保存: ${logPath}`, 'info');
      
    } catch (error) {
      this.log(`清理过程失败: ${error.message}`, 'warning');
    }
  }
}

// 主函数
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;
