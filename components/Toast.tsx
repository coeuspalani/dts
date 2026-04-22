'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props { message: string; type?: 'success' | 'error'; onClose: () => void }

export default function Toast({ message, type = 'success', onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border
      font-mono text-sm max-w-[calc(100vw-2rem)] shadow-2xl transition-all duration-300
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      ${type === 'success'
        ? 'bg-surface2 border-accent2/30 text-accent2'
        : 'bg-surface2 border-danger/30 text-danger'}`}>
      {type === 'success'
        ? <CheckCircle size={15} className="flex-shrink-0" />
        : <XCircle size={15} className="flex-shrink-0" />
      }
      <span className="truncate">{message}</span>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const show = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type })
  const hide = () => setToast(null)
  return { toast, show, hide }
}
