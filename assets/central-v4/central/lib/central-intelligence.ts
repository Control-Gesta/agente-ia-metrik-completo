import type { LiveData } from '@/components/LiveStats'
import type { ExecutionData } from './execution-data'

export type SignalTone = 'calm' | 'attention' | 'critical' | 'opportunity' | 'learning'

export interface DecisionCard {
  id: string
  tone: SignalTone
  title: string
  evidence: string
  impact: string
  action: string
  href: string
}

export interface ExecutiveBriefing {
  greeting: string
  summary: string
  decisions: DecisionCard[]
}

const brl0 = (n: number) => n.toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
})

export function buildBriefing(
  live: LiveData | null,
  data: ExecutionData | null,
  agentName: string,
): ExecutiveBriefing {
  if (!live || !data) {
    return {
      greeting: 'Estou reunindo as fontes da operação.',
      summary: 'O briefing só nasce depois que CRM e diário responderem. Até lá, nenhuma conclusão é inventada.',
      decisions: [],
    }
  }

  const decisions: DecisionCard[] = []
  const errors = data.saude24h.erros
  const staleStages = live.funil
    .filter(s => s.parados > 0)
    .sort((a, b) => (b.valor || b.parados) - (a.valor || a.parados))
  const topStale = staleStages[0]
  const noCost = !data.financeiro?.execucoesComCusto

  if (errors > 0) {
    decisions.push({
      id: 'errors',
      tone: errors >= 3 ? 'critical' : 'attention',
      title: `${errors} execução${errors > 1 ? 'ões pedem' : ' pede'} investigação`,
      evidence: `${errors} erro${errors > 1 ? 's' : ''} apareceu${errors > 1 ? 'ram' : ''} no diário nas últimas 24 horas.`,
      impact: 'Pode haver lead esperando ou automação incompleta.',
      action: 'Abrir Flight Recorder',
      href: '/operacao?aba=historico',
    })
  }

  if (topStale) {
    decisions.push({
      id: 'stale',
      tone: 'opportunity',
      title: `${topStale.parados} oportunidade${topStale.parados > 1 ? 's' : ''} parada${topStale.parados > 1 ? 's' : ''} em ${topStale.label}`,
      evidence: topStale.valor
        ? `${brl0(topStale.valor)} em pipeline está há 7 dias ou mais sem mudança registrada.`
        : `Há ${topStale.parados} card${topStale.parados > 1 ? 's' : ''} sem mudança há pelo menos 7 dias.`,
      impact: 'É o maior sinal visível de dinheiro esperando ação agora.',
      action: 'Ver radar financeiro',
      href: '/resultados#radar',
    })
  }

  if (live.agenda.proximos.length > 0) {
    decisions.push({
      id: 'agenda',
      tone: 'calm',
      title: `${live.agenda.proximos.length} reunião${live.agenda.proximos.length > 1 ? 'ões' : ''} no radar`,
      evidence: `${live.agenda.realizados7d} ${live.agenda.realizados7d === 1 ? 'reunião registrada' : 'reuniões registradas'} nos últimos 7 dias.`,
      impact: 'Confirmações e passagem de bastão protegem o resultado produzido.',
      action: 'Conferir agenda',
      href: '/operacao?aba=agenda',
    })
  }

  if (noCost) {
    decisions.push({
      id: 'ledger',
      tone: 'learning',
      title: 'Ledger novo aguardando a primeira execução',
      evidence: 'O histórico anterior não tinha telemetria financeira e continua honestamente marcado como não medido.',
      impact: 'A próxima conversa real inaugura custo por resposta e composição do gasto.',
      action: 'Entender os custos',
      href: '/resultados',
    })
  }

  if (decisions.length < 3 && live.conversas24h > 0) {
    decisions.push({
      id: 'learning',
      tone: 'learning',
      title: 'A operação já tem material para ensinar',
      evidence: `${live.conversas24h} conversas recentes podem revelar objeções, respostas tortas e lacunas de conteúdo.`,
      impact: 'Uma correção baseada em conversa real melhora o produto sem tocar no prompt.',
      action: `Ensinar a ${agentName}`,
      href: '/cerebro',
    })
  }

  const healthy = errors === 0
  return {
    greeting: healthy ? `A ${agentName} está operando sem falha crítica.` : `A ${agentName} está operando, mas encontrei pontos de atenção.`,
    summary: `${live.conversas24h} conversas em 24h, resposta mediana de ${
      live.respostaMedianaSegundos ? `${Math.round(live.respostaMedianaSegundos)} segundos` : 'tempo ainda não medido'
    } e ${live.agenda.proximos.length} compromisso${live.agenda.proximos.length === 1 ? '' : 's'} futuro${live.agenda.proximos.length === 1 ? '' : 's'}.`,
    decisions: decisions.slice(0, 3),
  }
}

export interface MoneySignal {
  id: string
  stage: string
  count: number
  value: number
  tone: SignalTone
  title: string
  explanation: string
  samples: LiveData['funil'][number]['amostras']
}

export function buildMoneyRadar(live: LiveData | null): MoneySignal[] {
  if (!live) return []
  return live.funil
    .filter(s => s.parados > 0)
    .map((s, i) => ({
      id: `money-${i}`,
      stage: s.label,
      count: s.parados,
      value: s.valor,
      tone: (s.label.match(/Proposta|Negociação|Contrato|assinatura/i) ? 'critical' : 'opportunity') as SignalTone,
      title: `${s.parados} parada${s.parados > 1 ? 's' : ''} em ${s.label}`,
      explanation: s.valor
        ? `${brl0(s.valor)} em valor aberto nessa etapa; sinal calculado com oportunidades sem mudança há 7 dias ou mais.`
        : 'Oportunidades sem mudança registrada há 7 dias ou mais.',
      samples: s.amostras,
    }))
    .sort((a, b) => (b.value || b.count) - (a.value || a.count))
    .slice(0, 6)
}

export interface CentralAnswer {
  answer: string
  evidence: string[]
  href?: string
  label?: string
}

export function answerCentral(
  rawQuestion: string,
  live: LiveData | null,
  data: ExecutionData | null,
): CentralAnswer {
  const q = rawQuestion.toLowerCase()
  if (!live || !data) {
    return { answer: 'Ainda estou carregando CRM e diário.', evidence: ['Espere as duas fontes responderem e tente novamente.'] }
  }

  if (/custo|gasto|token|investimento|áudio|audio/.test(q)) {
    const f = data.financeiro
    return {
      answer: f?.execucoesComCusto
        ? `O custo médio conhecido é ${f.medioPorExecucao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 3 })} por resposta.`
        : 'O ledger está ativo, mas ainda não há uma execução nova com custo gravado.',
      evidence: [
        `${f?.execucoesComCusto || 0} execuções com custo`,
        `${f?.execucoesSemCusto || 0} registros antigos não medidos`,
      ],
      href: '/resultados',
      label: 'Abrir resultados',
    }
  }

  if (/erro|falha|quebrou|saúde|saude/.test(q)) {
    return {
      answer: data.saude24h.erros
        ? `Encontrei ${data.saude24h.erros} erro(s) nas últimas 24 horas.`
        : 'O diário não registrou falha nas últimas 24 horas.',
      evidence: [`${data.saude24h.total} execuções analisadas`, `${data.saude24h.respondeu} respostas concluídas`],
      href: '/operacao?aba=historico',
      label: 'Abrir Flight Recorder',
    }
  }

  if (/parad|quente|oportun|dinheiro|pipeline|funil/.test(q)) {
    const radar = buildMoneyRadar(live)
    const total = radar.reduce((n, r) => n + r.count, 0)
    const value = radar.reduce((n, r) => n + r.value, 0)
    return {
      answer: total
        ? `Há ${total} oportunidades paradas há pelo menos 7 dias${value ? `, somando ${brl0(value)} em valor aberto nas etapas afetadas` : ''}.`
        : 'Não encontrei oportunidade parada pelo critério atual de 7 dias.',
      evidence: radar.slice(0, 3).map(r => `${r.stage}: ${r.count} parada(s)`),
      href: '/resultados#radar',
      label: 'Abrir radar',
    }
  }

  if (/reuni|agenda|agend/.test(q)) {
    return {
      answer: `${live.agenda.proximos.length} reunião(ões) futura(s) e ${live.agenda.realizados7d} realizada(s) nos últimos 7 dias.`,
      evidence: live.agenda.proximos.slice(0, 3).map(a => `${a.nome || a.titulo} · ${new Date(a.inicio).toLocaleDateString('pt-BR')}`),
      href: '/operacao?aba=agenda',
      label: 'Conferir agenda',
    }
  }

  if (/ensinar|melhorar|objeção|objecao|resposta/.test(q)) {
    return {
      answer: `Existem ${live.conversas24h} conversas recentes que podem virar exemplo de ensino.`,
      evidence: ['A correção entra em português', 'A equipe valida antes de publicar', 'O prompt cru permanece protegido'],
      href: '/cerebro',
      label: 'Ensinar agora',
    }
  }

  return {
    answer: `Hoje foram observadas ${live.conversas24h} conversas, resposta mediana de ${live.respostaMedianaSegundos ? `${Math.round(live.respostaMedianaSegundos)}s` : '—'} e ${data.saude24h.erros} erro(s).`,
    evidence: ['Resposta calculada localmente, sem consumir tokens', 'Use palavras como custo, erros, oportunidades, agenda ou ensinar para aprofundar.'],
  }
}
