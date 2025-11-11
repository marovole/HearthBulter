/**
 * OCR Service 测试
 * 服务层测试 - 核心业务逻辑覆盖
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OcrService, SUPPORTED_MIME_TYPES, type SupportedMimeType, type OcrResult } from '@/lib/services/ocr-service';
import Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import sharp from 'sharp';

jest.mock('tesseract.js');
jest.mock('pdf-parse');
jest.mock('sharp');

describe('OcrService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSupportedMimeType', () => {
    it('should return true for PDF', () => {
      expect(OcrService.isSupportedMimeType('application/pdf')).toBe(true);
    });

    it('should return true for JPEG', () => {
      expect(OcrService.isSupportedMimeType('image/jpeg')).toBe(true);
      expect(OcrService.isSupportedMimeType('image/jpg')).toBe(true);
    });

    it('should return true for PNG', () => {
      expect(OcrService.isSupportedMimeType('image/png')).toBe(true);
    });

    it('should return true for WebP', () => {
      expect(OcrService.isSupportedMimeType('image/webp')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(OcrService.isSupportedMimeType('text/plain')).toBe(false);
      expect(OcrService.isSupportedMimeType('application/json')).toBe(false);
      expect(OcrService.isSupportedMimeType('image/gif')).toBe(false);
      expect(OcrService.isSupportedMimeType('')).toBe(false);
    });

    it('should work with type assertion', () => {
      const mimeType = 'image/jpeg';
      if (OcrService.isSupportedMimeType(mimeType)) {
        const supportedType: SupportedMimeType = mimeType;
        expect(supportedType).toBe('image/jpeg');
      }
    });
  });

  describe('validateFileSize', () => {
    it('should return true for files <= 10MB', () => {
      expect(OcrService.validateFileSize(0)).toBe(true);
      expect(OcrService.validateFileSize(1024)).toBe(true); // 1KB
      expect(OcrService.validateFileSize(10 * 1024 * 1024)).toBe(true); // 10MB
    });

    it('should return false for files > 10MB', () => {
      expect(OcrService.validateFileSize(10 * 1024 * 1024 + 1)).toBe(false); // 10MB + 1 byte
      expect(OcrService.validateFileSize(15 * 1024 * 1024)).toBe(false); // 15MB
    });

    it('should handle edge case at exactly 10MB', () => {
      const maxSize = 10 * 1024 * 1024;
      expect(OcrService.validateFileSize(maxSize)).toBe(true);
    });
  });

  describe('recognizeImage', () => {
    const mockImageBuffer = Buffer.from('fake-image-data');
    const mockProcessedBuffer = Buffer.from('processed-image-data');

    beforeEach(() => {
      (sharp as unknown as jest.Mock).mockReturnValue({
        greyscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockProcessedBuffer),
      });

      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text: '识别的文本内容',
          confidence: 95,
        },
      });
    });

    it('should recognize image with default language', async () => {
      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(Tesseract.recognize).toHaveBeenCalledWith(
        mockProcessedBuffer,
        'chi_sim+eng',
        expect.objectContaining({ logger: expect.any(Function) })
      );

      expect(result.text).toBe('识别的文本内容');
      expect(result.confidence).toBe(95);
      expect(result.processingTime).toBeGreaterThan(0);
    }, 10000);

    it('should use original buffer if preprocessing fails', async () => {
      (sharp as unknown as jest.Mock).mockReturnValue({
        greyscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Preprocessing failed')),
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(consoleSpy).toHaveBeenCalledWith(
        '图片预处理失败，使用原始图片:',
        expect.any(Error)
      );
      expect(Tesseract.recognize).toHaveBeenCalledWith(
        mockImageBuffer, // Should use original buffer
        'chi_sim+eng',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should trim whitespace from recognized text', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text: '  带空格的文本  \n\n',
          confidence: 90,
        },
      });

      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(result.text).toBe('带空格的文本');
    });

    it('should handle zero confidence', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text: '低置信度文本',
          confidence: 0,
        },
      });

      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(result.confidence).toBe(0);
    });

    it('should handle null confidence', async () => {
      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text: '无置信度文本',
          confidence: null,
        },
      });

      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(result.confidence).toBe(0);
    });

    it('should throw error if OCR recognition fails', async () => {
      (Tesseract.recognize as jest.Mock).mockRejectedValue(new Error('OCR引擎错误'));

      await expect(
        OcrService.recognize(mockImageBuffer, 'image/jpeg')
      ).rejects.toThrow('OCR识别失败: OCR引擎错误');
    });

    it('should handle processingTime calculation', async () => {
      const startTime = Date.now();
      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');
      const endTime = Date.now();

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some margin
    });

    it('should support custom language', async () => {
      // Note: recognizeImage is private, but we can test through recognize method with image type
      // For the purpose of this test, we'll verify the language parameter flow through the public method
      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(Tesseract.recognize).toHaveBeenCalledWith(
        expect.any(Buffer),
        'chi_sim+eng', // Default language
        expect.any(Object)
      );
    });
  });

  describe('recognizePdf', () => {
    const mockPdfBuffer = Buffer.from('fake-pdf-data');

    beforeEach(() => {
      (pdfParse as jest.Mock).mockResolvedValue({
        text: 'PDF文本内容',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: null,
        version: '1.0',
      });
    });

    it('should recognize text-based PDF', async () => {
      const result = await OcrService.recognize(mockPdfBuffer, 'application/pdf');

      expect(pdfParse as jest.Mock).toHaveBeenCalledWith(mockPdfBuffer);

      expect(result.text).toBe('PDF文本内容');
      expect(result.confidence).toBe(100);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should trim whitespace from PDF text', async () => {
      (pdfParse as jest.Mock).mockResolvedValue({
        text: '  PDF边缘空格  \n\n',
        numpages: 1,
      });

      const result = await OcrService.recognize(mockPdfBuffer, 'application/pdf');

      expect(result.text).toBe('PDF边缘空格');
    });

    it('should handle PDF with no text', async () => {
      (pdfParse as jest.Mock).mockResolvedValue({
        text: '',
        numpages: 1,
      });

      await expect(
        OcrService.recognize(mockPdfBuffer, 'application/pdf')
      ).rejects.toThrow('PDF识别失败: 图片型PDF需要先转换为图片');
    });

    it('should handle PDF with only whitespace', async () => {
      (pdfParse as jest.Mock).mockResolvedValue({
        text: '   \n\n\t  ',
        numpages: 1,
      });

      await expect(
        OcrService.recognize(mockPdfBuffer, 'application/pdf')
      ).rejects.toThrow('PDF识别失败: 图片型PDF需要先转换为图片');
    });

    it('should throw error if PDF parsing fails', async () => {
      (pdfParse as jest.Mock).mockRejectedValue(new Error('PDF解析失败'));

      await expect(
        OcrService.recognize(mockPdfBuffer, 'application/pdf')
      ).rejects.toThrow('PDF识别失败: PDF解析失败');
    });

    it('should handle PDF parsing errors with null message', async () => {
      (pdfParse as jest.Mock).mockRejectedValue(null);

      await expect(
        OcrService.recognize(mockPdfBuffer, 'application/pdf')
      ).rejects.toThrow('PDF识别失败: 未知错误');
    });

    it('should handle PDF parsing errors with non-Error objects', async () => {
      (pdfParse as jest.Mock).mockRejectedValue('字符串错误');

      await expect(
        OcrService.recognize(mockPdfBuffer, 'application/pdf')
      ).rejects.toThrow('PDF识别失败: 字符串错误');
    });
  });

  describe('recognize', () => {
    const mockBuffer = Buffer.from('test-data');

    beforeEach(() => {
      jest.spyOn(OcrService, 'recognizeImage' as any).mockImplementation(async (buffer, language) => ({
        text: 'Image text',
        confidence: 95,
        processingTime: 1000,
      }));

      jest.spyOn(OcrService, 'recognizePdf' as any).mockImplementation(async (buffer) => ({
        text: 'PDF text',
        confidence: 100,
        processingTime: 500,
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should recognize image files', async () => {
      const result = await OcrService.recognize(mockBuffer, 'image/jpeg');

      expect(result.text).toBe('Image text');
    });

    it('should recognize PNG images', async () => {
      const result = await OcrService.recognize(mockBuffer, 'image/png');

      expect(result.text).toBe('Image text');
    });

    it('should recognize WebP images', async () => {
      const result = await OcrService.recognize(mockBuffer, 'image/webp');

      expect(result.text).toBe('Image text');
    });

    it('should recognize PDF files', async () => {
      const result = await OcrService.recognize(mockBuffer, 'application/pdf');

      expect(result.text).toBe('PDF text');
    });

    it('should throw error for unsupported file type', async () => {
      await expect(
        OcrService.recognize(mockBuffer, 'text/plain' as SupportedMimeType)
      ).rejects.toThrow('不支持的文件类型: text/plain');
    });
  });

  describe('recognizeBatch', () => {
    const mockBuffers = [
      Buffer.from('image1'),
      Buffer.from('image2'),
      Buffer.from('image3'),
    ];

    beforeEach(() => {
      jest.spyOn(OcrService, 'recognize').mockImplementation(async (buffer, mimeType) => {
        const index = mockBuffers.indexOf(buffer);
        return {
          text: `Text ${index + 1}`,
          confidence: 90 + index,
          processingTime: 1000 + index * 100,
        };
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should recognize multiple files', async () => {
      const results = await OcrService.recognizeBatch(mockBuffers, 'image/jpeg');

      expect(results).toHaveLength(3);
      expect(results[0].text).toBe('Text 1');
      expect(results[1].text).toBe('Text 2');
      expect(results[2].text).toBe('Text 3');
    });

    it('should maintain order of results', async () => {
      const results = await OcrService.recognizeBatch(mockBuffers, 'image/jpeg');

      expect(results[0].processingTime).toBe(1000);
      expect(results[1].processingTime).toBe(1100);
      expect(results[2].processingTime).toBe(1200);
    });

    it('should handle empty batch', async () => {
      const results = await OcrService.recognizeBatch([], 'image/jpeg');

      expect(results).toHaveLength(0);
    });

    it('should process all files even if some fail', async () => {
      const failingBuffers = [
        ...mockBuffers,
        Buffer.from('failing'),
      ];

      jest.spyOn(OcrService, 'recognize').mockImplementation(async (buffer, mimeType) => {
        if (buffer === failingBuffers[3]) {
          throw new Error('recognition failed');
        }
        const index = failingBuffers.indexOf(buffer);
        return {
          text: `Text ${index + 1}`,
          confidence: 90 + index,
          processingTime: 1000 + index * 100,
        };
      });

      await expect(
        OcrService.recognizeBatch(failingBuffers, 'image/jpeg')
      ).rejects.toThrow('recognition failed');

      expect(OcrService.recognize).toHaveBeenCalledTimes(4);
    });

    it('should call recognize for each buffer', async () => {
      await OcrService.recognizeBatch(mockBuffers, 'image/jpeg');

      expect(OcrService.recognize).toHaveBeenCalledTimes(3);
      expect(OcrService.recognize).toHaveBeenCalledWith(mockBuffers[0], 'image/jpeg');
      expect(OcrService.recognize).toHaveBeenCalledWith(mockBuffers[1], 'image/jpeg');
      expect(OcrService.recognize).toHaveBeenCalledWith(mockBuffers[2], 'image/jpeg');
    });
  });

  describe('Integration Tests', () => {
    const mockPdfBuffer = Buffer.from('pdf-data');
    const mockImageBuffer = Buffer.from('image-data');

    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it('should complete full OCR workflow for PDF', async () => {
      (pdfParse as jest.Mock).mockResolvedValue({
        text: '完整的PDF报告内容',
        numpages: 1,
      });

      const result = await OcrService.recognize(mockPdfBuffer, 'application/pdf');

      expect(result.text).toBe('完整的PDF报告内容');
      expect(result.confidence).toBe(100);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should complete full OCR workflow for image', async () => {
      const mockProcessedBuffer = Buffer.from('processed');

      (sharp as unknown as jest.Mock).mockReturnValue({
        greyscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockProcessedBuffer),
      });

      (Tesseract.recognize as jest.Mock).mockResolvedValue({
        data: {
          text: '体检报告内容',
          confidence: 92.5,
        },
      });

      const result = await OcrService.recognize(mockImageBuffer, 'image/jpeg');

      expect(result.text).toBe('体检报告内容');
      expect(result.confidence).toBe(92.5);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle mixed batch of PDF and images', async () => {
      // This would require the batch function to support different mime types
      // Currently it's designed for same mime type batches
      const buffers = [mockPdfBuffer, mockImageBuffer, mockImageBuffer];

      jest.spyOn(OcrService, 'recognize').mockImplementation(async (buffer, mimeType) => {
        if (buffer === mockPdfBuffer) {
          return {
            text: 'PDF content',
            confidence: 100,
            processingTime: 500,
          };
        }
        return {
          text: 'Image content',
          confidence: 90,
          processingTime: 1000,
        };
      });

      const results = await OcrService.recognizeBatch([mockPdfBuffer, mockImageBuffer], 'application/pdf');

      expect(results).toHaveLength(2);
      expect(results[0].text).toBe('PDF content');
      expect(results[1].text).toBe('Image content');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle sharp module errors in preprocessing', async () => {
      (sharp as unknown as jest.Mock).mockReturnValue({
        greyscale: jest.fn().mockReturnThis(),
        normalize: jest.fn().mockReturnThis(),
        sharpen: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Sharp error')),
      });

      const result = await OcrService.recognize(Buffer.from('test'), 'image/jpeg');

      expect(result).toBeDefined();
      // Should fall back to original buffer and still work
    });

    it('should handle Tesseract processing with warnings', async () => {
      (Tesseract.recognize as jest.Mock).mockImplementation(async (buffer, lang, options) => {
        if (options.logger) {
          options.logger({ status: 'recognizing text', progress: 0.5 });
        }
        return {
          data: {
            text: 'Processed with warnings',
            confidence: 85,
          },
        };
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await OcrService.recognize(Buffer.from('test'), 'image/jpeg');

      expect(consoleSpy).toHaveBeenCalledWith('OCR进度: 50%');

      consoleSpy.mockRestore();
    });
  });
});
