/**
 * 仓库错误类型枚举
 */
export enum RepositoryErrorCode {
  /** 数据库操作错误 */
  DATABASE_ERROR = 'DATABASE_ERROR',
  /** 记录未找到 */
  NOT_FOUND = 'NOT_FOUND',
  /** 验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 冲突错误（如唯一约束冲突） */
  CONFLICT = 'CONFLICT',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  /** 创建失败 */
  CREATE_FAILED = 'CREATE_FAILED',
  /** 更新失败 */
  UPDATE_FAILED = 'UPDATE_FAILED',
  /** 删除失败 */
  DELETE_FAILED = 'DELETE_FAILED',
}

/**
 * 仓库错误参数接口
 */
export interface RepositoryErrorParams {
  /** 错误代码 */
  code: RepositoryErrorCode;
  /** 错误消息 */
  message: string;
  /** 操作名称（可选） */
  operation?: string;
  /** 错误元数据（可选） */
  metadata?: Record<string, unknown>;
  /** 原始错误（可选） */
  cause?: unknown;
}

/**
 * 仓库错误类
 *
 * 提供统一的错误处理机制，包含错误代码、消息、操作名称和元数据
 */
export class RepositoryError extends Error {
  public readonly code: RepositoryErrorCode;
  public readonly operation?: string;
  public readonly metadata?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(params: RepositoryErrorParams) {
    super(params.message);
    this.name = 'RepositoryError';
    this.code = params.code;
    this.operation = params.operation;
    this.metadata = params.metadata;
    this.cause = params.cause;

    // 保持正确的错误堆栈
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RepositoryError);
    }
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      operation: this.operation,
      metadata: this.metadata,
    };
  }

  /**
   * 从 Supabase 错误创建 RepositoryError
   *
   * @param operation - 操作名称
   * @param error - Supabase 错误
   * @param defaultCode - 默认错误代码
   * @returns RepositoryError 实例
   */
  static fromSupabaseError(
    operation: string,
    error: unknown,
    defaultCode: RepositoryErrorCode = RepositoryErrorCode.DATABASE_ERROR,
  ): RepositoryError {
    const supabaseError = error as {
      code?: string;
      message?: string;
      details?: string;
    };

    // 根据 Supabase 错误代码映射到 RepositoryErrorCode
    let code = defaultCode;

    if (
      supabaseError?.code === 'PGRST116' ||
      supabaseError?.code === 'PGRST404'
    ) {
      // PostgREST 未找到错误
      code = RepositoryErrorCode.NOT_FOUND;
    } else if (supabaseError?.code === '23505') {
      // PostgreSQL 唯一约束冲突
      code = RepositoryErrorCode.CONFLICT;
    } else if (supabaseError?.code === '23503') {
      // PostgreSQL 外键约束错误
      code = RepositoryErrorCode.VALIDATION_ERROR;
    }

    return new RepositoryError({
      code,
      message: `Repository.${operation} failed: ${supabaseError?.message || 'Unknown error'}`,
      operation,
      cause: error,
      metadata: {
        supabaseCode: supabaseError?.code,
        details: supabaseError?.details,
      },
    });
  }

  /**
   * 检查是否为此错误代码
   *
   * @param code - 要检查的错误代码
   * @returns 是否为指定错误代码
   */
  is(code: RepositoryErrorCode): boolean {
    return this.code === code;
  }
}

/**
 * 错误工具函数
 */
export class RepositoryErrorUtils {
  /**
   * 创建 NOT_FOUND 错误
   */
  static notFound(
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): RepositoryError {
    return new RepositoryError({
      code: RepositoryErrorCode.NOT_FOUND,
      message,
      operation,
      metadata,
    });
  }

  /**
   * 创建 VALIDATION_ERROR 错误
   */
  static validationError(
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): RepositoryError {
    return new RepositoryError({
      code: RepositoryErrorCode.VALIDATION_ERROR,
      message,
      operation,
      metadata,
    });
  }

  /**
   * 创建 DATABASE_ERROR 错误
   */
  static databaseError(
    operation: string,
    message: string,
    cause?: unknown,
    metadata?: Record<string, unknown>,
  ): RepositoryError {
    return new RepositoryError({
      code: RepositoryErrorCode.DATABASE_ERROR,
      message,
      operation,
      cause,
      metadata,
    });
  }
}
