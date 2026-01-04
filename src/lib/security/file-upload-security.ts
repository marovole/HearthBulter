import { logger } from '@/lib/logging/structured-logger';
import path from 'path';
import crypto from 'crypto';

// 文件类型配置
interface FileTypeConfig {
  mimeTypes: string[];
  extensions: string[];
  maxSize: number; // bytes
  allowed: boolean;
}

// 文件扫描结果
interface FileScanResult {
  safe: boolean;
  threats: string[];
  fileType: string;
  actualExtension?: string;
  fileSize: number;
  checksum: string;
}

// 上传配置
interface UploadConfig {
  maxFileSize: number;
  maxFilesPerRequest: number;
  allowedTypes: Record<string, FileTypeConfig>;
  scanEnabled: boolean;
  quarantineEnabled: boolean;
  uploadPath: string;
  quarantinePath: string;
}

// 默认文件类型配置
const DEFAULT_FILE_TYPES: Record<string, FileTypeConfig> = {
  image: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    allowed: true,
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ],
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
    maxSize: 50 * 1024 * 1024, // 50MB
    allowed: true,
  },
  archive: {
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    extensions: ['.zip', '.rar', '.7z'],
    maxSize: 100 * 1024 * 1024, // 100MB
    allowed: false, // 默认不允许压缩文件
  },
  executable: {
    mimeTypes: [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
    ],
    extensions: ['.exe', '.bat', '.cmd', '.sh', '.com', '.pif', '.scr'],
    maxSize: 0,
    allowed: false, // 永远不允许可执行文件
  },
  script: {
    mimeTypes: [
      'text/javascript',
      'application/javascript',
      'text/x-php',
      'application/x-php',
      'text/x-python',
      'application/x-python',
    ],
    extensions: ['.js', '.php', '.py', '.pl', '.rb', '.jsp', '.asp'],
    maxSize: 0,
    allowed: false, // 永远不允许脚本文件
  },
};

// 危险文件签名
const DANGEROUS_SIGNATURES = [
  Buffer.from([0x4d, 0x5a]), // PE executable (MZ)
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF executable
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Java class
  Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP archive
  Buffer.from([0x52, 0x61, 0x72, 0x21]), // RAR archive
  Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), // 7Z archive
];

// 危险内容模式
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi, // 事件处理器
  /eval\s*\(/gi,
  /document\.(write|cookie)/gi,
  /window\.(location|open)/gi,
];

/**
 * 文件上传安全管理器
 */
export class FileUploadSecurity {
  private static instance: FileUploadSecurity;
  private config: UploadConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.ensureDirectories();
  }

  static getInstance(): FileUploadSecurity {
    if (!FileUploadSecurity.instance) {
      FileUploadSecurity.instance = new FileUploadSecurity();
    }
    return FileUploadSecurity.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): UploadConfig {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';

    return {
      maxFileSize: isProduction ? 20 * 1024 * 1024 : 100 * 1024 * 1024, // 20MB / 100MB
      maxFilesPerRequest: 5,
      allowedTypes: DEFAULT_FILE_TYPES,
      scanEnabled: isProduction,
      quarantineEnabled: isProduction,
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      quarantinePath: process.env.QUARANTINE_PATH || './quarantine',
    };
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    const fs = require('fs');

    try {
      if (!fs.existsSync(this.config.uploadPath)) {
        fs.mkdirSync(this.config.uploadPath, { recursive: true });
        logger.info('创建上传目录', { path: this.config.uploadPath });
      }

      if (
        this.config.quarantineEnabled &&
        !fs.existsSync(this.config.quarantinePath)
      ) {
        fs.mkdirSync(this.config.quarantinePath, { recursive: true });
        logger.info('创建隔离目录', { path: this.config.quarantinePath });
      }
    } catch (error) {
      logger.error('创建目录失败', error as Error, {
        uploadPath: this.config.uploadPath,
        quarantinePath: this.config.quarantinePath,
      });
    }
  }

  /**
   * 扫描文件安全性
   */
  async scanFile(buffer: Buffer, filename: string): Promise<FileScanResult> {
    const threats: string[] = [];
    let safe = true;

    // 1. 检查文件大小
    if (buffer.length > this.config.maxFileSize) {
      threats.push(
        `文件大小超限: ${buffer.length} > ${this.config.maxFileSize}`,
      );
      safe = false;
    }

    // 2. 检查文件签名
    const fileType = this.detectFileType(buffer);
    const actualExtension = this.getActualExtension(buffer);

    if (this.isDangerousSignature(buffer)) {
      threats.push('检测到危险文件签名');
      safe = false;
    }

    // 3. 检查MIME类型一致性
    const declaredExtension = path.extname(filename).toLowerCase();
    const mimeConsistent = this.checkMimeConsistency(buffer, declaredExtension);

    if (!mimeConsistent) {
      threats.push('文件扩展名与内容不匹配');
      safe = false;
    }

    // 4. 检查危险内容
    if (this.isTextFile(buffer)) {
      const content = buffer.toString('utf-8');
      const dangerousContent = this.scanDangerousContent(content);

      if (dangerousContent.length > 0) {
        threats.push(`检测到危险内容: ${dangerousContent.join(', ')}`);
        safe = false;
      }
    }

    // 5. 检查文件类型权限
    const fileTypeInfo = this.getFileTypeInfo(fileType);
    if (!fileTypeInfo?.allowed) {
      threats.push(`不允许的文件类型: ${fileType}`);
      safe = false;
    }

    // 6. 生成校验和
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    const result: FileScanResult = {
      safe,
      threats,
      fileType,
      actualExtension,
      fileSize: buffer.length,
      checksum,
    };

    // 记录扫描结果
    logger.info('文件扫描完成', {
      type: 'security',
      filename,
      safe,
      threatsCount: threats.length,
      fileType,
      fileSize: buffer.length,
      checksum: `${checksum.substring(0, 16)}...`,
    });

    return result;
  }

  /**
   * 检测文件类型
   */
  private detectFileType(buffer: Buffer): string {
    // 检查文件签名
    if (buffer.length < 4) return 'unknown';

    const header = buffer.subarray(0, 4);

    // 图片文件
    if (header[0] === 0xff && header[1] === 0xd8) return 'image';
    if (header.toString('ascii', 1, 4) === 'PNG') return 'image';
    if (header.toString('ascii', 0, 3) === 'GIF') return 'image';
    if (
      header.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
      return 'image';

    // PDF文件
    if (buffer.toString('ascii', 0, 4) === '%PDF') return 'document';

    // 压缩文件
    if (header[0] === 0x50 && header[1] === 0x4b) return 'archive';

    // 可执行文件
    if (header[0] === 0x4d && header[1] === 0x5a) return 'executable';
    if (
      header[0] === 0x7f &&
      header[1] === 0x45 &&
      header[2] === 0x4c &&
      header[3] === 0x46
    )
      return 'executable';

    // 文本文件
    if (this.isTextFile(buffer)) {
      // 进一步检查是否为脚本
      const content = buffer.toString('utf-8');
      if (
        content.includes('<?php') ||
        content.includes('javascript:') ||
        content.includes('<%')
      ) {
        return 'script';
      }
      return 'document';
    }

    return 'unknown';
  }

  /**
   * 获取实际文件扩展名
   */
  private getActualExtension(buffer: Buffer): string {
    const fileType = this.detectFileType(buffer);
    const typeConfig = this.config.allowedTypes[fileType];

    if (!typeConfig || typeConfig.extensions.length === 0) {
      return '.bin';
    }

    return typeConfig.extensions[0];
  }

  /**
   * 检查危险文件签名
   */
  private isDangerousSignature(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    const header = buffer.subarray(0, Math.min(16, buffer.length));

    return DANGEROUS_SIGNATURES.some((signature) => {
      if (header.length < signature.length) return false;
      return header.subarray(0, signature.length).equals(signature);
    });
  }

  /**
   * 检查MIME类型一致性
   */
  private checkMimeConsistency(
    buffer: Buffer,
    declaredExtension: string,
  ): boolean {
    const fileType = this.detectFileType(buffer);
    const typeConfig = this.config.allowedTypes[fileType];

    if (!typeConfig) return false;

    return typeConfig.extensions.includes(declaredExtension.toLowerCase());
  }

  /**
   * 检查是否为文本文件
   */
  private isTextFile(buffer: Buffer): boolean {
    // 检查是否包含非打印字符（除了常见的控制字符）
    for (let i = 0; i < Math.min(1024, buffer.length); i++) {
      const byte = buffer[i];
      if (byte < 0x09 || (byte > 0x0d && byte < 0x20) || byte > 0x7e) {
        return false;
      }
    }
    return true;
  }

  /**
   * 扫描危险内容
   */
  private scanDangerousContent(content: string): string[] {
    const threats: string[] = [];

    DANGEROUS_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(content)) {
        threats.push(`危险模式 ${index + 1}`);
      }
    });

    return threats;
  }

  /**
   * 获取文件类型信息
   */
  private getFileTypeInfo(fileType: string): FileTypeConfig | undefined {
    return this.config.allowedTypes[fileType];
  }

  /**
   * 生成安全的文件名
   */
  generateSafeFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);

    // 清理文件名
    const cleanBase = base
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 50);

    // 添加时间戳和随机字符串
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');

    return `${cleanBase}_${timestamp}_${random}${ext}`;
  }

  /**
   * 处理文件上传
   */
  async handleUpload(
    buffer: Buffer,
    filename: string,
    userId?: string,
  ): Promise<{
    success: boolean;
    filepath?: string;
    scanResult: FileScanResult;
    error?: string;
  }> {
    try {
      // 1. 扫描文件
      const scanResult = await this.scanFile(buffer, filename);

      if (!scanResult.safe) {
        logger.warn('文件上传被拒绝 - 安全扫描失败', {
          type: 'security',
          filename,
          threats: scanResult.threats,
          userId,
        });

        if (this.config.quarantineEnabled) {
          await this.quarantineFile(buffer, filename, scanResult);
        }

        return {
          success: false,
          scanResult,
          error: `文件安全扫描失败: ${scanResult.threats.join(', ')}`,
        };
      }

      // 2. 生成安全文件名
      const safeFilename = this.generateSafeFilename(filename);
      const relativePath = userId ? `${userId}/${safeFilename}` : safeFilename;
      const filepath = path.join(this.config.uploadPath, relativePath);

      // 3. 保存文件
      await this.saveFile(buffer, filepath);

      logger.info('文件上传成功', {
        type: 'file',
        filename: safeFilename,
        originalName: filename,
        filepath,
        fileSize: scanResult.fileSize,
        fileType: scanResult.fileType,
        userId,
      });

      return {
        success: true,
        filepath,
        scanResult,
      };
    } catch (error) {
      logger.error('文件上传处理失败', error as Error, {
        type: 'file',
        filename,
        userId,
      });

      return {
        success: false,
        scanResult: {
          safe: false,
          threats: ['处理过程中发生错误'],
          fileType: 'unknown',
          fileSize: 0,
          checksum: '',
        },
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 保存文件
   */
  private async saveFile(buffer: Buffer, filepath: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');

    // 确保目录存在
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入文件
    await fs.promises.writeFile(filepath, buffer);
  }

  /**
   * 隔离文件
   */
  private async quarantineFile(
    buffer: Buffer,
    filename: string,
    scanResult: FileScanResult,
  ): Promise<void> {
    try {
      const quarantineFilename = `quarantine_${Date.now()}_${filename}`;
      const quarantinePath = path.join(
        this.config.quarantinePath,
        quarantineFilename,
      );

      await this.saveFile(buffer, quarantinePath);

      // 保存隔离记录
      const quarantineRecord = {
        filename,
        quarantinePath,
        scanResult,
        timestamp: new Date().toISOString(),
      };

      const recordPath = `${quarantinePath}.json`;
      await this.saveFile(
        Buffer.from(JSON.stringify(quarantineRecord, null, 2)),
        recordPath,
      );

      logger.warn('文件已隔离', {
        type: 'security',
        filename,
        quarantinePath,
        threats: scanResult.threats,
      });
    } catch (error) {
      logger.error('文件隔离失败', error as Error, {
        type: 'security',
        filename,
      });
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<UploadConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('文件上传配置已更新', {
      type: 'security',
      config: {
        maxFileSize: this.config.maxFileSize,
        maxFilesPerRequest: this.config.maxFilesPerRequest,
        scanEnabled: this.config.scanEnabled,
        quarantineEnabled: this.config.quarantineEnabled,
      },
    });
  }

  /**
   * 获取配置
   */
  getConfig(): UploadConfig {
    return { ...this.config };
  }
}

// 创建单例实例
export const fileUploadSecurity = FileUploadSecurity.getInstance();

export default fileUploadSecurity;
