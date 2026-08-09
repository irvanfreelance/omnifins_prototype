import { useScopeStore } from '../store/useScopeStore'
import { resolveScopeNodeIds } from '../data/reports'

export function useScopedNodeIds() {
  const nodeId = useScopeStore((s) => s.nodeId)
  const consolidated = useScopeStore((s) => s.consolidated)
  return resolveScopeNodeIds(nodeId, consolidated)
}
