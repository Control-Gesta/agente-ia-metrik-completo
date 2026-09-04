import { getAgentConfig } from '@/lib/agent'
import ExecutiveDashboard from '@/components/ExecutiveDashboard'

export const dynamic = 'force-dynamic'

export default async function VisaoGeral() {
  const cfg = await getAgentConfig()
  return <ExecutiveDashboard agentName={cfg.agente.nome} />
}
