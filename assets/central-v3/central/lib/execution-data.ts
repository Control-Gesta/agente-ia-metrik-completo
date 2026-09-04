'use client'

import { useEffect, useState } from 'react'

export interface ExecutionCost {
  totalBrl: number
  claudeUsd: number
  vozUsd: number
  sttUsd: number
  infraBrl: number
  usdBrl: number
  tokens: { input: number; cacheWrite: number; cacheRead: number; output: number; chamadas: number }
}

export interface Execution {
  ts: string
  contactId: string
  nome: string
  resultado: 'respondeu' | 'erro' | 'pulou'
  detalhe: string
  duracaoMs: number
  tools: string[]
  voz: boolean
  custo?: ExecutionCost
}

export interface Financial {
  hoje: number
  seteDias: number
  trintaDias: number
  totalRegistrado: number
  execucoesComCusto: number
  execucoesSemCusto: number
  medioPorExecucao: number
  componentes: { claude: number; voz: number; transcricao: number; infraestrutura: number }
  porDia: Array<{ data: string; custo: number; execucoes: number }>
  observacao: string
}

export interface ExecutionData {
  execucoes: Execution[]
  saude24h: { total: number; respondeu: number; erros: number }
  financeiro?: Financial
}

export function useExecutions() {
  const [data, setData] = useState<ExecutionData | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    const load = () => {
      setCarregando(true)
      fetch('/api/exec').then(r => r.json())
        .then(d => { if (ativo) { if (d.error) setErro(true); else { setData(d); setErro(false) } } })
        .catch(() => ativo && setErro(true))
        .finally(() => ativo && setCarregando(false))
    }
    load()
    window.addEventListener('central:refresh', load)
    return () => { ativo = false; window.removeEventListener('central:refresh', load) }
  }, [])

  return { data, erro, carregando }
}

export function brl(valor: number, casas = 2) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas })
}
