import type { VercelRequest, VercelResponse } from '@vercel/node'
import { perfilDoSecret } from '../lib/perfil'
import { CONFIG } from '../lib/config'
import { getExecLog } from '../lib/execlog'
import {
  adicionarItem, editarItem, listarCatalogo, novoId, removerItem, substituirCatalogo,
  detectarDelimitador, linhasParaItens, parseCSV, sugerirMapa,
  type ItemCatalogo, type MapaColunas,
} from '../lib/catalogo'
import {
  adicionarFaq, buscarNaBase, editarFaq, removerFaq, saudeConhecimento, type FaqConhecimento,
} from '../lib/conhecimento'
import {
  adicionarMidia, editarMidia, listarMidias, removerMidia, type Midia, type TipoMidia,
} from '../lib/midias'

/**
 * CENTRAL — o HUB de dados da Central de IA (CENTRAL.md §1).
 *
 * Um endpoint só serve catálogo, base de conhecimento, mídias e o diário — porque
 * o Vercel Hobby limita 12 Serverless Functions por deploy, e cada aba nova como
 * função própria estoura o teto. 🩸 A régra: aba nova de DADOS entra aqui, roteada
 * por `?recurso=`; não vira função separada.
 *
 *  GET  /api/central?secret=X&recurso=catalogo|conhecimento|midias|execucoes
 *  POST /api/central?secret=X&recurso=... {acao, ...}
 *
 * Cada recurso mantém o mesmo contrato de quando era função própria — só mudou o
 * ponto de entrada. Perfil dono×agência vale igual (a agência importa em massa).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const perfil = perfilDoSecret(req.query.secret)
  if (!perfil) return res.status(401).json({ error: 'unauthorized' })

  const recurso = String(req.query.recurso || '')
  const body = (req.body || {}) as Record<string, unknown>

  try {
    switch (recurso) {
      // ─────────────────────── DIÁRIO (read-only) ───────────────────────
      case 'execucoes': {
        // aceita o secret de agência (o painel usa o WEBHOOK_SECRET de sempre)
        if (perfil !== 'agencia' && req.query.secret !== CONFIG.webhookSecret) {
          return res.status(403).json({ error: 'forbidden' })
        }
        const limit = Math.min(Number(req.query.limit) || 100, 500)
        const execucoes = await getExecLog(limit)
        const h24 = Date.now() - 24 * 3600 * 1000
        const last24 = execucoes.filter(e => new Date(e.ts).getTime() >= h24)
        return res.status(200).json({
          execucoes,
          saude24h: {
            total: last24.length,
            respondeu: last24.filter(e => e.resultado === 'respondeu').length,
            erros: last24.filter(e => e.resultado === 'erro').length,
          },
        })
      }

      // ─────────────────────── CATÁLOGO (§4) ───────────────────────
      case 'catalogo': {
        if (req.method === 'GET') return res.status(200).json({ itens: await listarCatalogo() })
        switch (body.acao) {
          case 'adicionar': {
            const it = (body.item || {}) as Partial<ItemCatalogo>
            if (!it.produto?.trim()) return res.status(422).json({ error: 'produto_obrigatorio', mensagem: 'Todo item precisa de um nome de produto.' })
            const novo = await adicionarItem({
              produto: it.produto.trim(), preco: (it.preco || 'sob consulta').toString().trim(),
              descricao: it.descricao?.toString().trim() || undefined,
              categoria: it.categoria?.toString().trim() || undefined, ativo: it.ativo !== false,
            })
            return res.status(200).json({ ok: true, item: novo })
          }
          case 'editar': {
            const it = await editarItem(String(body.id || ''), (body.patch || {}) as Partial<ItemCatalogo>)
            return res.status(it ? 200 : 404).json({ ok: !!it, item: it })
          }
          case 'remover':
            return res.status((await removerItem(String(body.id || ''))) ? 200 : 404).json({ ok: true })
          case 'analisar-planilha': {
            const linhas = parseCSV(String(body.csv || ''))
            if (linhas.length < 2) return res.status(422).json({ error: 'planilha_vazia', mensagem: 'Não achei linhas com dados.' })
            return res.status(200).json({
              delimitador: detectarDelimitador(String(body.csv || '')),
              cabecalho: linhas[0], amostra: linhas.slice(1, 4),
              mapaSugerido: sugerirMapa(linhas[0]), totalLinhas: linhas.length - 1,
            })
          }
          case 'importar': {
            if (perfil !== 'agencia') return res.status(403).json({ error: 'forbidden' })
            const linhas = parseCSV(String(body.csv || ''))
            const mapa = body.mapa as MapaColunas
            if (!mapa?.produto || !mapa?.preco) return res.status(422).json({ error: 'mapa_incompleto', mensagem: 'Diga qual coluna é o produto e qual é o preço.' })
            const itens = linhasParaItens(linhas, mapa, () => novoId())
            if (!itens.length) return res.status(422).json({ error: 'nada_importado', mensagem: 'A planilha não gerou nenhum item com produto.' })
            return res.status(200).json({ ok: true, total: await substituirCatalogo(itens) })
          }
          default: return res.status(400).json({ error: 'ação inválida' })
        }
      }

      // ─────────────────────── BASE DE CONHECIMENTO (§5) ───────────────────────
      case 'conhecimento': {
        if (req.method === 'GET') {
          if (req.query.busca) return res.status(200).json({ resultados: await buscarNaBase(String(req.query.busca)) })
          return res.status(200).json(await saudeConhecimento())
        }
        switch (body.acao) {
          case 'adicionar': {
            const f = (body.faq || {}) as Partial<FaqConhecimento>
            if (!f.pergunta?.trim() || !f.resposta?.trim()) return res.status(422).json({ error: 'par_incompleto', mensagem: 'Preciso da pergunta E da resposta.' })
            const nova = await adicionarFaq({
              topico: f.topico?.toString().trim() || 'Geral',
              pergunta: f.pergunta.trim(), resposta: f.resposta.trim(), ativo: f.ativo !== false,
            })
            const { decisao } = await saudeConhecimento()
            return res.status(200).json({ ok: true, faq: nova, decisao })
          }
          case 'editar': {
            const f = await editarFaq(String(body.id || ''), (body.patch || {}) as Partial<FaqConhecimento>)
            return res.status(f ? 200 : 404).json({ ok: !!f, faq: f })
          }
          case 'remover':
            return res.status((await removerFaq(String(body.id || ''))) ? 200 : 404).json({ ok: true })
          default: return res.status(400).json({ error: 'ação inválida' })
        }
      }

      // ─────────────────────── MÍDIAS (§7) ───────────────────────
      case 'midias': {
        if (req.method === 'GET') return res.status(200).json({ midias: await listarMidias() })
        switch (body.acao) {
          case 'adicionar': {
            const m = (body.midia || {}) as Partial<Midia>
            if (!m.titulo?.trim() || !m.url?.trim()) return res.status(422).json({ error: 'faltam_campos', mensagem: 'Preciso do título e do link do arquivo.' })
            const TIPOS: TipoMidia[] = ['imagem', 'pdf', 'video']
            const nova = await adicionarMidia({
              titulo: m.titulo.trim(), url: m.url.trim(),
              tipo: TIPOS.includes(m.tipo as TipoMidia) ? (m.tipo as TipoMidia) : 'imagem',
              categoria: m.categoria?.toString().trim() || 'Geral',
              quando: m.quando?.toString().trim() || 'quando fizer sentido', ativo: m.ativo !== false,
            })
            return res.status(200).json({ ok: true, midia: nova })
          }
          case 'editar': {
            const m = await editarMidia(String(body.id || ''), (body.patch || {}) as Partial<Midia>)
            return res.status(m ? 200 : 404).json({ ok: !!m, midia: m })
          }
          case 'remover':
            return res.status((await removerMidia(String(body.id || ''))) ? 200 : 404).json({ ok: true })
          default: return res.status(400).json({ error: 'ação inválida' })
        }
      }

      default:
        return res.status(400).json({ error: 'recurso inválido (catalogo | conhecimento | midias | execucoes)' })
    }
  } catch (e) {
    console.error(`[api/central:${recurso}] erro:`, e)
    return res.status(500).json({ error: e instanceof Error ? e.message : 'erro' })
  }
}
