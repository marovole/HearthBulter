import type {
  RecipeRepository,
  RecipeFavoriteDTO,
  RecipeRatingDTO,
  GetFavoritesQuery,
  FavoritesResult,
  AddFavoriteInput,
  AddOrUpdateRatingInput,
} from '@/lib/repositories/interfaces/recipe-repository';

/**
 * Prisma Recipe Repository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 */
export class PrismaRecipeRepository implements RecipeRepository {
  async getFavoritesByMember(_query: GetFavoritesQuery): Promise<FavoritesResult> {
    throw new Error('PrismaRecipeRepository.getFavoritesByMember not implemented');
  }

  async addFavorite(_input: AddFavoriteInput): Promise<RecipeFavoriteDTO> {
    throw new Error('PrismaRecipeRepository.addFavorite not implemented');
  }

  async removeFavorite(_recipeId: string, _memberId: string): Promise<void> {
    throw new Error('PrismaRecipeRepository.removeFavorite not implemented');
  }

  async checkFavoriteStatus(_recipeId: string, _memberId: string): Promise<RecipeFavoriteDTO | null> {
    throw new Error('PrismaRecipeRepository.checkFavoriteStatus not implemented');
  }

  async addOrUpdateRating(_input: AddOrUpdateRatingInput): Promise<RecipeRatingDTO> {
    throw new Error('PrismaRecipeRepository.addOrUpdateRating not implemented');
  }

  async getRating(_recipeId: string, _memberId: string): Promise<RecipeRatingDTO | null> {
    throw new Error('PrismaRecipeRepository.getRating not implemented');
  }

  async recipeExists(_recipeId: string): Promise<boolean> {
    throw new Error('PrismaRecipeRepository.recipeExists not implemented');
  }
}
