
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Heart, Brain, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic'

export default function WelcomePage() {
  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: '家庭健康管理',
      description: '为全家成员创建健康档案，统一管理每个人的健康数据',
    },
    {
      icon: <Heart className="h-8 w-8 text-red-600" />,
      title: '健康数据追踪',
      description: '记录体重、血压、血糖等关键指标，可视化健康趋势',
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: 'AI营养建议',
      description: '基于健康数据和偏好，获得个性化的营养指导和食谱推荐',
    },
    {
      icon: <ShoppingBag className="h-8 w-8 text-green-600" />,
      title: '智能购物清单',
      description: '根据食谱自动生成购物清单，让健康饮食更简单',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            欢迎使用 Health Butler
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            您的智能家庭健康管家
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            让健康管理变得简单而有趣。通过AI驱动的个性化建议，
            帮助您的全家养成更健康的饮食习惯。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {feature.icon}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              准备开始您的健康之旅？
            </h2>
            <p className="text-gray-600 mb-6">
              只需几个简单步骤，我们就能为您和您的家人提供个性化的健康管理服务。
            </p>
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">创建家庭档案</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">设置健康目标</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
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
            已经设置过了？<Link href="/dashboard" className="text-blue-600 hover:underline">跳过引导</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
