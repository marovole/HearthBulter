import { NeonFeedbackRepository } from "./implementations/neon-feedback-repository";
import type { FeedbackRepository } from "./interfaces/feedback-repository";

let instance: FeedbackRepository | null = null;

export function getFeedbackRepository(): FeedbackRepository {
  if (!instance) {
    instance = new NeonFeedbackRepository();
  }
  return instance;
}

export const feedbackRepository = getFeedbackRepository();
