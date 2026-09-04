import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AlertCircle, CheckCircle2, HelpCircle, X, Info } from 'lucide-react'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary' | 'warning'
}

type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

type DialogContextType = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
  notify: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
    warning: (msg: string) => void
  }
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (val: boolean) => void
  } | null>(null)

  // Toast Notifications State
  const [toasts, setToasts] = useState<Toast[]>([])

  const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    const opt: ConfirmOptions =
      typeof options === 'string'
        ? { message: options, title: 'Konfirmasi Tindakan' }
        : { title: 'Konfirmasi', ...options }

    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options: opt,
        resolve,
      })
    })
  }

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const notify = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  }

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result)
      setConfirmState(null)
    }
  }

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}

      {/* Modern Custom Confirm Modal */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-gray-100 animate-in zoom-in-95 duration-150">
            <div
              className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                confirmState.options.variant === 'primary'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {confirmState.options.variant === 'primary' ? (
                <HelpCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {confirmState.options.title || 'Konfirmasi'}
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              {confirmState.options.message}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
              >
                {confirmState.options.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95 ${
                  confirmState.options.variant === 'primary'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmState.options.confirmText || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modern Toast Alerts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border text-xs font-medium backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${
              t.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : t.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : t.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : 'bg-blue-50/95 border-blue-200 text-blue-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              ) : t.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              ) : (
                <Info className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div className="flex-1 leading-snug">{t.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-gray-400 hover:text-gray-700 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}
