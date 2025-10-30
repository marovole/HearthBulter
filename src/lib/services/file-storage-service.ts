/**
 * 文件存储服务
 * 
 * 集成Vercel Blob Storage，实现文件上传、下载和删除功能
 * 用于存储体检报告文件（PDF/图片）
 */

import { put, head, del } from '@vercel/blob'

/**
 * 上传文件结果
 */
export interface UploadResult {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
}

/**
 * 文件存储服务类
 */
export class FileStorageService {
  /**
   * 验证文件类型
   */
  static validateFileType(
    mimeType: string,
    allowedTypes: string[]
  ): boolean {
    return allowedTypes.includes(mimeType)
  }

  /**
   * 验证文件大小（限制10MB）
   */
  static validateFileSize(fileSize: number): boolean {
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    return fileSize <= MAX_SIZE
  }

  /**
   * 生成安全的文件路径
   */
  private static generateFilePath(
    memberId: string,
    fileName: string,
    timestamp?: Date
  ): string {
    const ts = timestamp || new Date()
    const dateStr = ts.toISOString().split('T')[0] // YYYY-MM-DD
    const timestampStr = ts.getTime().toString()
    
    // 清理文件名，移除特殊字符
    const safeFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100) // 限制文件名长度

    return `medical-reports/${memberId}/${dateStr}/${timestampStr}-${safeFileName}`
  }

  /**
   * 上传文件到Vercel Blob Storage
   */
  static async uploadFile(
    file: File | Buffer,
    fileName: string,
    memberId: string,
    options?: {
      contentType?: string
      addRandomSuffix?: boolean
    }
  ): Promise<UploadResult> {
    try {
      // 生成文件路径
      const pathname = this.generateFilePath(memberId, fileName)

      // 处理文件数据
      let fileData: Buffer | File
      let contentType: string | undefined

      if (file instanceof File) {
        fileData = file
        contentType = file.type || options?.contentType
      } else {
        fileData = file
        contentType = options?.contentType
      }

      // 上传到Vercel Blob
      const blob = await put(pathname, fileData, {
        access: 'private', // 私有访问，需要签名URL
        contentType,
        addRandomSuffix: options?.addRandomSuffix ?? false,
      })

      return {
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      throw new Error(
        `文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(pathname: string): Promise<boolean> {
    try {
      await head(pathname)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(pathname: string): Promise<void> {
    try {
      await del(pathname)
    } catch (error) {
      console.error('文件删除失败:', error)
      throw new Error(
        `文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  /**
   * 批量删除文件
   */
  static async deleteFiles(pathnames: string[]): Promise<void> {
    try {
      await Promise.all(pathnames.map((pathname) => this.deleteFile(pathname)))
    } catch (error) {
      console.error('批量删除文件失败:', error)
      throw new Error(
        `批量删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  /**
   * 从URL中提取pathname
   */
  static extractPathnameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      // Vercel Blob URL格式: https://[account].public.blob.vercel-storage.com/[pathname]
      const pathnameMatch = urlObj.pathname.match(/^\/(.+)$/)
      return pathnameMatch ? pathnameMatch[1] : null
    } catch {
      return null
    }
  }
}

// 导出单例实例
export const fileStorageService = new FileStorageService()

