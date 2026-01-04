/**
 * 任务执行日志记录器
 */

export class TaskLogger {
  private context = 'TaskScheduler';

  info(message: string, ...args: any[]): void {
    console.log(
      `[${new Date().toISOString()}] [${this.context}] [INFO] ${message}`,
      ...args,
    );
  }

  warn(message: string, ...args: any[]): void {
    console.warn(
      `[${new Date().toISOString()}] [${this.context}] [WARN] ${message}`,
      ...args,
    );
  }

  error(message: string, ...args: any[]): void {
    console.error(
      `[${new Date().toISOString()}] [${this.context}] [ERROR] ${message}`,
      ...args,
    );
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[${new Date().toISOString()}] [${this.context}] [DEBUG] ${message}`,
        ...args,
      );
    }
  }
}
