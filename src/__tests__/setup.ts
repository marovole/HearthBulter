import React from 'react'
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/dashboard'
  },
}))

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: function ResponsiveContainer({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'responsive-container' }, children)
  },
  LineChart: function LineChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'line-chart' }, children)
  },
  Line: function Line() {
    return React.createElement('div', { 'data-testid': 'line' })
  },
  XAxis: function XAxis() {
    return React.createElement('div', { 'data-testid': 'x-axis' })
  },
  YAxis: function YAxis() {
    return React.createElement('div', { 'data-testid': 'y-axis' })
  },
  CartesianGrid: function CartesianGrid() {
    return React.createElement('div', { 'data-testid': 'cartesian-grid' })
  },
  Tooltip: function Tooltip() {
    return React.createElement('div', { 'data-testid': 'tooltip' })
  },
  Legend: function Legend() {
    return React.createElement('div', { 'data-testid': 'legend' })
  },
  AreaChart: function AreaChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'area-chart' }, children)
  },
  Area: function Area() {
    return React.createElement('div', { 'data-testid': 'area' })
  },
  PieChart: function PieChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'pie-chart' }, children)
  },
  Pie: function Pie() {
    return React.createElement('div', { 'data-testid': 'pie' })
  },
  Cell: function Cell() {
    return React.createElement('div', { 'data-testid': 'cell' })
  },
  BarChart: function BarChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'bar-chart' }, children)
  },
  Bar: function Bar() {
    return React.createElement('div', { 'data-testid': 'bar' })
  },
  RadarChart: function RadarChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'radar-chart' }, children)
  },
  PolarGrid: function PolarGrid() {
    return React.createElement('div', { 'data-testid': 'polar-grid' })
  },
  PolarAngleAxis: function PolarAngleAxis() {
    return React.createElement('div', { 'data-testid': 'polar-angle-axis' })
  },
  PolarRadiusAxis: function PolarRadiusAxis() {
    return React.createElement('div', { 'data-testid': 'polar-radius-axis' })
  },
  Radar: function Radar() {
    return React.createElement('div', { 'data-testid': 'radar' })
  },
}))

// Mock fetch
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock Touch events for gesture testing
Object.defineProperty(window, 'Touch', {
  writable: true,
  value: class Touch {
    constructor(public identifier: number, public clientX: number, public clientY: number) {}
  },
})

Object.defineProperty(window, 'TouchList', {
  writable: true,
  value: class TouchList {
    public length: number = 0;
    public item: (index: number) => null;
    public [Symbol.iterator]: () => IterableIterator<Touch> = function() {
      return {
        next: () => ({ done: true, value: undefined })
      }
    }
  },
})

Object.defineProperty(window, 'TouchEvent', {
  writable: true,
  value: class TouchEvent {
    public targetTouches: TouchList = new TouchList()
    public touches: TouchList = new TouchList()
    public changedTouches: TouchList = new TouchList()
    
    constructor(type: string, eventInitDict?: TouchEventInit) {
      if (eventInitDict?.targetTouches) {
        this.targetTouches = eventInitDict.targetTouches as TouchList
      }
      if (eventInitDict?.touches) {
        this.touches = eventInitDict.touches as TouchList
      }
      if (eventInitDict?.changedTouches) {
        this.changedTouches = eventInitDict.changedTouches as TouchList
      }
    }
  },
})

// Mock console methods in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
