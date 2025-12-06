import * as Toast from '@radix-ui/react-toast'
import { useState, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  title: string
  description?: string
  type: ToastType
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a Toaster')
  }
  return context
}

export function Toaster({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = (item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...item, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'info':
        return <Info className="w-5 h-5 text-sui-primary" />
    }
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toast.Provider swipeDirection="right">
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            className="bg-sui-dark border border-white/10 rounded-xl p-4 shadow-xl data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out flex items-start gap-3"
            onOpenChange={(open: boolean) => !open && removeToast(t.id)}
          >
            {getIcon(t.type)}
            <div className="flex-1">
              <Toast.Title className="text-sm font-medium text-white">
                {t.title}
              </Toast.Title>
              {t.description && (
                <Toast.Description className="text-sm text-gray-400 mt-1">
                  {t.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)] z-50" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

