/**
 * OCR文本识别服务
 *
 * 支持PDF和图片文件的OCR识别，提取体检报告中的文本内容
 * MVP阶段使用Tesseract.js（开源免费），后续可升级到Azure OCR（更高精度）
 */

import Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import sharp from 'sharp';

/**
 * 支持的MIME类型
 */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * OCR识别结果
 */
export interface OcrResult {
  text: string;
  confidence: number;
  processingTime: number;
}

/**
 * OCR服务类
 */
export class OcrService {
  /**
   * 验证文件类型是否支持
   */
  static isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
    return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
  }

  /**
   * 验证文件大小（限制10MB）
   */
  static validateFileSize(fileSize: number): boolean {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    return fileSize <= MAX_SIZE;
  }

  /**
   * 图片预处理：增强对比度和清晰度
   */
  private static async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // 使用sharp进行图片预处理
      const processed = await sharp(imageBuffer)
        .greyscale() // 转换为灰度图
        .normalize() // 归一化对比度
        .sharpen() // 锐化
        .toBuffer();

      return processed;
    } catch (error) {
      console.warn('图片预处理失败，使用原始图片:', error);
      return imageBuffer;
    }
  }

  /**
   * 识别图片中的文本
   */
  private static async recognizeImage(
    imageBuffer: Buffer,
    language: string = 'chi_sim+eng', // 中文简体+英文
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      // 预处理图片
      const processedBuffer = await this.preprocessImage(imageBuffer);

      // 执行OCR识别
      const {
        data: { text, confidence },
      } = await Tesseract.recognize(processedBuffer, language, {
        logger: (m) => {
          // 可选：记录OCR进度
          if (m.status === 'recognizing text') {
            console.log(`OCR进度: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const processingTime = Date.now() - startTime;

      return {
        text: text.trim(),
        confidence: confidence || 0,
        processingTime,
      };
    } catch (error) {
      console.error('OCR识别失败:', error);
      throw new Error(
        `OCR识别失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 识别PDF中的文本
   */
  private static async recognizePdf(pdfBuffer: Buffer): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      // 尝试提取PDF文本
      const data = await pdfParse(pdfBuffer);

      if (data.text && data.text.trim().length > 0) {
        // 文本型PDF，直接返回文本
        return {
          text: data.text.trim(),
          confidence: 100, // PDF文本层通常是100%准确
          processingTime: Date.now() - startTime,
        };
      }

      // 图片型PDF需要先转换为图片，然后OCR识别
      // 这里简化处理，提示需要额外的PDF转换工具
      throw new Error(
        '图片型PDF需要先转换为图片。建议使用pdf-poppler或pdf2pic等工具',
      );
    } catch (error) {
      console.error('PDF识别失败:', error);
      throw new Error(
        `PDF识别失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 识别文件中的文本（主入口方法）
   */
  static async recognize(
    fileBuffer: Buffer,
    mimeType: SupportedMimeType,
  ): Promise<OcrResult> {
    // 验证文件类型
    if (!this.isSupportedMimeType(mimeType)) {
      throw new Error(`不支持的文件类型: ${mimeType}`);
    }

    // 根据文件类型选择识别方法
    if (mimeType === 'application/pdf') {
      return await this.recognizePdf(fileBuffer);
    } else {
      // 图片类型
      return await this.recognizeImage(fileBuffer);
    }
  }

  /**
   * 批量识别（用于多页PDF）
   */
  static async recognizeBatch(
    fileBuffers: Buffer[],
    mimeType: SupportedMimeType,
  ): Promise<OcrResult[]> {
    const results: OcrResult[] = [];

    for (const buffer of fileBuffers) {
      const result = await this.recognize(buffer, mimeType);
      results.push(result);
    }

    return results;
  }
}

// 导出单例实例
export const ocrService = new OcrService();
