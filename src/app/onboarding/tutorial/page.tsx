'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Play, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface TutorialStep {
  id: string
  title: string
  description: string
  duration: string
  completed: boolean
  content: {
    overview: string
    steps: string[]
    tips: string[]
  }
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'health-data',
    title: '健康数据录入',
    description: '学习如何记录和查看健康数据',
    duration: '3分钟',
    completed: false,
    content: {
      overview: '健康数据录入是 Health Butler 的核心功能，帮助您追踪重要的健康指标。',
      steps: [
        '进入"健康数据"页面',
        '点击"添加数据"按钮',
        '选择要记录的指标类型（体重、血压、血糖等）',
        '输入测量数值和时间',
        '点击"保存"完成录入'
      ],
      tips: [
        '建议每天固定时间测量，如早晨起床后',
        '数据异常时系统会自动提醒',
        '可以查看历史数据趋势图'
      ]
    }
  },
  {
    id: 'meal-planning',
    title: '食谱规划',
    description: '了解如何使用AI食谱推荐功能',
    duration: '5分钟',
    completed: false,
    content: {
      overview: '基于您的健康目标和偏好，AI会为您推荐个性化的食谱。',
      steps: [
        '进入"食谱规划"页面',
        '查看今日推荐食谱',
        '点击食谱查看详细营养信息',
        '选择"接受"或"修改"食谱',
        '确认后添加到您的食谱计划'
      ],
      tips: [
        '可以根据家庭成员调整食谱份量',
        '支持设置饮食偏好和禁忌',
        '食谱会根据健康目标自动优化'
      ]
    }
  },
  {
    id: 'shopping-list',
    title: '购物清单',
    description: '学习如何生成和管理购物清单',
    duration: '2分钟',
    completed: false,
    content: {
      overview: '根据确认的食谱自动生成购物清单，让采购更高效。',
      steps: [
        '进入"购物清单"页面',
        '查看根据食谱生成的清单',
        '勾选已购买的物品',
        '添加其他需要的物品',
        '分享清单给家人或导出'
      ],
      tips: [
        '清单按商店区域分类，方便购物',
        '可以设置提醒避免遗漏',
        '支持多人协作编辑清单'
      ]
    }
  },
  {
    id: 'device-sync',
    title: '设备同步',
    description: '连接可穿戴设备自动同步数据',
    duration: '4分钟',
    completed: false,
    content: {
      overview: '支持连接智能手环、体重秤等设备，自动同步健康数据。',
      steps: [
        '进入"设备管理"页面',
        '点击"添加设备"按钮',
        '选择设备类型和品牌',
        '按照指引完成配对',
        '设置同步频率和时间'
      ],
      tips: [
        '确保设备蓝牙已开启',
        '首次连接可能需要较长时间',
        '可以手动触发同步或设置自动同步'
      ]
    }
  }
]

export default function TutorialPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      markStepComplete(tutorialSteps[currentStep].id)
      setCurrentStep(currentStep + 1)
    } else {
      markStepComplete(tutorialSteps[currentStep].id)
      // Complete all tutorials
      completeAllTutorials()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const markStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId))
  }

  const completeAllTutorials = () => {
    localStorage.setItem('tutorials-completed', 'true')
    window.location.href = '/dashboard'
  }

  const skipTutorial = () => {
    localStorage.setItem('tutorials-completed', 'true')
    window.location.href = '/dashboard'
  }

  const goToStep = (index: number) => {
    setCurrentStep(index)
  }

  const currentTutorial = tutorialSteps[currentStep]
  const progress = (completedSteps.size / tutorialSteps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              功能教程
            </h1>
            <p className="text-gray-600">
              学习如何使用 Health Butler 的核心功能
            </p>
          </div>
          <Button variant="ghost" onClick={skipTutorial}>
            跳过教程
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">教程进度</span>
            <span className="text-sm text-gray-600">
              {completedSteps.size} / {tutorialSteps.length} 完成
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Tutorial Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tutorialSteps.map((tutorial, index) => (
            <button
              key={tutorial.id}
              onClick={() => goToStep(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                index === currentStep
                  ? 'bg-blue-600 text-white'
                  : completedSteps.has(tutorial.id)
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                {completedSteps.has(tutorial.id) && (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>{index + 1}. {tutorial.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Current Tutorial Content */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {currentTutorial.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {currentTutorial.description}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-2">
                  <Play className="h-3 w-3 mr-1" />
                  {currentTutorial.duration}
                </Badge>
                {completedSteps.has(currentTutorial.id) && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    已完成
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview */}
            <div>
              <h3 className="font-semibold text-lg mb-3">功能概述</h3>
              <p className="text-gray-700 leading-relaxed">
                {currentTutorial.content.overview}
              </p>
            </div>

            {/* Steps */}
            <div>
              <h3 className="font-semibold text-lg mb-3">操作步骤</h3>
              <div className="space-y-3">
                {currentTutorial.content.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="font-semibold text-lg mb-3">使用技巧</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ul className="space-y-2">
                  {currentTutorial.content.tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Practice Area */}
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <h4 className="font-medium mb-2">实践练习</h4>
              <p className="text-gray-600 mb-4">
                现在您已经了解了基本操作，让我们实际体验一下这个功能。
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                开始实践
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            上一个教程
          </Button>

          <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
            {currentStep === tutorialSteps.length - 1 ? '完成所有教程' : '下一个教程'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
