import type {
  ConversationMessage,
  IntentRecognition,
  PresetQuestion,
} from './conversation-manager';

const QUESTION_KEYWORDS = [
  '什么',
  '怎么',
  '为什么',
  '如何',
  '能不能',
  '可不可以',
  '?',
  '？',
];
const ADVICE_KEYWORDS = [
  '建议',
  '推荐',
  '应该',
  '最好',
  '如何改善',
  '怎么调整',
];
const CLARIFICATION_KEYWORDS = [
  '具体点',
  '详细点',
  '不清楚',
  '没明白',
  '再解释',
  '举例',
];
const CORRECTION_KEYWORDS = ['不对', '错了', '不是', '纠正', '修改'];
const FEEDBACK_KEYWORDS = ['有用', '喜欢', '不喜欢', '感谢', '谢谢'];

const HEALTH_METRIC_KEYWORDS = [
  '体重',
  '血糖',
  '血压',
  '胆固醇',
  'BMI',
  '体脂率',
];
const FOOD_KEYWORDS = [
  '肉',
  '鱼',
  '蔬菜',
  '水果',
  '米饭',
  '面条',
  '牛奶',
  '鸡蛋',
];
const CONDITION_KEYWORDS = ['糖尿病', '高血压', '肥胖', '贫血', '便秘'];
const TOPIC_KEYWORDS = [
  { keyword: '减重', topic: 'weight_management' },
  { keyword: '减肥', topic: 'weight_management' },
  { keyword: '营养', topic: 'nutrition' },
  { keyword: '饮食', topic: 'nutrition' },
  { keyword: '运动', topic: 'exercise' },
  { keyword: '锻炼', topic: 'exercise' },
];

const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    id: 'weight_loss_tips',
    category: 'weight_management',
    question: '如何健康减重？',
    description: '获取科学的减重建议',
    tags: ['减重', '健康', '饮食'],
    priority: 10,
  },
  {
    id: 'protein_intake',
    category: 'nutrition',
    question: '每天需要摄入多少蛋白质？',
    description: '了解蛋白质推荐摄入量',
    tags: ['蛋白质', '营养', '健康'],
    priority: 9,
  },
  {
    id: 'blood_sugar_control',
    category: 'health',
    question: '如何控制血糖？',
    description: '血糖管理的实用建议',
    tags: ['血糖', '糖尿病', '饮食'],
    priority: 8,
  },
  {
    id: 'meal_prep_tips',
    category: 'meal_planning',
    question: '如何做好餐食准备？',
    description: '高效备餐的实用技巧',
    tags: ['备餐', '时间管理', '健康饮食'],
    priority: 7,
  },
  {
    id: 'cholesterol_management',
    category: 'health',
    question: '如何降低胆固醇？',
    description: '胆固醇管理的饮食建议',
    tags: ['胆固醇', '心血管', '饮食'],
    priority: 8,
  },
  {
    id: 'fiber_intake',
    category: 'nutrition',
    question: '膳食纤维很重要吗？',
    description: '了解膳食纤维的益处',
    tags: ['纤维', '肠道健康', '营养'],
    priority: 6,
  },
  {
    id: 'sports_nutrition',
    category: 'nutrition',
    question: '运动前后应该吃什么？',
    description: '运动营养的实用建议',
    tags: ['运动', '营养', '恢复'],
    priority: 7,
  },
  {
    id: 'hydration_tips',
    category: 'general',
    question: '每天喝多少水合适？',
    description: '科学饮水建议',
    tags: ['饮水', '健康', '生活习惯'],
    priority: 5,
  },
].sort((a, b) => b.priority - a.priority);

const FALLBACK_RESPONSES: Record<IntentRecognition['intent'], string> = {
  question:
    '这是一个很好的问题。基于您的健康数据，我建议您咨询专业医生获取更准确的建议。同时，我可以为您提供一些通用的健康指导。',
  advice_request:
    '我理解您需要健康建议。不过，为了确保建议的安全性和准确性，建议您先咨询专业医生。我可以为您提供一些基于普遍健康原则的通用建议。',
  clarification:
    '我需要更多信息来更好地帮助您。您能具体描述一下您的健康状况或饮食习惯吗？',
  correction:
    '感谢您指出我的错误。我会根据您的反馈改进回答。请问您希望我如何调整建议？',
  feedback:
    '感谢您的反馈！我会继续努力为您提供更好的健康建议。有任何其他问题都可以随时询问。',
  general_chat:
    '很高兴与您交流健康话题！如果您有具体的健康或营养问题，我很乐意为您提供建议。',
};

export function recognizeIntentFromMessage(message: string): IntentRecognition {
  const lowerMessage = message.toLowerCase();

  const hasQuestion = QUESTION_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword),
  );
  const hasAdviceRequest = ADVICE_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword),
  );
  const hasClarification = CLARIFICATION_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword),
  );
  const hasCorrection = CORRECTION_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword),
  );
  const hasFeedback = FEEDBACK_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword),
  );

  let intent: IntentRecognition['intent'] = 'general_chat';
  let confidence = 0.5;

  if (hasCorrection) {
    intent = 'correction';
    confidence = 0.8;
  } else if (hasClarification) {
    intent = 'clarification';
    confidence = 0.8;
  } else if (hasAdviceRequest) {
    intent = 'advice_request';
    confidence = 0.7;
  } else if (hasQuestion) {
    intent = 'question';
    confidence = 0.7;
  } else if (hasFeedback) {
    intent = 'feedback';
    confidence = 0.6;
  }

  const entities = extractEntities(message);

  let suggestedResponseType: IntentRecognition['suggested_response_type'] =
    'factual';
  if (intent === 'advice_request') {
    suggestedResponseType = 'advice';
  } else if (intent === 'clarification') {
    suggestedResponseType = 'clarification';
  } else if (intent === 'correction') {
    suggestedResponseType = 'confirmation';
  }

  return {
    intent,
    confidence,
    entities,
    suggested_response_type: suggestedResponseType,
  };
}

export function extractEntities(
  message: string,
): IntentRecognition['entities'] {
  const topics: string[] = [];
  const health_metrics: string[] = [];
  const foods: string[] = [];
  const conditions: string[] = [];

  const lowerMessage = message.toLowerCase();

  HEALTH_METRIC_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) {
      health_metrics.push(keyword);
    }
  });

  FOOD_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) {
      foods.push(keyword);
    }
  });

  CONDITION_KEYWORDS.forEach((keyword) => {
    if (lowerMessage.includes(keyword)) {
      conditions.push(keyword);
    }
  });

  TOPIC_KEYWORDS.forEach(({ keyword, topic }) => {
    if (lowerMessage.includes(keyword)) {
      topics.push(topic);
    }
  });

  return { topics, health_metrics, foods, conditions };
}

export function formatConversationHistory(
  messages: ConversationMessage[],
): string {
  return messages
    .map((msg) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
    .join('\n');
}

export function extractKeyTopics(messages: ConversationMessage[]): string[] {
  const topics = new Set<string>();

  messages.forEach((msg) => {
    if (msg.metadata?.intent) {
      topics.add(msg.metadata.intent);
    }
  });

  return Array.from(topics);
}

export function extractHealthConcerns(
  messages: ConversationMessage[],
): string[] {
  const concerns = new Set<string>();
  const concernKeywords = ['担心', '问题', '不适', '异常', '不正常'];

  messages.forEach((msg) => {
    if (msg.role === 'user') {
      concernKeywords.forEach((keyword) => {
        if (msg.content.includes(keyword)) {
          const index = msg.content.indexOf(keyword);
          const concern = msg.content.substring(index, index + 20).trim();
          if (concern) concerns.add(concern);
        }
      });
    }
  });

  return Array.from(concerns);
}

export function getPresetQuestions(): PresetQuestion[] {
  return PRESET_QUESTIONS.map((question) => ({ ...question }));
}

export function getFallbackResponse(
  intent: IntentRecognition['intent'],
): string {
  return FALLBACK_RESPONSES[intent] || FALLBACK_RESPONSES.general_chat;
}
