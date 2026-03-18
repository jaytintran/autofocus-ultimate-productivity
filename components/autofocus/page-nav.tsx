'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PageNavProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PageNav({ currentPage, totalPages, onPageChange }: PageNavProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm">
        Page <span className="font-medium">{currentPage}</span> / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
