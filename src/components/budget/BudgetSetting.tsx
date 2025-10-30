'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { format, addWeeks, addMonths, addQuarters } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { BudgetPeriod, FoodCategory } from '@prisma/client'

const budgetFormSchema = z.object({
  name: z.string().min(1, '预算名称不能为空'),
  period: z.nativeEnum(BudgetPeriod),
  startDate: z.date({
    required_error: '请选择开始日期',
  }),
  endDate: z.date({
    required_error: '请选择结束日期',
  }),
  totalAmount: z.number().min(1, '总预算必须大于0'),
  vegetableBudget: z.number().min(0).optional(),
  meatBudget: z.number().min(0).optional(),
  fruitBudget: z.number().min(0).optional(),
  grainBudget: z.number().min(0).optional(),
  dairyBudget: z.number().min(0).optional(),
  otherBudget: z.number().min(0).optional(),
  alertThreshold80: z.boolean().default(true),
  alertThreshold100: z.boolean().default(true),
  alertThreshold110: z.boolean().default(true),
}).refine((data) => data.endDate > data.startDate, {
  message: '结束日期必须晚于开始日期',
  path: ['endDate'],
}).refine((data) => {
  const categoryTotal = 
    (data.vegetableBudget || 0) +
    (data.meatBudget || 0) +
    (data.fruitBudget || 0) +
    (data.grainBudget || 0) +
    (data.dairyBudget || 0) +
    (data.otherBudget || 0)
  return categoryTotal <= data.totalAmount
}, {
  message: '分类预算总和不能超过总预算',
  path: ['totalAmount'],
})

type BudgetFormData = z.infer<typeof budgetFormSchema>

interface BudgetSettingProps {
  memberId: string
  onSuccess?: (budget: any) => void
  onCancel?: () => void
  initialData?: Partial<BudgetFormData>
}

const periodOptions = [
  { value: BudgetPeriod.WEEKLY, label: '周预算', description: '7天周期' },
  { value: BudgetPeriod.MONTHLY, label: '月预算', description: '30天周期' },
  { value: BudgetPeriod.QUARTERLY, label: '季度预算', description: '90天周期' },
  { value: BudgetPeriod.YEARLY, label: '年预算', description: '365天周期' },
  { value: BudgetPeriod.CUSTOM, label: '自定义', description: '自定义日期范围' },
]

const categoryFields = [
  { key: 'vegetableBudget', label: '蔬菜类预算', icon: '🥬', color: 'bg-green-100 text-green-800' },
  { key: 'meatBudget', label: '肉类预算', icon: '🥩', color: 'bg-red-100 text-red-800' },
  { key: 'fruitBudget', label: '水果类预算', icon: '🍎', color: 'bg-orange-100 text-orange-800' },
  { key: 'grainBudget', label: '谷物类预算', icon: '🌾', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'dairyBudget', label: '乳制品预算', icon: '🥛', color: 'bg-blue-100 text-blue-800' },
  { key: 'otherBudget', label: '其他类预算', icon: '📦', color: 'bg-gray-100 text-gray-800' },
] as const

export function BudgetSetting({ memberId, onSuccess, onCancel, initialData }: BudgetSettingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      period: initialData?.period || BudgetPeriod.MONTHLY,
      startDate: initialData?.startDate || new Date(),
      endDate: initialData?.endDate || addMonths(new Date(), 1),
      totalAmount: initialData?.totalAmount || 0,
      vegetableBudget: initialData?.vegetableBudget || 0,
      meatBudget: initialData?.meatBudget || 0,
      fruitBudget: initialData?.fruitBudget || 0,
      grainBudget: initialData?.grainBudget || 0,
      dairyBudget: initialData?.dairyBudget || 0,
      otherBudget: initialData?.otherBudget || 0,
      alertThreshold80: initialData?.alertThreshold80 ?? true,
      alertThreshold100: initialData?.alertThreshold100 ?? true,
      alertThreshold110: initialData?.alertThreshold110 ?? true,
    },
  })

  const selectedPeriod = form.watch('period')
  const totalAmount = form.watch('totalAmount')
  const categoryValues = form.watch(['vegetableBudget', 'meatBudget', 'fruitBudget', 'grainBudget', 'dairyBudget', 'otherBudget'])
  const categoryTotal = categoryValues.reduce((sum, value) => sum + (value || 0), 0)
  const remainingForOther = totalAmount - categoryTotal

  // 自动设置日期范围
  const handlePeriodChange = (period: BudgetPeriod) => {
    const startDate = new Date()
    let endDate: Date

    switch (period) {
      case BudgetPeriod.WEEKLY:
        endDate = addWeeks(startDate, 1)
        break
      case BudgetPeriod.MONTHLY:
        endDate = addMonths(startDate, 1)
        break
      case BudgetPeriod.QUARTERLY:
        endDate = addQuarters(startDate, 1)
        break
      case BudgetPeriod.YEARLY:
        endDate = addMonths(startDate, 12)
        break
      case BudgetPeriod.CUSTOM:
        // 保持当前日期
        return
    }

    form.setValue('startDate', startDate)
    form.setValue('endDate', endDate)
  }

  // 平均分配分类预算
  const distributeEvenly = () => {
    const evenAmount = totalAmount / 6
    categoryFields.forEach(field => {
      form.setValue(field.key as any, Math.floor(evenAmount))
    })
  }

  // 提交表单
  const onSubmit = async (data: BudgetFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/budget/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          memberId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '创建预算失败')
      }

      const budget = await response.json()
      onSuccess?.(budget)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建预算失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          预算设定
        </CardTitle>
        <CardDescription>
          设定您的饮食预算，系统将帮您追踪支出并优化成本
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>预算名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：2024年1月饮食预算" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>预算周期</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value)
                      handlePeriodChange(value as BudgetPeriod)
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择预算周期" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-sm text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 日期选择 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>开始日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy-MM-dd")
                            ) : (
                              <span>选择日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            selectedPeriod !== BudgetPeriod.CUSTOM && date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>结束日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy-MM-dd")
                            ) : (
                              <span>选择日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            selectedPeriod !== BudgetPeriod.CUSTOM || 
                            (form.getValues('startDate') && date <= form.getValues('startDate'))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 总预算 */}
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>总预算金额（元）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="输入总预算金额"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    这是您在预算周期内的总饮食支出预算
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 分类预算 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">分类预算设定</h3>
                  <p className="text-sm text-muted-foreground">
                    为不同食材类别设定预算限额（可选）
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={distributeEvenly}
                  disabled={!totalAmount}
                >
                  平均分配
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryFields.map((field) => (
                  <FormField
                    key={field.key}
                    control={form.control}
                    name={field.key as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", field.color)}>
                            {field.icon} {field.label}
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...formField}
                            onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {/* 分类预算汇总 */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">分类预算总计：</span>
                    <span className="font-medium ml-1">¥{categoryTotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">剩余可用：</span>
                    <span className={`font-medium ml-1 ${remainingForOther < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ¥{remainingForOther.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">使用率：</span>
                    <span className={`font-medium ml-1 ${categoryTotal > totalAmount ? 'text-red-600' : ''}`}>
                      {totalAmount > 0 ? ((categoryTotal / totalAmount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div>
                    {categoryTotal > totalAmount && (
                      <Badge variant="destructive" className="text-xs">
                        超出总预算
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 预警设置 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">预算预警设置</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="alertThreshold80"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">80%预警</FormLabel>
                        <FormDescription className="text-sm">
                          预算使用达到80%时提醒
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertThreshold100"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">100%预警</FormLabel>
                        <FormDescription className="text-sm">
                          预算用完时提醒
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertThreshold110"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">110%超支预警</FormLabel>
                        <FormDescription className="text-sm">
                          预算超支10%时提醒
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  取消
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '创建中...' : '创建预算'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
