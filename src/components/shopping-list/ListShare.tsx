'use client'

import { useState } from 'react'

interface ListShareProps {
  shoppingListId: string
  listName: string
  items: Array<{
    id: string
    food: {
      name: string
      category: string
    }
    amount: number
    purchased: boolean
  }>
  onClose: () => void
}

export function ListShare({
  shoppingListId,
  listName,
  items,
  onClose,
}: ListShareProps) {
  const [shareMethod, setShareMethod] = useState<'link' | 'text' | 'email'>('link')
  const [emailAddress, setEmailAddress] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const generateShareLink = async () => {
    try {
      setIsSharing(true)
      setError(null)

      const response = await fetch(`/api/shopping-lists/${shoppingListId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('生成分享链接失败')
      }

      const data = await response.json()
      setShareLink(data.shareUrl)
      setSuccess('分享链接已生成')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成分享链接失败')
    } finally {
      setIsSharing(false)
    }
  }

  const generateTextList = () => {
    const CATEGORY_LABELS: Record<string, string> = {
      VEGETABLES: '蔬菜',
      FRUITS: '水果',
      GRAINS: '谷物',
      PROTEIN: '肉蛋奶',
      SEAFOOD: '海鲜',
      DAIRY: '乳制品',
      OILS: '油脂',
      SNACKS: '零食',
      BEVERAGES: '饮料',
      OTHER: '其他',
    }

    let text = `📋 ${listName}\n`
    text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`

    // 按分类分组
    const groupedItems = items.reduce((acc, item) => {
      const category = item.food.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {} as Record<string, typeof items>)

    const categoryOrder = [
      'VEGETABLES',
      'FRUITS',
      'SEAFOOD',
      'PROTEIN',
      'DAIRY',
      'GRAINS',
      'OILS',
      'SNACKS',
      'BEVERAGES',
      'OTHER',
    ]

    categoryOrder.forEach((category) => {
      const categoryItems = groupedItems[category]
      if (categoryItems && categoryItems.length > 0) {
        text += `【${CATEGORY_LABELS[category] || category}】\n`
        categoryItems.forEach((item) => {
          const checkbox = item.purchased ? '☑' : '☐'
          const amount = item.amount >= 1000 
            ? `${(item.amount / 1000).toFixed(1)}kg` 
            : `${item.amount.toFixed(0)}g`
          text += `  ${checkbox} ${item.food.name} - ${amount}\n`
        })
        text += '\n'
      }
    })

    const purchasedCount = items.filter(item => item.purchased).length
    text += `进度: ${purchasedCount}/${items.length} 已完成\n`
    
    return text
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess('已复制到剪贴板')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('复制失败，请手动复制')
    }
  }

  const shareViaWebShare = async () => {
    const text = generateTextList()
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: listName,
          text: text,
        })
        setSuccess('分享成功')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // 用户取消分享，降级到复制功能
          copyToClipboard(text)
        }
      }
    } else {
      copyToClipboard(text)
    }
  }

  const sendEmail = async () => {
    if (!emailAddress.trim()) {
      setError('请输入邮箱地址')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      setError('请输入正确的邮箱地址')
      return
    }

    try {
      setIsSharing(true)
      setError(null)

      const response = await fetch(`/api/shopping-lists/${shoppingListId}/share/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailAddress: emailAddress.trim(),
          listName,
          textContent: generateTextList(),
        }),
      })

      if (!response.ok) {
        throw new Error('发送邮件失败')
      }

      setSuccess('邮件发送成功')
      setEmailAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送邮件失败')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">分享购物清单</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Share Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">选择分享方式</h3>
            <div className="space-y-2">
              {[
                { value: 'link', label: '分享链接', description: '生成可访问的链接' },
                { value: 'text', label: '复制文本', description: '复制为文本格式' },
                { value: 'email', label: '邮件发送', description: '发送到指定邮箱' },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => setShareMethod(method.value as any)}
                  className={`w-full p-3 border rounded-lg text-left transition-colors ${
                    shareMethod === method.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{method.label}</div>
                  <div className="text-sm text-gray-500">{method.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Share Content */}
          {shareMethod === 'link' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">分享链接</h4>
                {!shareLink ? (
                  <button
                    onClick={generateShareLink}
                    disabled={isSharing}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isSharing ? '生成中...' : '生成分享链接'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => copyToClipboard(shareLink)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      复制链接
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {shareMethod === 'text' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">文本内容</h4>
                <textarea
                  value={generateTextList()}
                  readOnly
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => copyToClipboard(generateTextList())}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  复制文本
                </button>
                <button
                  onClick={shareViaWebShare}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  系统分享
                </button>
              </div>
            </div>
          )}

          {shareMethod === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={sendEmail}
                disabled={isSharing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {isSharing ? '发送中...' : '发送邮件'}
              </button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
