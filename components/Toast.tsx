'use client'
import { useEffect, useState } from 'react'

interface ToastProps { message: string; type?: 'success' | 'error'; onClose: () => void }

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border font-mono text-sm
      animate-fade-up shadow-lg backdrop-blur-sm
      ${type === 'success'
        ? 'bg-surface2 border-accent2/30 text-accent2'
        : 'bg-surface2 border-danger/30 text-danger'}`}>
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </div>
  )
}

// Global toast manager
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const show = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type })
  const hide = () => setToast(null)
  return { toast, show, hide }
}
