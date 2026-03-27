// src/components/ui/HelpModal.jsx
import { ChevronLeft } from 'lucide-react'
import { Modal } from './Modal'
import useUIStore from '@store/useUIStore'
import { getHelpContent, HELP_TOC } from '@/data/helpContent.jsx'

export function HelpModal() {
  const helpOpen    = useUIStore((s) => s.helpOpen)
  const helpArticle = useUIStore((s) => s.helpArticle)
  const openHelp    = useUIStore((s) => s.openHelp)
  const closeHelp   = useUIStore((s) => s.closeHelp)

  const article = helpArticle ? getHelpContent(helpArticle) : null
  const title   = article ? article.title : 'Help & Documentation'

  return (
    <Modal isOpen={helpOpen} onClose={closeHelp} title={title} size="md">
      <Modal.Body>
        {article ? (
          <div className="stack stack-md">
            <button
              type="button"
              onClick={() => openHelp()}
              className="flex items-center gap-1 text-caption text-text-muted hover:text-text"
            >
              <ChevronLeft size={14} />
              Back to contents
            </button>
            <div className="stack stack-sm">
              {article.body}
            </div>
          </div>
        ) : (
          <div className="stack stack-sm">
            {HELP_TOC.map(({ key, title, summary }) => (
              <button
                key={key}
                type="button"
                onClick={() => openHelp(key)}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-surface-elevated transition-base"
              >
                <div className="text-body font-semibold">{title}</div>
                <div className="text-caption text-text-muted mt-0.5">{summary}</div>
              </button>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}
