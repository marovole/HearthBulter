"use client";

// Force dynamic rendering to prevent prerender errors with React Context
export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Heart, Brain, ShoppingBag } from "lucide-react";
import Link from "next/link";

/**
 * Welcome Page Component
 *
 * Initial welcome page for new users, introducing Health Butler features
 * and guiding them to start the onboarding process.
 *
 * IMPORTANT: Client component for Cloudflare Pages static export compatibility.
 */
export default function WelcomePage() {
  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "家庭健康管理",
      description: "为全家成员创建健康档案，统一管理每个人的健康数据",
    },
    {
      icon: <Heart className="h-8 w-8 text-red-600" />,
      title: "健康数据追踪",
      description: "记录体重、血压、血糖等关键指标，可视化健康趋势",
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: "AI营养建议",
      description: "基于健康数据和偏好，获得个性化的营养指导和食谱推荐",
    },
    {
      icon: <ShoppingBag className="h-8 w-8 text-green-600" />,
      title: "智能购物清单",
      description: "根据食谱自动生成购物清单，让健康饮食更简单",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            欢迎使用 Health Butler
          </Badge>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">您的智能家庭健康管家</h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            让健康管理变得简单而有趣。通过AI驱动的个性化建议， 帮助您的全家养成更健康的饮食习惯。
          </p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg transition-shadow hover:shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {feature.icon}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">准备开始您的健康之旅？</h2>
            <p className="mb-6 text-gray-600">
              只需几个简单步骤，我们就能为您和您的家人提供个性化的健康管理服务。
            </p>
            <div className="mb-6 flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">创建家庭档案</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">设置健康目标</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">了解核心功能</span>
              </div>
            </div>
            <Link href="/onboarding/setup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                开始设置
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            已经设置过了？
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              跳过引导
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
