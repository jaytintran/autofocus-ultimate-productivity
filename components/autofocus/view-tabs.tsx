'use client'

interface ViewTabsProps {
  activeView: 'tasks' | 'completed'
  onViewChange: (view: 'tasks' | 'completed') => void
}

export function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
  return (
    <div className="flex px-6 py-3">
      <div className="inline-flex bg-secondary rounded overflow-hidden">
        <button
          onClick={() => onViewChange('tasks')}
          className={`px-4 py-1.5 text-sm transition-colors ${
            activeView === 'tasks'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => onViewChange('completed')}
          className={`px-4 py-1.5 text-sm transition-colors ${
            activeView === 'completed'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed
        </button>
      </div>
    </div>
  )
}
