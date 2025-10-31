import { NextRequest, NextResponse } from 'next/server'
import { inventoryTracker } from '@/services/inventory-tracker'
import { getCurrentUser } from '@/lib/auth'

// POST - 为食谱使用库存
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    
    const requiredFields = ['memberId', 'ingredients', 'recipeName']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 })
      }
    }

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json({ error: '食材列表不能为空' }, { status: 400 })
    }

    // 验证食材格式
    for (const ingredient of body.ingredients) {
      if (!ingredient.foodId || !ingredient.quantity || !ingredient.unit) {
        return NextResponse.json({ error: '食材格式不正确，需要包含foodId、quantity和unit' }, { status: 400 })
      }
    }

    const updatedItems = await inventoryTracker.useInventoryForRecipe(
      body.memberId,
      body.ingredients.map((ing: any) => ({
        foodId: ing.foodId,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit
      })),
      body.recipeName
    )

    return NextResponse.json({
      success: true,
      data: updatedItems,
      message: `成功为食谱"${body.recipeName}"使用了${updatedItems.length}种食材`,
      summary: {
        totalIngredients: body.ingredients.length,
        usedIngredients: updatedItems.length,
        skippedIngredients: body.ingredients.length - updatedItems.length
      }
    })

  } catch (error) {
    console.error('食谱使用库存失败:', error)
    return NextResponse.json(
      { error: '食谱使用库存失败', details: error },
      { status: 500 }
    )
  }
}
