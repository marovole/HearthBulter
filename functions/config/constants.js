export const HEALTH_DATA_TYPES = [
  'weight', 'blood_pressure', 'blood_sugar', 'heart_rate', 
  'temperature', 'steps', 'sleep', 'calories', 'water'
]

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

export const RECIPE_DIFFICULTIES = ['easy', 'medium', 'hard']

export const DIETARY_RESTRICTIONS = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 
  'soy_free', 'egg_free', 'shellfish_free', 'fish_free'
]

export const HEALTH_GOALS = [
  'weight_loss', 'weight_gain', 'muscle_gain', 'maintenance', 
  'energy_boost', 'digestive_health', 'heart_health', 'diabetes_management'
]

export const CUISINE_TYPES = [
  'chinese', 'italian', 'japanese', 'mexican', 'indian', 'thai', 
  'french', 'mediterranean', 'korean', 'vietnamese', 'american'
]

export const ALLERGENS = [
  'nuts', 'dairy', 'eggs', 'shellfish', 'fish', 'soy', 'wheat', 'sesame'
]

export const UNITS = {
  weight: ['kg', 'lbs', 'g', 'oz'],
  volume: ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz'],
  length: ['cm', 'm', 'in', 'ft'],
  temperature: ['celsius', 'fahrenheit'],
  pressure: ['mmHg', 'kPa'],
  energy: ['kcal', 'kJ'],
  time: ['min', 'hour', 'day']
}

export const NUTRITION_TARGETS = {
  calories: { min: 1000, max: 5000 },
  protein: { min: 50, max: 300 },
  carbs: { min: 100, max: 500 },
  fat: { min: 20, max: 150 },
  fiber: { min: 15, max: 50 },
  sugar: { min: 0, max: 100 }
}

export const API_RESPONSE_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  VALIDATION_ERROR: 'Invalid input data',
  INTERNAL_ERROR: 'An unexpected error occurred'
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
}

export const CACHE_KEYS = {
  USER: (userId) => `user:${userId}`,
  HEALTH_DATA: (userId, type) => `health:${userId}:${type}`,
  MEAL_RECORDS: (userId, date) => `meals:${userId}:${date}`,
  RECIPES: (recipeId) => `recipe:${recipeId}`,
  NUTRITION_ANALYSIS: (mealId) => `nutrition:${mealId}`
}

export const DEFAULT_PAGINATION = {
  limit: 20,
  maxLimit: 100,
  offset: 0,
  maxOffset: 10000
}

export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss'
}

export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  MAX_FILES: 5
}
