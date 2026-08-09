import { TriangleAlert } from 'lucide-react'

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600 mb-4">
      <TriangleAlert size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}
