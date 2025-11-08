export function createSuccessResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  })
}

export function createErrorResponse(error, status = 500) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  return new Response(JSON.stringify({
    error: errorMessage,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  })
}

export function createValidationError(message, field = null) {
  return new Response(JSON.stringify({
    error: message,
    code: 'VALIDATION_ERROR',
    field,
    timestamp: new Date().toISOString()
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

export function createNotFoundResponse(message = 'Resource not found') {
  return new Response(JSON.stringify({
    error: message,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

export function createCorsResponse(data = null, status = 200) {
  const response = data ? createSuccessResponse(data, status) : new Response(null, { status })
  
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

export function handleOptions() {
  return createCorsResponse(null, 200)
}
