/**
 * Convex Auth Configuration
 *
 * This file exports the auth provider configuration for Convex.
 * The CONVEX_SITE_URL environment variable is automatically set by Convex.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
