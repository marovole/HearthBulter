'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Lightbulb } from 'lucide-react';
import { AIThinkingIndicator } from '@/components/ui/loading-indicator';
import {
  FeedbackButtons,
  FeedbackData,
} from '@/components/ui/feedback-buttons';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface PresetQuestion {
  id: string;
  category:
    | 'general'
    | 'nutrition'
    | 'health'
    | 'meal_planning'
    | 'weight_management';
  question: string;
  description: string;
  tags: string[];
}

interface AIChatProps {
  memberId: string;
  initialMessages?: ChatMessage[];
  onMessageSent?: (message: ChatMessage) => void;
}

export function AIChat({
  memberId,
  initialMessages = [],
  onMessageSent,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [presetQuestions, setPresetQuestions] = useState<PresetQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 加载预设问题
  useEffect(() => {
    loadPresetQuestions();
  }, []);

  // 处理反馈
  const handleFeedback = async (feedback: FeedbackData) => {
    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feedback,
          sessionId,
        }),
      });

      if (!response.ok) {
        console.warn('Feedback submission failed');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadPresetQuestions = async () => {
    try {
      const response = await fetch('/api/ai/chat');
      if (response.ok) {
        const data = await response.json();
        setPresetQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to load preset questions:', error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          memberId,
          stream: false, // 先使用非流式响应
        }),
      });

      if (!response.ok) {
        throw new Error('发送消息失败');
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        intent: data.intent,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setSessionId(data.sessionId);
      onMessageSent?.(aiMessage);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 2}`,
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。请稍后重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handlePresetQuestion = (question: PresetQuestion) => {
    sendMessage(question.question);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      nutrition: 'bg-green-100 text-green-800',
      health: 'bg-blue-100 text-blue-800',
      meal_planning: 'bg-orange-100 text-orange-800',
      weight_management: 'bg-purple-100 text-purple-800',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  return (
    <Card className='h-[600px] flex flex-col'>
      <CardHeader>
        <CardTitle className='flex items-center'>
          <Bot className='w-5 h-5 mr-2' />
          AI营养顾问
        </CardTitle>
      </CardHeader>

      <CardContent className='flex-1 flex flex-col p-0'>
        {/* 消息区域 */}
        <ScrollArea className='flex-1 p-4' ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className='text-center text-muted-foreground py-8'>
              <Bot className='w-12 h-12 mx-auto mb-4 opacity-50' />
              <p>我是您的AI营养顾问</p>
              <p className='text-sm'>可以询问健康、营养、饮食相关的问题</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className='w-8 h-8'>
                      <AvatarFallback>
                        {message.role === 'user' ? (
                          <User className='w-4 h-4' />
                        ) : (
                          <Bot className='w-4 h-4' />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col'>
                      <div
                        className={`mx-2 px-3 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className='text-sm whitespace-pre-wrap'>
                          {message.content}
                        </p>
                        {message.intent && (
                          <Badge variant='outline' className='text-xs mt-1'>
                            {message.intent}
                          </Badge>
                        )}
                      </div>
                      {message.role === 'assistant' && (
                        <div className='mx-2 mt-1'>
                          <FeedbackButtons
                            sessionId={sessionId}
                            onFeedback={handleFeedback}
                            size='sm'
                            variant='compact'
                            className='opacity-60 hover:opacity-100 transition-opacity'
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className='flex justify-start'>
              <div className='flex max-w-[80%]'>
                <Avatar className='w-8 h-8'>
                  <AvatarFallback>
                    <Bot className='w-4 h-4' />
                  </AvatarFallback>
                </Avatar>
                <div className='ml-2'>
                  <AIThinkingIndicator
                    size='sm'
                    message='AI正在分析您的问题...'
                    className='bg-background border rounded-lg shadow-sm'
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* 预设问题 */}
        {messages.length === 0 && presetQuestions.length > 0 && (
          <div className='p-4 border-t'>
            <div className='flex items-center mb-3'>
              <Lightbulb className='w-4 h-4 mr-2 text-yellow-500' />
              <span className='text-sm font-medium'>常用问题</span>
            </div>
            <div className='grid grid-cols-1 gap-2 max-h-32 overflow-y-auto'>
              {presetQuestions.slice(0, 4).map((question) => (
                <Button
                  key={question.id}
                  variant='outline'
                  size='sm'
                  onClick={() => handlePresetQuestion(question)}
                  className='justify-start text-left h-auto py-2 px-3'
                  disabled={isLoading}
                >
                  <div>
                    <div className='text-sm font-medium'>
                      {question.question}
                    </div>
                    <Badge
                      className={`text-xs mt-1 ${getCategoryColor(question.category)}`}
                    >
                      {question.category === 'general'
                        ? '通用'
                        : question.category === 'nutrition'
                          ? '营养'
                          : question.category === 'health'
                            ? '健康'
                            : question.category === 'meal_planning'
                              ? '饮食规划'
                              : '体重管理'}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className='p-4 border-t'>
          <form onSubmit={handleSubmit} className='flex space-x-2'>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder='输入您的问题...'
              disabled={isLoading}
              className='flex-1'
            />
            <Button type='submit' disabled={isLoading || !inputMessage.trim()}>
              <Send className='w-4 h-4' />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
