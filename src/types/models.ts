import type {
  TaskStatus,
  TaskCategory,
  TaskPriority,
  FamilyMemberRole,
  MealType,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  DeviceType,
  OrderStatus,
} from "./enums";

export interface User {
  id: string;
  email: string;
  emailVerified?: Date | null;
  name?: string | null;
  image?: string | null;
  password?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Family {
  id: string;
  name: string;
  description?: string | null;
  inviteCode?: string | null;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  name: string;
  role: FamilyMemberRole;
  avatar?: string | null;
  gender?: string | null;
  birthDate?: Date | null;
  height?: number | null;
  weight?: number | null;
  activityLevel?: string | null;
  healthGoals?: string | null;
  allergies?: string | null;
  dietaryRestrictions?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description?: string | null;
  category: TaskCategory | string;
  assigneeId?: string | null;
  creatorId: string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  startedAt?: Date | null;
  reminderSent?: boolean;
  remindedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface HealthData {
  id: string;
  memberId: string;
  recordedAt: Date;
  weight?: number | null;
  bodyFat?: number | null;
  bmi?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  bloodSugar?: number | null;
  bloodOxygen?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  steps?: number | null;
  exerciseMinutes?: number | null;
  caloriesBurned?: number | null;
  stress?: number | null;
  notes?: string | null;
  source?: string | null;
  sourceDeviceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthGoal {
  id: string;
  memberId: string;
  type: string;
  targetValue: number;
  currentValue?: number | null;
  unit: string;
  startDate: Date;
  endDate?: Date | null;
  progress?: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlan {
  id: string;
  memberId: string;
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Meal {
  id: string;
  planId: string;
  name: string;
  type: MealType | string;
  date: Date;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealIngredient {
  id: string;
  mealId: string;
  foodId: string;
  quantity: number;
  unit: string;
  notes?: string | null;
}

export interface Food {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  servingSize: number;
  servingUnit: string;
  source: string;
  externalId?: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  description?: string | null;
  createdById: string;
  status: string;
  budget?: number | null;
  estimatedTotal?: number | null;
  actualTotal?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  foodId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  category?: string | null;
  estimatedPrice?: number | null;
  actualPrice?: number | null;
  status: string;
  priority?: string | null;
  notes?: string | null;
  addedById: string;
  purchasedById?: string | null;
  purchasedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  memberId?: string | null;
  familyId?: string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  priority: NotificationPriority | string;
  channel: NotificationChannel | string;
  read: boolean;
  readAt?: Date | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  platformAccountId?: string | null;
  platformOrderId?: string | null;
  status: OrderStatus | string;
  totalAmount?: number | null;
  currency?: string | null;
  items?: Record<string, unknown>[] | null;
  shippingAddress?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  familyId: string;
  foodId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  category?: string | null;
  location?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  price?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface DeviceConnection {
  id: string;
  userId: string;
  deviceType: DeviceType | string;
  deviceId?: string | null;
  deviceName?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: Date | null;
  lastSyncAt?: Date | null;
  syncEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  familyId: string;
  memberId?: string | null;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalReport {
  id: string;
  memberId: string;
  reportDate: Date;
  reportType?: string | null;
  institution?: string | null;
  imageUrl?: string | null;
  ocrText?: string | null;
  processedAt?: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalIndicator {
  id: string;
  reportId: string;
  name: string;
  value?: string | null;
  numericValue?: number | null;
  unit?: string | null;
  referenceRange?: string | null;
  isAbnormal?: boolean | null;
  category?: string | null;
  createdAt: Date;
}

export interface AIConversation {
  id: string;
  memberId: string;
  title?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date | null;
}

export interface AIAdvice {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  tokens?: number | null;
  createdAt: Date;
}
