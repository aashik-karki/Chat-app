import { create } from 'zustand'
import type { AgentStatus } from '../../types/api'

interface AgentsState {
  byId: Record<string, AgentStatus>
  loaded: boolean
  setAll: (agents: AgentStatus[]) => void
  upsert: (agent: AgentStatus) => void
  reset: () => void
}

/** Live status of every agent (for the availability toggle, names, and the admin board). */
export const useAgentsStore = create<AgentsState>((set) => ({
  byId: {},
  loaded: false,
  setAll: (agents) => set({ byId: Object.fromEntries(agents.map((agent) => [agent.agentId, agent])), loaded: true }),
  upsert: (agent) => set((state) => ({ byId: { ...state.byId, [agent.agentId]: agent } })),
  reset: () => set({ byId: {}, loaded: false }),
}))
