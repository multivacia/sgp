import express from 'express'
import cors from 'cors'
import type { AgentConfig, TicketPrintResult } from '../types.js'
import { logger } from '../logger.js'
import { printActivityTicket } from '../printing/printerService.js'
import { buildTestTicket } from '../printing/formatTicket.js'
import {
  activityTicketSchema,
  batchTicketsBodySchema,
  singleTicketBodySchema,
} from '../validation/ticketSchema.js'
import { createAuthMiddleware, createLocalhostOnlyMiddleware } from './middleware.js'

const VERSION = '0.1.0'

export function createApp(config: AgentConfig) {
  const app = express()

  app.use(createLocalhostOnlyMiddleware())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true)
          return
        }
        if (config.allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new Error('Origin nao permitida pelo SGP Print Agent'))
      },
    }),
  )
  app.use(express.json({ limit: '256kb' }))

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'sgp-print-agent',
      version: VERSION,
      printerName: config.printerName,
      mockPrinter: config.mockPrinter,
      paperWidthMm: config.paperWidthMm,
    })
  })

  const protectedRouter = express.Router()
  protectedRouter.use(createAuthMiddleware(config))

  protectedRouter.post('/print/activity-ticket', async (req, res) => {
    const parsed = singleTicketBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalido', details: parsed.error.flatten() })
      return
    }

    try {
      await printActivityTicket(config, parsed.data.ticket)
      const result: TicketPrintResult = {
        index: 0,
        success: true,
        message: 'Ticket impresso com sucesso',
        activityNodeId: parsed.data.ticket.activityNodeId,
        shortCode: parsed.data.ticket.shortCode,
      }
      res.json({ success: true, results: [result] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao imprimir ticket'
      logger.error('Erro ao imprimir ticket', { message })
      res.status(500).json({
        success: false,
        results: [
          {
            index: 0,
            success: false,
            message,
            activityNodeId: parsed.data.ticket.activityNodeId,
            shortCode: parsed.data.ticket.shortCode,
          },
        ],
      })
    }
  })

  protectedRouter.post('/print/activity-tickets/batch', async (req, res) => {
    const parsed = batchTicketsBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalido', details: parsed.error.flatten() })
      return
    }

    const results: TicketPrintResult[] = []
    for (let index = 0; index < parsed.data.tickets.length; index += 1) {
      const ticket = parsed.data.tickets[index]
      try {
        await printActivityTicket(config, ticket)
        results.push({
          index,
          success: true,
          message: 'Ticket impresso com sucesso',
          activityNodeId: ticket.activityNodeId,
          shortCode: ticket.shortCode,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao imprimir ticket'
        logger.error('Erro no lote de tickets', { index, message, shortCode: ticket.shortCode })
        results.push({
          index,
          success: false,
          message,
          activityNodeId: ticket.activityNodeId,
          shortCode: ticket.shortCode,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount
    res.status(failureCount > 0 ? 207 : 200).json({
      success: failureCount === 0,
      successCount,
      failureCount,
      results,
    })
  })

  protectedRouter.post('/print/test', async (_req, res) => {
    const ticket = buildTestTicket()
    const parsed = activityTicketSchema.safeParse(ticket)
    if (!parsed.success) {
      res.status(500).json({ error: 'Ticket de teste invalido' })
      return
    }

    try {
      await printActivityTicket(config, parsed.data)
      res.json({
        success: true,
        message: 'Ticket de teste impresso',
        ticket: parsed.data,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no teste de impressao'
      logger.error('Erro no teste de impressao', { message })
      res.status(500).json({ success: false, message })
    }
  })

  app.use(protectedRouter)

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('Origin nao permitida')) {
      res.status(403).json({ error: message })
      return
    }
    logger.error('Erro HTTP', { message })
    res.status(500).json({ error: message })
  })

  return app
}
