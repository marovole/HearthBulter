"use client";

// ============================================================================
// 全局悬浮 AI 助手组件
// 跨页面状态保持，支持对话式计划调整
// ============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIAssistantStore, ChatMessage } from "@/stores/ai-assistant-store";

// ============================================================================
// 图标组件
// ============================================================================

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ============================================================================
// 主组件
// ============================================================================

export function FloatingAIAssistant() {
  const {
    isOpen,
    isMinimized,
    messages,
    isLoading,
    unreadCount,
    toggleOpen,
    toggleMinimize,
    addMessage,
    setLoading,
    setSessionId,
    sessionId,
  } = useAIAssistantStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    addMessage({ role: "user", content: userMessage });
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          context: "meal_planning",
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      addMessage({
        role: "assistant",
        content: data.message,
        metadata: data.metadata,
      });

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI Assistant"
      >
        <ChatIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      {/* 对话窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "auto" : "500px",
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-96 overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between bg-emerald-500 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                <span className="font-medium">Meal Planning Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMinimize}
                  className="rounded p-1 hover:bg-emerald-600"
                  aria-label="Minimize"
                >
                  <MinimizeIcon />
                </button>
                <button
                  onClick={toggleOpen}
                  className="rounded p-1 hover:bg-emerald-600"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* 消息区域 */}
            {!isMinimized && (
              <>
                <div className="h-80 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <WelcomeMessage />
                  ) : (
                    messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                  )}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <div className="border-t border-gray-100 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about your meal plan..."
                      className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white disabled:bg-gray-300"
                    >
                      <SendIcon />
                    </button>
                  </div>
                  <QuickActions />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// 子组件
// ============================================================================

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 text-4xl">👋</div>
      <h3 className="mb-2 font-semibold text-gray-800">
        Hi! I&apos;m your meal planning assistant
      </h3>
      <p className="text-sm text-gray-500">
        I can help you adjust your weekly meal plan, swap recipes, or answer questions about
        nutrition.
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-800"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        <span className={`mt-1 block text-xs ${isUser ? "text-emerald-100" : "text-gray-400"}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-3 flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-3">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

function QuickActions() {
  const { addMessage, setLoading } = useAIAssistantStore();

  const quickActions = [
    { label: "Swap a meal", action: "I want to swap a meal in my plan" },
    { label: "Add recipe", action: "Add a new recipe to my plan" },
    { label: "Nutrition info", action: "Show me the nutrition summary" },
  ];

  const handleQuickAction = async (action: string) => {
    addMessage({ role: "user", content: action });
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action, context: "meal_planning" }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      addMessage({ role: "assistant", content: data.message });
    } catch {
      addMessage({ role: "assistant", content: "Sorry, something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {quickActions.map((qa) => (
        <button
          key={qa.label}
          onClick={() => handleQuickAction(qa.action)}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          {qa.label}
        </button>
      ))}
    </div>
  );
}

export default FloatingAIAssistant;
