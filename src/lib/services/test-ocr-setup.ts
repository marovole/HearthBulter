/**
 * 测试医疗报告OCR功能配置
 * 
 * 运行方式：npm run test:ocr-setup
 */

// 动态导入服务类以避免循环依赖

async function testOcrSetup() {
  console.log('🔍 检查医疗报告OCR功能配置...\n')

  // 1. 检查OCR服务
  console.log('1. 检查OCR服务...')
  try {
    const { OcrService } = await import('./ocr-service')
    const isSupported = OcrService.isSupportedMimeType('image/jpeg')
    const isValidSize = OcrService.validateFileSize(1024 * 1024) // 1MB
    
    console.log('   ✅ OCR服务配置正常')
    console.log(`   - 支持的文件类型验证: ${isSupported}`)
    console.log(`   - 文件大小验证: ${isValidSize}`)
  } catch (error) {
    console.error('   ❌ OCR服务配置错误:', error)
  }

  // 2. 检查报告解析器
  console.log('\n2. 检查报告解析器...')
  try {
    const { ReportParser } = await import('./report-parser')
    const testText = '总胆固醇: 5.2 mmol/L\n血糖: 6.0 mmol/L'
    const parsed = ReportParser.parse(testText)
    console.log('   ✅ 报告解析器配置正常')
    console.log(`   - 识别到 ${parsed.indicators.length} 个指标`)
  } catch (error) {
    console.error('   ❌ 报告解析器配置错误:', error)
  }

  // 3. 检查文件存储服务
  console.log('\n3. 检查文件存储服务...')
  try {
    const { FileStorageService } = await import('./file-storage-service')
    const isValidSize = FileStorageService.validateFileSize(1024 * 1024)
    console.log('   ✅ 文件存储服务配置正常')
    console.log(`   - 文件大小验证: ${isValidSize}`)
    console.log('   ⚠️  注意: 需要配置 BLOB_READ_WRITE_TOKEN 才能上传文件')
  } catch (error) {
    console.error('   ❌ 文件存储服务配置错误:', error)
  }

  // 4. 检查环境变量
  console.log('\n4. 检查环境变量...')
  const hasDatabaseUrl = !!process.env.DATABASE_URL
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
  
  console.log(`   DATABASE_URL: ${hasDatabaseUrl ? '✅ 已配置' : '❌ 未配置'}`)
  console.log(`   BLOB_READ_WRITE_TOKEN: ${hasBlobToken ? '✅ 已配置' : '❌ 未配置'}`)
  
  if (!hasDatabaseUrl) {
    console.log('\n   ⚠️  请设置 DATABASE_URL 环境变量')
    console.log('   参考: MEDICAL_REPORT_SETUP.md')
  }
  
  if (!hasBlobToken) {
    console.log('\n   ⚠️  请设置 BLOB_READ_WRITE_TOKEN 环境变量')
    console.log('   参考: MEDICAL_REPORT_SETUP.md')
  }

  console.log('\n✅ 配置检查完成！')
  console.log('\n下一步:')
  console.log('1. 配置环境变量（参考 MEDICAL_REPORT_SETUP.md）')
  console.log('2. 运行数据库迁移: npm run db:push')
  console.log('3. 启动开发服务器: npm run dev')
}

// 如果直接运行此脚本
if (require.main === module) {
  testOcrSetup().catch(console.error)
}

export { testOcrSetup }

