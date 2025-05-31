import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Trading utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function calculatePnL(entryPrice: number, exitPrice: number, quantity: number, type: 'long' | 'short'): number {
  if (type === 'long') {
    return (exitPrice - entryPrice) * quantity
  } else {
    return (entryPrice - exitPrice) * quantity
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getPnLColor(pnl: number): string {
  if (pnl > 0) return 'text-green-600'
  if (pnl < 0) return 'text-red-600'
  return 'text-gray-600'
}
