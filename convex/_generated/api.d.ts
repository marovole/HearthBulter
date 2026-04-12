/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as activities from "../activities.js";
import type * as ai from "../ai.js";
import type * as analytics from "../analytics.js";
import type * as budget from "../budget.js";
import type * as community from "../community.js";
import type * as consents from "../consents.js";
import type * as dashboard from "../dashboard.js";
import type * as devices from "../devices.js";
import type * as ecommerce from "../ecommerce.js";
import type * as families from "../families.js";
import type * as files from "../files.js";
import type * as health from "../health.js";
import type * as instacart from "../instacart.js";
import type * as inventory from "../inventory.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_response from "../lib/response.js";
import type * as meals from "../meals.js";
import type * as members from "../members.js";
import type * as migrations from "../migrations.js";
import type * as notificationTemplates from "../notificationTemplates.js";
import type * as notifications from "../notifications.js";
import type * as rateLimits from "../rateLimits.js";
import type * as recipeInteractions from "../recipeInteractions.js";
import type * as recipes from "../recipes.js";
import type * as recommendations from "../recommendations.js";
import type * as seed from "../seed.js";
import type * as shareTracking from "../shareTracking.js";
import type * as shoppingLists from "../shoppingLists.js";
import type * as smartTrigger from "../smartTrigger.js";
import type * as social from "../social.js";
import type * as tasks from "../tasks.js";
import type * as tracking from "../tracking.js";
import type * as users from "../users.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  activities: typeof activities;
  ai: typeof ai;
  analytics: typeof analytics;
  budget: typeof budget;
  community: typeof community;
  consents: typeof consents;
  dashboard: typeof dashboard;
  devices: typeof devices;
  ecommerce: typeof ecommerce;
  families: typeof families;
  files: typeof files;
  health: typeof health;
  instacart: typeof instacart;
  inventory: typeof inventory;
  leaderboards: typeof leaderboards;
  "lib/auth": typeof lib_auth;
  "lib/response": typeof lib_response;
  meals: typeof meals;
  members: typeof members;
  migrations: typeof migrations;
  notificationTemplates: typeof notificationTemplates;
  notifications: typeof notifications;
  rateLimits: typeof rateLimits;
  recipeInteractions: typeof recipeInteractions;
  recipes: typeof recipes;
  recommendations: typeof recommendations;
  seed: typeof seed;
  shareTracking: typeof shareTracking;
  shoppingLists: typeof shoppingLists;
  smartTrigger: typeof smartTrigger;
  social: typeof social;
  tasks: typeof tasks;
  tracking: typeof tracking;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
