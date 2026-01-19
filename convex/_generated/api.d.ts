/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dashboard from "../dashboard.js";
import type * as families from "../families.js";
import type * as health from "../health.js";
import type * as inventory from "../inventory.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_response from "../lib/response.js";
import type * as meals from "../meals.js";
import type * as activities from "../activities.js";
import type * as migrations from "../migrations.js";
import type * as members from "../members.js";
import type * as notifications from "../notifications.js";
import type * as devices from "../devices.js";
import type * as notificationTemplates from "../notification-templates.js";
import type * as shoppingLists from "../shopping-lists.js";
import type * as social from "../social.js";
import type * as achievements from "../achievements.js";
import type * as leaderboards from "../leaderboards.js";
import type * as shareTracking from "../share-tracking.js";
import type * as recipes from "../recipes.js";
import type * as recipeInteractions from "../recipe-interactions.js";
import type * as recommendations from "../recommendations.js";
import type * as seed from "../seed.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as analytics from "../analytics.js";
import type * as budget from "../budget.js";
import type * as ecommerce from "../ecommerce.js";
import type * as tracking from "../tracking.js";
import type * as consents from "../consents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  achievements: typeof achievements;
  dashboard: typeof dashboard;
  devices: typeof devices;
  families: typeof families;
  health: typeof health;
  inventory: typeof inventory;
  "lib/auth": typeof lib_auth;
  "lib/response": typeof lib_response;
  leaderboards: typeof leaderboards;
  meals: typeof meals;
  migrations: typeof migrations;
  members: typeof members;
  notifications: typeof notifications;
  "notification-templates": typeof notificationTemplates;
  "shopping-lists": typeof shoppingLists;
  "share-tracking": typeof shareTracking;
  recipes: typeof recipes;
  "recipe-interactions": typeof recipeInteractions;
  recommendations: typeof recommendations;
  social: typeof social;
  seed: typeof seed;
  tasks: typeof tasks;
  users: typeof users;
  analytics: typeof analytics;
  budget: typeof budget;
  ecommerce: typeof ecommerce;
  tracking: typeof tracking;
  consents: typeof consents;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
