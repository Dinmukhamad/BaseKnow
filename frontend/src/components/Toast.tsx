import { createContext, useCallback, useContext, useReducer, useRef } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; type: ToastType; message: string }
interface ToastCtx { show: (message: string, type?: ToastType) => void; success: (m: string) => void; error: (m: string) => void }

const Ctx = createContext<ToastCtx>({ show: () => {}, success: () => {}, error: () => {} })

const icons: Record<ToastType, JSX.Element> = {
  success: <CheckCircle2 size={16} className="shrink-0 text-green-600" />,
  error: <XCircle size={16} className="shrink-0 text-red-500" />,
  info: <Info size={16} className="shrink-0 text-blue-500" />,
}
const bg: Record<ToastType, string> = {
  success: 'border-green-100 bg-green-50 text-green-900',
  error: 'border-red-100 bg-red-50 text-red-900',
  info: 'border-blue-100 bg-blue-50 text-blue-900',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer((s: Toast[], a: { type: 'add'; toast: Toast } | { type: 'remove'; id: number }) =>
    a.type === 'add' ? [...s, a.toast] : s.filter(t => t.id !== a.id), [])
  const counter = useRef(0)

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current
    dispatch({ type: 'add', toast: { id, type, message } })
    setTimeout(() => dispatch({ type: 'remove', id }), 4000)
  }, [])

  const success = useCallback((m: string) => show(m, 'success'), [show])
  const error = useCallback((m: string) => show(m, 'error'), [show])

  return (
    <Ctx.Provider value={{ show, success, error }}>
      {children}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '280px', maxWidth: '380px' }}>
        {toasts.map(t => (
          <div key={t.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${bg[t.type]}`}
            style={{ animation: 'slideIn 0.2s ease' }}>
            {icons[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => dispatch({ type: 'remove', id: t.id })} className="opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
