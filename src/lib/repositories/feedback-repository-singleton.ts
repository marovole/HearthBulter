import { ConvexFeedbackRepository } from "./implementations/convex-feedback-repository";
import type { FeedbackRepository } from "./interfaces/feedback-repository";

let instance: FeedbackRepository | null = null;

export function getFeedbackRepository(): FeedbackRepository {
  if (!instance) {
    instance = new ConvexFeedbackRepository();
  }
  return instance;
}

export const feedbackRepository = getFeedbackRepository();
