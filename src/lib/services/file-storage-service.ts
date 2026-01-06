/**
 * 文件存储服务
 *
 * 集成 Supabase Storage，实现文件上传、下载和删除功能
 * 用于存储体检报告文件（PDF/图片）
 */

import { createClient } from "@supabase/supabase-js";

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// Supabase Storage Bucket 名称
const STORAGE_BUCKET = "medical-reports";

/**
 * 上传文件结果
 */
export interface UploadResult {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

/**
 * 文件存储服务类
 */
export class FileStorageService {
  /**
   * 验证文件类型
   */
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * 验证文件大小（限制10MB）
   */
  static validateFileSize(fileSize: number): boolean {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    return fileSize <= MAX_SIZE;
  }

  /**
   * 生成安全的文件路径
   */
  private static generateFilePath(
    memberId: string,
    fileName: string,
    timestamp?: Date,
  ): string {
    const ts = timestamp || new Date();
    const dateStr = ts.toISOString().split("T")[0]; // YYYY-MM-DD
    const timestampStr = ts.getTime().toString();

    // 清理文件名，移除特殊字符
    const safeFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .substring(0, 100); // 限制文件名长度

    return `medical-reports/${memberId}/${dateStr}/${timestampStr}-${safeFileName}`;
  }

  /**
   * 上传文件到 Supabase Storage
   */
  static async uploadFile(
    file: File | Buffer,
    fileName: string,
    memberId: string,
    options?: {
      contentType?: string;
      addRandomSuffix?: boolean;
    },
  ): Promise<UploadResult> {
    try {
      // 生成文件路径
      const pathname = this.generateFilePath(memberId, fileName);

      // 处理文件数据
      let fileData: File | Buffer | Blob;
      let contentType: string | undefined;

      if (file instanceof File) {
        fileData = file;
        contentType = file.type || options?.contentType;
      } else {
        // Buffer 转 Blob
        fileData = new Blob([file], { type: options?.contentType });
        contentType = options?.contentType;
      }

      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(pathname, fileData, {
          contentType,
          upsert: false, // 不覆盖现有文件
        });

      if (error) {
        throw new Error(error.message);
      }

      // 获取公共 URL（注意：需要配置 Bucket 为 public 或使用签名 URL）
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      // 获取文件大小
      const fileSize = file instanceof File ? file.size : file.length;

      return {
        url: urlData.publicUrl,
        pathname: data.path,
        size: fileSize,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error("文件上传失败:", error);
      throw new Error(
        `文件上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(pathname: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(pathname.substring(0, pathname.lastIndexOf("/")), {
          search: pathname.substring(pathname.lastIndexOf("/") + 1),
        });

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(pathname: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([pathname]);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error("文件删除失败:", error);
      throw new Error(
        `文件删除失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 批量删除文件
   */
  static async deleteFiles(pathnames: string[]): Promise<void> {
    try {
      await Promise.all(pathnames.map((pathname) => this.deleteFile(pathname)));
    } catch (error) {
      console.error("批量删除文件失败:", error);
      throw new Error(
        `批量删除文件失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 从 URL 中提取 pathname
   */
  static extractPathnameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Supabase Storage URL 格式: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[pathname]
      const match = urlObj.pathname.match(
        /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/,
      );
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * 生成签名 URL（用于私有文件访问）
   * @param pathname 文件路径
   * @param expiresIn 过期时间（秒），默认 1 小时
   */
  static async createSignedUrl(
    pathname: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(pathname, expiresIn);

      if (error) {
        throw new Error(error.message);
      }

      return data.signedUrl;
    } catch (error) {
      console.error("生成签名 URL 失败:", error);
      throw new Error(
        `生成签名 URL 失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }
}

// 导出单例实例
export const fileStorageService = new FileStorageService();
