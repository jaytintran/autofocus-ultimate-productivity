'use client'

import { useState } from 'react'
import { ChevronRight, Info } from 'lucide-react'

export function AboutSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <Info className="w-4 h-4" />
        <span className="uppercase tracking-wider">About Autofocus (AF4)</span>
      </button>
      
      {isOpen && (
        <div className="px-6 pb-4 text-sm text-muted-foreground space-y-4">
          <p>
            <strong className="text-foreground">Autofocus</strong> is a time management system created by Mark Forster. 
            AF4 is the fourth and final version.
          </p>
          
          <div>
            <h4 className="text-foreground font-medium mb-2">How it works:</h4>
            <ol className="list-decimal list-inside space-y-1.5 ml-2">
              <li>Write down everything you need to do in one long list</li>
              <li>Work through the list page by page</li>
              <li>On each page, scan the tasks and ask yourself: <em className="text-af4-warn">&quot;What do I want to do?&quot;</em></li>
              <li>When a task stands out, work on it until you want to stop</li>
              <li>If the task is done, cross it off. If not, re-enter it at the end of the list</li>
              <li>Continue scanning from where you left off</li>
              <li>When you reach the end of the page with no task standing out, move to the next page</li>
            </ol>
          </div>

          <div>
            <h4 className="text-foreground font-medium mb-2">Key principles:</h4>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Trust your intuition</strong> — Don&apos;t force priorities; let tasks naturally rise</li>
              <li><strong>No pressure</strong> — Work on what feels right, not what seems urgent</li>
              <li><strong>Keep moving</strong> — If nothing stands out, move to the next page</li>
              <li><strong>Re-enter freely</strong> — Incomplete tasks get another chance at the end</li>
            </ul>
          </div>

          <p className="text-xs border-t border-border pt-4 mt-4">
            Learn more at{' '}
            <a 
              href="http://markforster.squarespace.com/autofocus-system/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-af4-olive hover:underline"
            >
              Mark Forster&apos;s website
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
