/**
 * OCR服务单元测试
 */

import { OcrService, SUPPORTED_MIME_TYPES } from '@/lib/services/ocr-service';

describe('OcrService', () => {
  describe('isSupportedMimeType', () => {
    it('应该支持PDF格式', () => {
      expect(OcrService.isSupportedMimeType('application/pdf')).toBe(true);
    });

    it('应该支持JPEG格式', () => {
      expect(OcrService.isSupportedMimeType('image/jpeg')).toBe(true);
      expect(OcrService.isSupportedMimeType('image/jpg')).toBe(true);
    });

    it('应该支持PNG格式', () => {
      expect(OcrService.isSupportedMimeType('image/png')).toBe(true);
    });

    it('应该支持WebP格式', () => {
      expect(OcrService.isSupportedMimeType('image/webp')).toBe(true);
    });

    it('应该拒绝不支持的文件类型', () => {
      expect(OcrService.isSupportedMimeType('text/plain')).toBe(false);
      expect(OcrService.isSupportedMimeType('video/mp4')).toBe(false);
      expect(OcrService.isSupportedMimeType('application/json')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('应该接受10MB以内的文件', () => {
      const tenMB = 10 * 1024 * 1024;
      expect(OcrService.validateFileSize(tenMB)).toBe(true);
      expect(OcrService.validateFileSize(tenMB - 1)).toBe(true);
      expect(OcrService.validateFileSize(0)).toBe(true);
    });

    it('应该拒绝超过10MB的文件', () => {
      const tenMB = 10 * 1024 * 1024;
      expect(OcrService.validateFileSize(tenMB + 1)).toBe(false);
      expect(OcrService.validateFileSize(tenMB * 2)).toBe(false);
    });
  });

  describe('recognize', () => {
    // 注意：实际的OCR识别测试需要真实的图片/PDF文件
    // 这里只测试错误处理和边界情况

    it('应该拒绝不支持的文件类型', async () => {
      const buffer = Buffer.from('test');
      
      await expect(
        OcrService.recognize(buffer, 'text/plain' as any)
      ).rejects.toThrow('不支持的文件类型');
    });

    it('应该处理空缓冲区', async () => {
      const emptyBuffer = Buffer.from('');
      
      // PDF为空时应抛出错误
      await expect(
        OcrService.recognize(emptyBuffer, 'application/pdf')
      ).rejects.toThrow();
    });
  });

  describe('常量验证', () => {
    it('SUPPORTED_MIME_TYPES应该包含预期的类型', () => {
      expect(SUPPORTED_MIME_TYPES).toContain('application/pdf');
      expect(SUPPORTED_MIME_TYPES).toContain('image/jpeg');
      expect(SUPPORTED_MIME_TYPES).toContain('image/png');
      expect(SUPPORTED_MIME_TYPES).toContain('image/webp');
    });
  });
});

