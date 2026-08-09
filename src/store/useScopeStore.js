import { create } from 'zustand'
import { orgNodes } from '../data/orgNodes'

export const useScopeStore = create((set) => ({
  nodeId: 1,
  consolidated: true,
  setNodeId: (nodeId) => set({ nodeId }),
  setConsolidated: (consolidated) => set({ consolidated }),
  setScope: (nodeId, consolidated) => set({ nodeId, consolidated }),
}))

export function useScopeNode() {
  const nodeId = useScopeStore((s) => s.nodeId)
  return orgNodes.find((n) => n.id === nodeId)
}
