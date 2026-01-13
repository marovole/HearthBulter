// @ts-nocheck
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FAQAccordion,
  defaultFAQData,
  defaultCategories,
} from "@/components/onboarding/FAQAccordion";
import { FeedbackForm } from "@/components/onboarding/FeedbackForm";
import { VideoTutorial } from "@/components/onboarding/VideoPlayer";
import {
  HelpTooltip,
  useContextualHelp,
} from "@/components/onboarding/HelpTooltip";
import { logger } from "@/lib/logger";
import {
  Search,
  BookOpen,
  Video,
  MessageCircle,
  HelpCircle,
  Phone,
  Mail,
  ExternalLink,
  Star,
  Clock,
  Users,
} from "lucide-react";

export default function HelpCenterPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [activeTab, setActiveTab] = useState("faq");

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Switch to FAQ tab when searching
    if (term) {
      setActiveTab("faq");
    }
  };

  const handleFeedbackSubmit = (feedback: any) => {
    logger.info("Feedback submitted", { feedback });
    setShowFeedbackForm(false);
    // Show success message
  };

  const handleContactSupport = (question?: string) => {
    // Open support chat or redirect to contact page
    window.location.href = "/support";
  };

  const tutorialVideos = [
    {
      src: "/videos/health-data-tutorial.mp4",
      title: "健康数据录入教程",
      description: "学习如何记录和查看健康数据，包括手动录入和设备同步",
      duration: 180, // 3 minutes
      poster: "/images/health-data-tutorial-poster.jpg",
    },
    {
      src: "/videos/meal-planning-tutorial.mp4",
      title: "食谱规划使用指南",
      description: "了解如何使用AI食谱推荐功能和自定义食谱",
      duration: 300, // 5 minutes
      poster: "/images/meal-planning-tutorial-poster.jpg",
    },
    {
      src: "/videos/shopping-list-tutorial.mp4",
      title: "购物清单生成教程",
      description: "学习如何根据食谱自动生成购物清单",
      duration: 120, // 2 minutes
      poster: "/images/shopping-list-tutorial-poster.jpg",
    },
  ];

  const quickLinks = [
    {
      title: "新用户指南",
      description: "快速了解Health Butler的基本功能",
      icon: <BookOpen className="h-5 w-5" />,
      href: "/onboarding/welcome",
      badge: "推荐",
    },
    {
      title: "常见问题",
      description: "查看用户最常遇到的问题和解答",
      icon: <HelpCircle className="h-5 w-5" />,
      href: "#faq",
      badge: "热门",
    },
    {
      title: "视频教程",
      description: "通过视频学习功能使用方法",
      icon: <Video className="h-5 w-5" />,
      href: "#tutorials",
      badge: "NEW",
    },
    {
      title: "联系客服",
      description: "获取一对一的专业帮助",
      icon: <MessageCircle className="h-5 w-5" />,
      href: "/support",
      badge: "在线",
    },
  ];

  const supportChannels = [
    {
      name: "在线客服",
      description: "工作日 9:00-18:00 实时响应",
      icon: <MessageCircle className="h-5 w-5" />,
      action: "开始聊天",
      href: "/support/chat",
    },
    {
      name: "电话支持",
      description: "400-123-4567",
      icon: <Phone className="h-5 w-5" />,
      action: "拨打电话",
      href: "tel:400-123-4567",
    },
    {
      name: "邮件支持",
      description: "support@healthbutler.com",
      icon: <Mail className="h-5 w-5" />,
      action: "发送邮件",
      href: "mailto:support@healthbutler.com",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">帮助中心</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            我们在这里为您提供全方位的帮助和支持，让您更好地使用 Health Butler
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="搜索帮助内容、常见问题或功能..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 py-3 text-lg"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">{link.icon}</div>
                  {link.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {link.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold mb-1">{link.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{link.description}</p>
                <a
                  href={link.href}
                  className="text-blue-600 text-sm hover:underline flex items-center"
                >
                  了解更多
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">常见问题</TabsTrigger>
            <TabsTrigger value="tutorials">视频教程</TabsTrigger>
            <TabsTrigger value="guides">使用指南</TabsTrigger>
            <TabsTrigger value="support">联系支持</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5" />
                  <span>常见问题</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FAQAccordion
                  items={defaultFAQData}
                  categories={defaultCategories}
                  showSearch={false}
                  showCategories={true}
                  onFeedback={(itemId, isHelpful) => {
                    logger.debug("FAQ反馈", { itemId, isHelpful });
                  }}
                  onContactSupport={handleContactSupport}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tutorials Tab */}
          <TabsContent value="tutorials">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="h-5 w-5" />
                    <span>视频教程</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                    {tutorialVideos.map((video, index) => (
                      <VideoTutorial
                        key={index}
                        video={video}
                        onComplete={() => {
                          logger.debug("教程完成", { title: video.title });
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tutorial Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>教程分类</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-medium mb-1">基础功能</h4>
                      <p className="text-sm text-gray-600">
                        数据录入、账户设置等
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <h4 className="font-medium mb-1">高级功能</h4>
                      <p className="text-sm text-gray-600">
                        AI推荐、数据分析等
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-medium mb-1">家庭管理</h4>
                      <p className="text-sm text-gray-600">
                        成员管理、权限设置等
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Guides Tab */}
          <TabsContent value="guides">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>使用指南</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">快速开始</h3>
                      <div className="space-y-3">
                        <a
                          href="/onboarding/welcome"
                          className="block p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium mb-1">新用户引导</h4>
                          <p className="text-sm text-gray-600">
                            完成初始设置，了解基本功能
                          </p>
                        </a>
                        <a
                          href="/guides/health-data"
                          className="block p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium mb-1">健康数据管理</h4>
                          <p className="text-sm text-gray-600">
                            学习如何记录和分析健康数据
                          </p>
                        </a>
                        <a
                          href="/guides/meal-planning"
                          className="block p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium mb-1">食谱规划指南</h4>
                          <p className="text-sm text-gray-600">
                            掌握AI食谱推荐功能
                          </p>
                        </a>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">进阶使用</h3>
                      <div className="space-y-3">
                        <a
                          href="/guides/device-sync"
                          className="block p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium mb-1">设备连接教程</h4>
                          <p className="text-sm text-gray-600">
                            连接智能设备，自动同步数据
                          </p>
                        </a>
                        <a
                          href="/guides/family-management"
                          className="block p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium mb-1">家庭管理功能</h4>
                          <p className="text-sm text-gray-600">
                            管理家庭成员，共享健康数据
                          </p>
                        </a>
                        <a
                          href="/guides/data-export"
                          className="block p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <h4 className="font-medium mb-1">数据导出与分析</h4>
                          <p className="text-sm text-gray-600">
                            导出数据，进行深度分析
                          </p>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips and Tricks */}
              <Card>
                <CardHeader>
                  <CardTitle>使用技巧</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2 text-blue-900">
                        💡 数据记录技巧
                      </h4>
                      <p className="text-sm text-blue-800">
                        每天固定时间测量数据，养成习惯。设置提醒功能，避免遗漏。
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium mb-2 text-green-900">
                        🥗 食谱优化建议
                      </h4>
                      <p className="text-sm text-green-800">
                        根据季节调整食谱，利用时令食材，既健康又经济。
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium mb-2 text-purple-900">
                        📊 数据分析技巧
                      </h4>
                      <p className="text-sm text-purple-800">
                        定期查看趋势图表，了解健康变化，及时调整生活方式。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <div className="space-y-6">
              {/* Support Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>联系我们</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {supportChannels.map((channel, index) => (
                      <div
                        key={index}
                        className="text-center p-6 border rounded-lg"
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          {channel.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{channel.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {channel.description}
                        </p>
                        <a
                          href={channel.href}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {channel.action}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Support Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>服务时间</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">客服时间</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>周一至周五</span>
                          <span className="font-medium">9:00 - 18:00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>周六</span>
                          <span className="font-medium">10:00 - 16:00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>周日</span>
                          <span className="font-medium text-gray-500">
                            休息
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">响应时间</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>在线客服</span>
                          <span className="font-medium text-green-600">
                            即时响应
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>邮件支持</span>
                          <span className="font-medium text-yellow-600">
                            24小时内
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>电话支持</span>
                          <span className="font-medium text-blue-600">
                            工作时间内
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback Form */}
              <Card>
                <CardHeader>
                  <CardTitle>提交反馈</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showFeedbackForm ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        有问题或建议？
                      </h3>
                      <p className="text-gray-600 mb-4">
                        我们重视您的每一条反馈，这将帮助我们改进产品
                      </p>
                      <Button onClick={() => setShowFeedbackForm(true)}>
                        提交反馈
                      </Button>
                    </div>
                  ) : (
                    <FeedbackForm
                      onSubmit={handleFeedbackSubmit}
                      onCancel={() => setShowFeedbackForm(false)}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
