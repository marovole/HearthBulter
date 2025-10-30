/**
 * USDA Service Tests
 * Unit tests for USDA API integration service
 */

import { USDAService } from '@/lib/services/usda-service'

// Mock fetch
global.fetch = jest.fn()

describe('USDA Service', () => {
  const apiKey = 'test-api-key'
  let service: USDAService

  beforeEach(() => {
    service = new USDAService(apiKey)
    jest.clearAllMocks()
  })

  describe('searchFoods', () => {
    it('should search foods successfully', async () => {
      const mockResponse = {
        foods: [
          {
            fdcId: 123456,
            description: 'Chicken breast',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 165 },
              { nutrientId: 1003, nutrientName: 'Protein', value: 23 },
              { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0 },
              { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 1.2 },
            ],
          },
        ],
        totalHits: 1,
        currentPage: 1,
        totalPages: 1,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await service.searchFoods('chicken')

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('chicken'),
        expect.any(Object)
      )
    })

    it('should handle API errors with retry', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ foods: [], totalHits: 0, currentPage: 1, totalPages: 0 }),
        })

      const result = await service.searchFoods('chicken')

      expect(result.foods).toEqual([])
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle rate limit errors', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ foods: [], totalHits: 0, currentPage: 1, totalPages: 0 }),
        })

      const result = await service.searchFoods('chicken')

      expect(result.foods).toEqual([])
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new USDAService()

      await expect(serviceWithoutKey.searchFoods('chicken')).rejects.toThrow(
        'USDA API key is not configured'
      )
    })
  })

  describe('getFoodByFdcId', () => {
    it('should get food by FDC ID successfully', async () => {
      const mockFood = {
        fdcId: 123456,
        description: 'Chicken breast',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', value: 165 },
          { nutrientId: 1003, nutrientName: 'Protein', value: 23 },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFood,
      })

      const result = await service.getFoodByFdcId(123456)

      expect(result).toEqual(mockFood)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('123456'),
        expect.any(Object)
      )
    })

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new USDAService()

      await expect(serviceWithoutKey.getFoodByFdcId(123456)).rejects.toThrow(
        'USDA API key is not configured'
      )
    })
  })

  describe('searchAndMapFoods', () => {
    it('should search and map foods to local format', async () => {
      const mockResponse = {
        foods: [
          {
            fdcId: 123456,
            description: 'Chicken breast',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 165 },
              { nutrientId: 1003, nutrientName: 'Protein', value: 23 },
              { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0 },
              { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 1.2 },
            ],
          },
        ],
        totalHits: 1,
        currentPage: 1,
        totalPages: 1,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await service.searchAndMapFoods('chicken', 10)

      expect(result).toHaveLength(1)
      expect(result[0].nameEn).toBe('Chicken breast')
      expect(result[0].calories).toBe(165)
      expect(result[0].protein).toBe(23)
      expect(result[0].carbs).toBe(0)
      expect(result[0].fat).toBe(1.2)
      expect(result[0].source).toBe('USDA')
      expect(result[0].usdaId).toBe('123456')
    })

    it('should translate Chinese food names to English for USDA search', async () => {
      const mockResponse = {
        foods: [
          {
            fdcId: 789012,
            description: 'broccoli',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 34 },
              { nutrientId: 1003, nutrientName: 'Protein', value: 2.8 },
              { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 7 },
              { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 0.4 },
            ],
          },
        ],
        totalHits: 1,
        currentPage: 1,
        totalPages: 1,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      // 测试中文搜索会被翻译为英文
      const result = await service.searchFoods('西兰花')

      expect(result.foods).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('broccoli'),
        expect.any(Object)
      )
    })

    it('should handle English food names correctly', async () => {
      const mockResponse = {
        foods: [
          {
            fdcId: 345678,
            description: 'beef',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 250 },
              { nutrientId: 1003, nutrientName: 'Protein', value: 26 },
            ],
          },
        ],
        totalHits: 1,
        currentPage: 1,
        totalPages: 1,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await service.searchFoods('beef')

      expect(result.foods).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('beef'),
        expect.any(Object)
      )
    })

    it('should map Chinese food names in search results', async () => {
      const mockResponse = {
        foods: [
          {
            fdcId: 456789,
            description: 'tomato',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 18 },
              { nutrientId: 1003, nutrientName: 'Protein', value: 0.9 },
            ],
          },
        ],
        totalHits: 1,
        currentPage: 1,
        totalPages: 1,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await service.searchAndMapFoods('番茄', 10)

      expect(result).toHaveLength(1)
      // 验证映射后的数据包含中英文名称
      expect(result[0].nameEn).toBe('tomato')
      expect(result[0].name).toBeTruthy() // 应该有中文名
    })
  })
})

