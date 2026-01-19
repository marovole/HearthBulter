export interface AIResponse {
  content: string;
  tokens: number;
  model: string;
}

// 推荐模型常量
export const RECOMMENDED_MODELS = {
  FREE: ["openai/gpt-oss-20b:free", "z-ai/glm-4-9b-chat:free"],
  PAID: [
    "deepseek/deepseek-v3.2-exp",
    "x-ai/grok-4-fast",
    "openai/gpt-oss-120b:exacto",
  ],
} as const;

/**
 * 调用OpenRouter AI API
 */
export async function callOpenAI(
  prompt: string,
  model: string = "openai/gpt-oss-20b:free",
  maxTokens: number = 1000,
  temperature: number = 0.7,
  useOpenRouter: boolean = true,
): Promise<AIResponse> {
  if (!useOpenRouter) {
    throw new Error("Direct OpenAI API not implemented yet");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not found in environment variables");
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://hearthbulter.com",
          "X-Title": "Hearth Butler Health App",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      throw new Error("No response message from OpenRouter API");
    }

    return {
      content: message.content || "",
      tokens: data.usage?.total_tokens || 0,
      model: data.model || model,
    };
  } catch (error) {
    console.error("OpenRouter API error:", error);
    throw new Error(
      `AI API call failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * 调用AI API并返回JSON响应
 */
export async function callOpenAIJSON(
  prompt: string,
  model: string = "openai/gpt-oss-20b:free",
  maxTokens: number = 1000,
  useOpenRouter: boolean = true,
): Promise<any> {
  const response = await callOpenAI(
    prompt,
    model,
    maxTokens,
    0.7,
    useOpenRouter,
  );
  try {
    return JSON.parse(response.content);
  } catch {
    throw new Error("Failed to parse JSON response from AI");
  }
}

/**
 * 获取可用模型列表（OpenRouter）
 */
export async function getAvailableModels() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not found");
    }

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
}
