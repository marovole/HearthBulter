'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  HelpCircle, 
  Tag,
  MessageCircle
} from 'lucide-react'
import { useContextualHelp } from './HelpTooltip'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  helpful?: number
  notHelpful?: number
}

interface FAQAccordionProps {
  items: FAQItem[]
  categories?: string[]
  showSearch?: boolean
  showCategories?: boolean
  onFeedback?: (itemId: string, isHelpful: boolean) => void
  onContactSupport?: (question: string) => void
}

export function FAQAccordion({
  items,
  categories = [],
  showSearch = true,
  showCategories = true,
  onFeedback,
  onContactSupport
}: FAQAccordionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleFeedback = (itemId: string, isHelpful: boolean) => {
    setFeedbackGiven(prev => new Set(prev).add(itemId))
    onFeedback?.(itemId, isHelpful)
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getCategoryStats = () => {
    const stats: Record<string, number> = {}
    items.forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + 1
    })
    return stats
  }

  const categoryStats = getCategoryStats()

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索问题、答案或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Categories */}
      {showCategories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            全部 ({items.length})
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category} ({categoryStats[category] || 0})
            </Button>
          ))}
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                没有找到相关问题
              </h3>
              <p className="text-gray-600 mb-4">
                尝试使用其他关键词搜索，或联系客服获取帮助
              </p>
              <Button onClick={() => onContactSupport?.(searchTerm)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                联系客服
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map(item => (
            <Card key={item.id} className="border">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleItem(item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      {item.helpful !== undefined && (
                        <span className="text-xs text-gray-500">
                          {item.helpful} 人觉得有帮助
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base leading-relaxed">
                      {item.question}
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedItems.has(item.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              {expandedItems.has(item.id) && (
                <CardContent className="pt-0">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {item.answer}
                    </p>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex items-center space-x-2 mb-4">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-gray-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSearchTerm(tag)
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      这个回答对您有帮助吗？
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={feedbackGiven.has(item.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFeedback(item.id, true)
                        }}
                        className={feedbackGiven.has(item.id) ? 'text-green-600' : ''}
                      >
                        👍 有帮助
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={feedbackGiven.has(item.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFeedback(item.id, false)
                        }}
                        className={feedbackGiven.has(item.id) ? 'text-red-600' : ''}
                      >
                        👎 没帮助
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Contact Support */}
      {filteredItems.length > 0 && onContactSupport && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="text-center py-6">
            <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              没有找到答案？
            </h3>
            <p className="text-blue-700 mb-4">
              我们的客服团队随时为您提供帮助
            </p>
            <Button onClick={() => onContactSupport(searchTerm)}>
              联系客服
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Default FAQ data for Health Butler
export const defaultFAQData: FAQItem[] = [
  {
    id: '1',
    question: '如何开始使用 Health Butler？',
    answer: '开始使用 Health Butler 很简单！首先注册账户，然后按照新用户引导流程完成设置。您需要添加家庭成员信息、设置健康目标，然后就可以开始使用所有功能了。整个过程大约需要5-10分钟。',
    category: '入门指南',
    tags: ['新用户', '设置', '引导'],
    helpful: 45,
    notHelpful: 2
  },
  {
    id: '2',
    question: '如何添加和查看健康数据？',
    answer: '您可以通过"健康数据"页面手动录入体重、血压、血糖等指标，也可以连接智能设备自动同步。在历史数据页面，您可以查看趋势图表、统计分析，并导出数据。系统会自动验证数据合理性，异常值会收到提醒。',
    category: '健康数据',
    tags: ['数据录入', '设备同步', '数据分析'],
    helpful: 38,
    notHelpful: 3
  },
  {
    id: '3',
    question: 'AI 食谱推荐是如何工作的？',
    answer: 'AI食谱推荐基于您的健康目标、饮食偏好、过敏信息、家庭成员情况等因素。系统会分析营养需求，推荐符合要求的食谱，并自动计算营养成分。您可以选择接受、修改或拒绝推荐。',
    category: '食谱规划',
    tags: ['AI推荐', '营养分析', '个性化'],
    helpful: 52,
    notHelpful: 1
  },
  {
    id: '4',
    question: '如何连接智能手环或其他设备？',
    answer: '在"设备管理"页面点击"添加设备"，选择设备类型和品牌，按照指引完成蓝牙配对。配对成功后，设备数据会自动同步到您的账户。您可以在设置中调整同步频率和时间。',
    category: '设备连接',
    tags: ['蓝牙', '智能设备', '数据同步'],
    helpful: 29,
    notHelpful: 5
  },
  {
    id: '5',
    question: '购物清单是如何生成的？',
    answer: '当您确认食谱计划后，系统会自动分析所需食材，生成购物清单。清单按商店区域分类，包含具体数量和规格。您可以手动添加其他物品，调整数量，或分享清单给家人。',
    category: '购物清单',
    tags: ['自动生成', '食材管理', '清单分享'],
    helpful: 41,
    notHelpful: 2
  },
  {
    id: '6',
    question: '如何邀请家人加入？',
    answer: '在"家庭管理"页面点击"邀请成员"，输入家人的邮箱或手机号发送邀请。家人接受邀请后，就可以共享健康数据和食谱计划。您可以为不同成员设置不同的权限和健康目标。',
    category: '家庭管理',
    tags: ['邀请', '权限管理', '数据共享'],
    helpful: 33,
    notHelpful: 4
  },
  {
    id: '7',
    question: '数据安全和隐私如何保护？',
    answer: '我们采用银行级加密技术保护您的数据，所有数据传输都通过SSL加密。您拥有完全的数据控制权，可以随时导出或删除数据。我们严格遵守隐私法规，不会未经授权分享您的个人信息。',
    category: '安全隐私',
    tags: ['数据加密', '隐私保护', 'GDPR'],
    helpful: 47,
    notHelpful: 1
  },
  {
    id: '8',
    question: '如何取消订阅或删除账户？',
    answer: '您可以在"账户设置"中随时取消订阅或删除账户。取消订阅后，您仍可使用到当前计费周期结束。删除账户会永久移除所有数据，此操作不可恢复，请谨慎操作。',
    category: '账户管理',
    tags: ['取消订阅', '删除账户', '数据删除'],
    helpful: 22,
    notHelpful: 3
  }
]

export const defaultCategories = [
  '入门指南',
  '健康数据', 
  '食谱规划',
  '设备连接',
  '购物清单',
  '家庭管理',
  '安全隐私',
  '账户管理'
]
