/**
 * 医疗报告OCR和解析功能测试脚本
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { ocrService } from '../src/lib/services/ocr-service'
import { ReportParser } from '../src/lib/services/report-parser'

async function testMedicalReportOcr() {
  console.log('🧪 开始测试医疗报告OCR功能...\n')

  try {
    // 测试1: 直接文本解析（模拟OCR成功后的文本）
    console.log('📝 测试1: 文本解析功能')
    const sampleText = readFileSync(
      join(__dirname, '../test-data/medical-reports/sample-report-1.txt'),
      'utf-8'
    )

    const parsedReport = ReportParser.parse(sampleText)
    console.log(`✅ 成功解析出 ${parsedReport.indicators.length} 个指标`)
    
    // 显示解析结果
    parsedReport.indicators.forEach((indicator, index) => {
      console.log(`   ${index + 1}. ${indicator.name}: ${indicator.value} ${indicator.unit} (${indicator.status})`)
    })

    console.log(`📅 报告日期: ${parsedReport.reportDate?.toISOString() || '未识别'}`)
    console.log(`🏥 体检机构: ${parsedReport.institution || '未识别'}`)
    console.log(`📋 报告类型: ${parsedReport.reportType || '未识别'}\n`)

    // 验证解析结果
    const validation = ReportParser.validate(parsedReport)
    if (validation.valid) {
      console.log('✅ 解析结果验证通过')
    } else {
      console.log('❌ 解析结果验证失败:')
      validation.errors.forEach(error => console.log(`   - ${error}`))
    }

    // 测试2: 检查关键指标
    console.log('\n🔍 测试2: 关键指标检查')
    const keyIndicators = ['TOTAL_CHOLESTEROL', 'FASTING_GLUCOSE', 'ALT', 'CREATININE']
    
    keyIndicators.forEach(type => {
      const indicator = parsedReport.indicators.find(ind => ind.indicatorType === type)
      if (indicator) {
        console.log(`   ✅ ${indicator.name}: ${indicator.value} ${indicator.unit} (${indicator.status})`)
      } else {
        console.log(`   ❌ 未找到指标: ${type}`)
      }
    })

    // 测试3: 异常值检测
    console.log('\n⚠️  测试3: 异常值检测')
    const abnormalIndicators = parsedReport.indicators.filter(ind => ind.isAbnormal)
    console.log(`   检测到 ${abnormalIndicators.length} 个异常指标:`)
    
    abnormalIndicators.forEach(indicator => {
      console.log(`   - ${indicator.name}: ${indicator.value} ${indicator.unit} (${indicator.status})`)
    })

    console.log('\n🎉 医疗报告OCR功能测试完成！')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testMedicalReportOcr()
}

export { testMedicalReportOcr }
