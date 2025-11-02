import { Eye, Edit, Trash2 } from 'lucide-react'
import type { HealthData } from './types'
import { formatDate, getSourceLabel, getSourceBadgeClass } from './utils'

interface TableRowProps {
  item: HealthData
  isSelected: boolean
  onSelect: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
}

export function TableRow({ item, isSelected, onSelect, onDelete }: TableRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(item.measuredAt)}
      </td>
      
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="space-y-1">
          {item.weight !== null && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">体重:</span>
              <span className="font-medium">{item.weight} kg</span>
            </div>
          )}
          {item.bloodPressureSystolic !== null && item.bloodPressureDiastolic !== null && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">血压:</span>
              <span className="font-medium">
                {item.bloodPressureSystolic}/{item.bloodPressureDiastolic} mmHg
              </span>
            </div>
          )}
          {item.heartRate !== null && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">心率:</span>
              <span className="font-medium">{item.heartRate} bpm</span>
            </div>
          )}
          {item.bodyFat !== null && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">体脂率:</span>
              <span className="font-medium">{item.bodyFat}%</span>
            </div>
          )}
          {item.muscleMass !== null && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">肌肉量:</span>
              <span className="font-medium">{item.muscleMass} kg</span>
            </div>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceBadgeClass(item.source)}`}>
          {getSourceLabel(item.source)}
        </span>
      </td>
      
      <td className="px-6 py-4 text-sm text-gray-500">
        <div className="max-w-xs truncate">
          {item.notes || '-'}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button className="text-gray-400 hover:text-gray-600">
            <Eye className="h-4 w-4" />
          </button>
          <button className="text-blue-600 hover:text-blue-900">
            <Edit className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onDelete(item.id)}
            className="text-red-600 hover:text-red-900"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
