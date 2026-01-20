import { convexClient } from "@/lib/convex-client";
import { asConvexMutationReference, asConvexQueryReference } from "@/lib/convex-reference";

export interface UploadResult {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  storageId?: string;
}

export class FileStorageService {
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  static validateFileSize(fileSize: number): boolean {
    const MAX_SIZE = 10 * 1024 * 1024;
    return fileSize <= MAX_SIZE;
  }

  private static async getUploadUrl(): Promise<string> {
    return await convexClient.mutation(asConvexMutationReference("files:generateUploadUrl"), {});
  }

  private static async getFileUrl(storageId: string): Promise<string> {
    const url = await convexClient.query<string | null>(
      asConvexQueryReference("files:getFileUrl"),
      { storageId }
    );
    if (!url) {
      throw new Error("Failed to resolve file URL");
    }
    return url;
  }

  static async uploadFile(
    file: File | Buffer,
    fileName: string,
    _memberId: string,
    options?: {
      contentType?: string;
      addRandomSuffix?: boolean;
    }
  ): Promise<UploadResult> {
    const uploadUrl = await this.getUploadUrl();

    let fileData: Blob;
    let contentType: string | null | undefined;

    if (file instanceof File) {
      fileData = file;
      contentType = file.type || options?.contentType;
    } else {
      fileData = new Blob([file as BlobPart], {
        type: options?.contentType || undefined,
      });
      contentType = options?.contentType;
    }

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: contentType ? { "Content-Type": contentType } : undefined,
      body: fileData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to upload file");
    }

    const result = (await response.json()) as { storageId?: string };
    if (!result.storageId) {
      throw new Error("Upload response missing storageId");
    }

    const url = await this.getFileUrl(result.storageId);
    const fileSize = file instanceof File ? file.size : file.length;

    return {
      url,
      pathname: result.storageId,
      size: fileSize,
      uploadedAt: new Date(),
      storageId: result.storageId,
    };
  }

  static async deleteFile(pathname: string): Promise<void> {
    await convexClient.mutation(asConvexMutationReference("files:deleteFile"), {
      storageId: pathname,
    });
  }

  static async deleteFiles(pathnames: string[]): Promise<void> {
    await Promise.all(pathnames.map((pathname) => this.deleteFile(pathname)));
  }

  static extractPathnameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const supabaseMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);

      if (supabaseMatch?.[1]) {
        return null;
      }

      const parts = urlObj.pathname.split("/").filter(Boolean);
      return parts.length > 0 ? (parts[parts.length - 1] ?? null) : null;
    } catch {
      return null;
    }
  }

  static async createSignedUrl(pathname: string, _expiresIn: number = 3600): Promise<string> {
    return await this.getFileUrl(pathname);
  }
}

export const fileStorageService = new FileStorageService();
