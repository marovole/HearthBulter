-- CreateEnum for family collaboration
CREATE TYPE "TaskCategory" AS ENUM ('SHOPPING', 'COOKING', 'CLEANING', 'HEALTH', 'EXERCISE', 'OTHER');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "ActivityType" AS ENUM ('MEAL_LOG_ADDED', 'RECIPE_ADDED', 'TASK_CREATED', 'TASK_COMPLETED', 'SHOPPING_UPDATED', 'GOAL_ACHIEVED', 'CHECK_IN', 'HEALTH_DATA', 'OTHER');
CREATE TYPE "CommentTarget" AS ENUM ('TASK', 'ACTIVITY');
CREATE TYPE "GoalCategory" AS ENUM ('WEIGHT_LOSS', 'EXERCISE', 'NUTRITION', 'SAVINGS', 'CHECK_IN_STREAK', 'OTHER');

-- CreateTable for Task
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "remindedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Activity
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Comment
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "targetType" "CommentTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable for FamilyGoal
CREATE TABLE "family_goals" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardDescription" TEXT,
    "rewardAchieved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "family_goals_pkey" PRIMARY KEY ("id")
);

-- Add new columns to shopping_items for collaboration
ALTER TABLE "shopping_items" ADD COLUMN "assigneeId" TEXT;
ALTER TABLE "shopping_items" ADD COLUMN "addedBy" TEXT;
ALTER TABLE "shopping_items" ADD COLUMN "purchasedBy" TEXT;
ALTER TABLE "shopping_items" ADD COLUMN "purchasedAt" TIMESTAMP(3);

-- Update FamilyMemberRole enum to include GUEST
ALTER TYPE "FamilyMemberRole" ADD VALUE 'GUEST';

-- Create indexes for new tables
CREATE INDEX "tasks_familyId_idx" ON "tasks"("familyId");
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");
CREATE INDEX "tasks_creatorId_idx" ON "tasks"("creatorId");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

CREATE INDEX "activities_familyId_idx" ON "activities"("familyId");
CREATE INDEX "activities_memberId_idx" ON "activities"("memberId");
CREATE INDEX "activities_activityType_idx" ON "activities"("activityType");
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

CREATE INDEX "comments_targetType_targetId_idx" ON "comments"("targetType", "targetId");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

CREATE INDEX "family_goals_familyId_idx" ON "family_goals"("familyId");
CREATE INDEX "family_goals_creatorId_idx" ON "family_goals"("creatorId");
CREATE INDEX "family_goals_status_idx" ON "family_goals"("status");
CREATE INDEX "family_goals_targetDate_idx" ON "family_goals"("targetDate");

CREATE INDEX "shopping_items_assigneeId_idx" ON "shopping_items"("assigneeId");
CREATE INDEX "shopping_items_addedBy_idx" ON "shopping_items"("addedBy");
CREATE INDEX "shopping_items_purchasedBy_idx" ON "shopping_items"("purchasedBy");

-- Add foreign key constraints
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "family_goals" ADD CONSTRAINT "family_goals_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_goals" ADD CONSTRAINT "family_goals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
