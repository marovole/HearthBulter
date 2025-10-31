import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/inventory/items/route'
import { inventoryTracker } from '@/services/inventory-tracker'
import { PrismaClient, InventoryStatus, StorageLocation } from '@prisma/client'

const prisma = new PrismaClient()

// Mock getCurrentUser
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com'
  }))
}))

describe('/api/inventory/items', () => {
  let testMemberId: string
  let testFoodId: string
  let testInventoryItemId: string

  beforeAll(async () => {
    // 创建测试数据
    const testMember = await prisma.familyMember.create({
      data: {
        name: 'Test API User',
        email: 'test-api@example.com',
        role: 'MEMBER'
      }
    })
    testMemberId = testMember.id

    const testFood = await prisma.food.create({
      data: {
        name: 'Test API Food',
        nameEn: 'Test Food',
        category: 'VEGETABLES',
        calories: 25,
        protein: 1,
        carbs: 5,
        fat: 0.1
      }
    })
    testFoodId = testFood.id

    const item = await inventoryTracker.createInventoryItem({
      memberId: testMemberId,
      foodId: testFoodId,
      quantity: 5,
      unit: '个',
      storageLocation: StorageLocation.REFRIGERATOR
    })
    testInventoryItemId = item.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.inventoryItem.deleteMany({
      where: { memberId: testMemberId }
    })
    await prisma.familyMember.delete({
      where: { id: testMemberId }
    })
    await prisma.food.delete({
      where: { id: testFoodId }
    })
  })

  describe('GET', () => {
    it('should return inventory items for valid member', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/items?memberId=' + testMemberId)
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id).toBe(testInventoryItemId)
      expect(data.data[0].food.name).toBe('Test API Food')
    })

    it('should filter items by status', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/inventory/items?memberId=${testMemberId}&status=${InventoryStatus.FRESH}`
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.every((item: any) => item.status === InventoryStatus.FRESH)).toBe(true)
    })

    it('should filter items by storage location', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/inventory/items?memberId=${testMemberId}&storageLocation=${StorageLocation.REFRIGERATOR}`
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.every((item: any) => item.storageLocation === StorageLocation.REFRIGERATOR)).toBe(true)
    })

    it('should return empty array for member with no items', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/items?memberId=non-existent-member')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(0)
    })

    it('should return error for missing memberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/items')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('缺少成员ID')
    })

    it('should handle pagination', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/inventory/items?memberId=${testMemberId}&limit=10&offset=0`
      )
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.offset).toBe(0)
    })
  })

  describe('POST', () => {
    it('should create new inventory item successfully', async () => {
      const testFood2 = await prisma.food.create({
        data: {
          name: 'Test API Food 2',
          nameEn: 'Test Food 2',
          category: 'FRUITS',
          calories: 60,
          protein: 0.5,
          carbs: 15,
          fat: 0.2
        }
      })

      const requestBody = {
        memberId: testMemberId,
        foodId: testFood2.id,
        quantity: 3,
        unit: '个',
        purchasePrice: 12.5,
        purchaseSource: 'Test Store',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        storageLocation: StorageLocation.PANTRY,
        minStockThreshold: 1
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.quantity).toBe(3)
      expect(data.data.purchasePrice).toBe(12.5)
      expect(data.data.status).toBe(InventoryStatus.FRESH)

      // 清理
      await prisma.inventoryItem.delete({
        where: { id: data.data.id }
      })
      await prisma.food.delete({
        where: { id: testFood2.id }
      })
    })

    it('should return error for missing required fields', async () => {
      const requestBody = {
        memberId: testMemberId,
        // 缺少 foodId
        quantity: 5,
        unit: '个'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('缺少必需字段')
    })

    it('should return error for invalid quantity', async () => {
      const requestBody = {
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: -1,
        unit: '个'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('数量必须大于0')
    })

    it('should return error for invalid food ID', async () => {
      const requestBody = {
        memberId: testMemberId,
        foodId: 'invalid-food-id',
        quantity: 5,
        unit: '个'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('无效的请求格式')
    })
  })
})
