/**
 * 健康数据历史表格的工具函数
 */

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getSourceLabel = (source: string): string => {
  switch (source) {
  case 'MANUAL':
    return '手动录入';
  case 'WEARABLE':
    return '可穿戴设备';
  case 'MEDICAL_REPORT':
    return '体检报告';
  default:
    return source;
  }
};

export const getSourceBadgeClass = (source: string): string => {
  const styles = {
    MANUAL: 'bg-blue-100 text-blue-800',
    WEARABLE: 'bg-green-100 text-green-800',
    MEDICAL_REPORT: 'bg-purple-100 text-purple-800',
  };
  
  return styles[source as keyof typeof styles] || 'bg-gray-100 text-gray-800';
};
