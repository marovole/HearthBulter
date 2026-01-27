// ============================================================================
// AI 助手状态管理
// 使用 Zustand 管理全局悬浮助手状态
// ============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// 类型定义
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    action?: string;
    mealPlanId?: string;
  };
}

export interface AIAssistantState {
  isOpen: boolean;
  isMinimized: boolean;
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  currentMealPlanId: string | null;
  unreadCount: number;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  toggleMinimize: () => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  setCurrentMealPlanId: (planId: string | null) => void;
  markAsRead: () => void;
}

// ============================================================================
// Store 实现
// ============================================================================

export const useAIAssistantStore = create<AIAssistantState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: false,
      messages: [],
      sessionId: null,
      isLoading: false,
      currentMealPlanId: null,
      unreadCount: 0,

      toggleOpen: () => {
        const { isOpen, isMinimized } = get();
        if (isMinimized) {
          set({ isMinimized: false });
        } else {
          set({ isOpen: !isOpen, unreadCount: 0 });
        }
      },

      setOpen: (open) => set({ isOpen: open, unreadCount: open ? 0 : get().unreadCount }),

      toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
          unreadCount: state.isOpen
            ? state.unreadCount
            : state.unreadCount + (message.role === "assistant" ? 1 : 0),
        }));
      },

      clearMessages: () => set({ messages: [], sessionId: null }),

      setLoading: (loading) => set({ isLoading: loading }),

      setSessionId: (sessionId) => set({ sessionId }),

      setCurrentMealPlanId: (planId) => set({ currentMealPlanId: planId }),

      markAsRead: () => set({ unreadCount: 0 }),
    }),
    {
      name: "ai-assistant-storage",
      partialize: (state) => ({
        messages: state.messages.slice(-50),
        sessionId: state.sessionId,
        currentMealPlanId: state.currentMealPlanId,
      }),
    }
  )
);
