// Cloudflare环境工具函数
export const isCloudflare = typeof WebSocketPair !== 'undefined';

// 条件导入大型依赖
export const getPdfParser = async () => {
  if (isCloudflare) {
    console.warn('PDF parsing not available in Cloudflare environment');
    return null;
  }
  try {
    return await import('puppeteer');
  } catch (error) {
    console.error('Failed to import puppeteer:', error);
    return null;
  }
};

// 条件执行函数
export const runIfNotCloudflare = async (fn: Function) => {
  if (isCloudflare) {
    console.warn('Function not available in Cloudflare environment');
    return null;
  }
  return await fn();
};
