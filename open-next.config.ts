import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // Use workerd conditions for better compatibility with Cloudflare Workers
  cloudflare: {
    useWorkerdCondition: true,
  }
});
