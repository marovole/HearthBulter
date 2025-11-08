import { ValidationError } from './error-handler.js'

export function validateRequiredFields(data, requiredFields) {
  const missingFields = []
  
  for (const field of requiredFields) {
    if (!data[field] || data[field] === undefined || data[field] === null) {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format')
  }
}

export function validateNumericRange(value, min, max, fieldName = 'Value') {
  const num = Number(value)
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`)
  }
  
  if (num < min || num > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`)
  }
}

export function validateStringLength(value, min, max, fieldName = 'String') {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  
  if (value.length < min || value.length > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`)
  }
}

export function validateDateString(dateString, fieldName = 'Date') {
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`)
  }
  
  // 检查日期是否在合理范围内（过去1年到未来1年）
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  
  if (date < oneYearAgo || date > oneYearFromNow) {
    throw new ValidationError(`${fieldName} must be within the past or future year`)
  }
}

export function validateHealthDataType(dataType) {
  const validTypes = [
    'weight', 'blood_pressure', 'blood_sugar', 'heart_rate', 
    'temperature', 'steps', 'sleep', 'calories', 'water'
  ]
  
  if (!validTypes.includes(dataType)) {
    throw new ValidationError(`Invalid health data type. Must be one of: ${validTypes.join(', ')}`)
  }
}

export function validateMealType(mealType) {
  const validTypes = ['breakfast', 'lunch', 'dinner', 'snack']
  
  if (!validTypes.includes(mealType)) {
    throw new ValidationError(`Invalid meal type. Must be one of: ${validTypes.join(', ')}`)
  }
}

export function validateRecipeDifficulty(difficulty) {
  const validDifficulties = ['easy', 'medium', 'hard']
  
  if (!validDifficulties.includes(difficulty)) {
    throw new ValidationError(`Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`)
  }
}

export function validatePagination(limit, offset) {
  const maxLimit = 100
  const maxOffset = 10000
  
  if (limit < 1 || limit > maxLimit) {
    throw new ValidationError(`Limit must be between 1 and ${maxLimit}`)
  }
  
  if (offset < 0 || offset > maxOffset) {
    throw new ValidationError(`Offset must be between 0 and ${maxOffset}`)
  }
}

export function sanitizeInput(value) {
  if (typeof value !== 'string') {
    return value
  }
  
  // 移除潜在的危险字符
  return value
    .replace(/[\u003c\u003e]/g, '') // 移除 < 和 > 以防止简单的HTML注入
    .trim()
}

export function validateRequestBody(request, schema) {
  if (!request.body) {
    throw new ValidationError('Request body is required')
  }
  
  // 这里可以集成更复杂的数据验证库，如 Zod 或 Joi
  // 目前使用简单的字段验证
  if (schema.requiredFields) {
    validateRequiredFields(request.body, schema.requiredFields)
  }
  
  // 验证特定字段
  if (schema.validations) {
    for (const [field, validation] of Object.entries(schema.validations)) {
      const value = request.body[field]
      if (value !== undefined) {
        switch (validation.type) {
          case 'email':
            validateEmail(value)
            break
          case 'numericRange':
            validateNumericRange(value, validation.min, validation.max, field)
            break
          case 'stringLength':
            validateStringLength(value, validation.min, validation.max, field)
            break
          case 'date':
            validateDateString(value, field)
            break
          case 'healthDataType':
            validateHealthDataType(value)
            break
          case 'mealType':
            validateMealType(value)
            break
          case 'recipeDifficulty':
            validateRecipeDifficulty(value)
            break
        }
      }
    }
  }
}

// 解析请求体的辅助函数
export async function parseRequestBody(request) {
  try {
    const body = await request.json()
    return body
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body')
  }
}

// 验证查询参数的辅助函数
export function validateQueryParams(url, validParams) {
  const params = new URL(url).searchParams
  const validated = {}
  
  for (const param of validParams) {
    const value = params.get(param.name)
    
    if (value !== null) {
      try {
        switch (param.type) {
          case 'number':
            validated[param.name] = parseInt(value)
            if (isNaN(validated[param.name])) {
              throw new ValidationError(`Invalid number for parameter: ${param.name}`)
            }
            break
          case 'float':
            validated[param.name] = parseFloat(value)
            if (isNaN(validated[param.name])) {
              throw new ValidationError(`Invalid float for parameter: ${param.name}`)
            }
            break
          case 'boolean':
            validated[param.name] = value === 'true'
            break
          case 'date':
            validateDateString(value, param.name)
            validated[param.name] = value
            break
          default:
            validated[param.name] = value
        }
        
        // 应用验证规则
        if (param.validation) {
          switch (param.validation.type) {
            case 'range':
              validateNumericRange(validated[param.name], param.validation.min, param.validation.max, param.name)
              break
            case 'oneOf':
              if (!param.validation.values.includes(validated[param.name])) {
                throw new ValidationError(`Invalid value for parameter: ${param.name}`)
              }
              break
          }
        }
      } catch (error) {
        // 重新抛出带有参数名的错误
        throw new ValidationError(`Parameter '${param.name}': ${error.message}`)
      }
    } else if (param.required) {
      throw new ValidationError(`Missing required parameter: ${param.name}`)
    }
  }
  
  return validated
}
