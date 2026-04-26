import nodemailer from 'nodemailer'
import type { Env } from '../../config/env.js'
import type {
  DispatchResult,
  DispatchableNotification,
  PersistedSupportTicket,
} from './support.types.js'

type NotificationChannelResult = {
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  providerMessageId?: string
  errorMessage?: string
}

type NotifierSendInput = {
  destination: string
  ticketCode: string
  title: string
  description: string
  severity: string
  category: string
  moduleName?: string | null
  routePath?: string | null
  createdByUserId: string
  createdAt: string
}

interface SupportNotifier {
  send(input: NotifierSendInput): Promise<NotificationChannelResult>
}

export function buildSupportEmailSubject(
  env: Env,
  ticketCode: string,
  severity: string,
  category: string,
  title: string,
): string {
  const prefix = env.supportEmailSubjectPrefix.trim() || '[SGP]'
  const raw = `${prefix}[${ticketCode}][${severity}] ${category} - ${title}`
  return raw.length > 250 ? raw.slice(0, 247) + '...' : raw
}

export function buildSupportEmailText(input: NotifierSendInput): string {
  const lines = [
    `Protocolo: ${input.ticketCode}`,
    `Categoria: ${input.category}`,
    `Severidade: ${input.severity}`,
    `Utilizador (ID): ${input.createdByUserId}`,
    `Módulo/tela: ${input.moduleName ?? '—'}`,
    `Rota: ${input.routePath ?? '—'}`,
    `Assunto: ${input.title}`,
    '',
    'Descrição:',
    input.description,
    '',
    `Data/hora (UTC): ${input.createdAt}`,
  ]
  return lines.join('\n')
}

class EmailSupportNotifier implements SupportNotifier {
  constructor(private readonly env: Env) {}

  async send(input: NotifierSendInput): Promise<NotificationChannelResult> {
    const from = this.env.supportEmailFrom?.trim()
    if (!from) {
      return {
        status: 'SKIPPED',
        errorMessage: 'SUPPORT_EMAIL_FROM não configurado.',
      }
    }
    const host = this.env.smtpHost?.trim()
    if (!host) {
      return {
        status: 'SKIPPED',
        errorMessage: 'SMTP_HOST não configurado.',
      }
    }

    const port = this.env.smtpPort ?? 587
    const secure = this.env.smtpSecure ?? false
    const requireTLS = this.env.smtpRequireTls ?? port === 587

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS,
        auth:
          this.env.smtpUser?.trim()
            ? {
                user: this.env.smtpUser.trim(),
                pass: this.env.smtpPass ?? '',
              }
            : undefined,
      })

      const subject = buildSupportEmailSubject(
        this.env,
        input.ticketCode,
        input.severity,
        input.category,
        input.title,
      )
      const text = buildSupportEmailText(input)

      const info = await transporter.sendMail({
        from,
        to: input.destination,
        replyTo: this.env.supportEmailReplyTo?.trim() || undefined,
        subject,
        text,
      })

      return {
        status: 'SENT',
        providerMessageId: info.messageId?.replace(/[<>]/g, '') ?? undefined,
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message.slice(0, 500) : 'Falha SMTP desconhecida.'
      return { status: 'FAILED', errorMessage: msg }
    }
  }
}

class WhatsAppSupportNotifier implements SupportNotifier {
  async send(): Promise<NotificationChannelResult> {
    return {
      status: 'SKIPPED',
      errorMessage: 'WhatsApp provider indisponível neste ambiente.',
    }
  }
}

function notifierByChannel(channel: 'EMAIL' | 'WHATSAPP', env: Env): SupportNotifier {
  return channel === 'EMAIL' ? new EmailSupportNotifier(env) : new WhatsAppSupportNotifier()
}

export async function dispatchNotifications(
  env: Env,
  plan: DispatchableNotification[],
  ticket: PersistedSupportTicket,
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = []
  for (const item of plan) {
    const enabled = item.channel === 'EMAIL' ? env.supportEmailEnabled : env.supportWhatsappEnabled
    if (!enabled) {
      results.push({
        channel: item.channel,
        destination: item.destination,
        status: 'SKIPPED',
        errorMessage: `${item.channel} desativado por configuração.`,
      })
      continue
    }
    try {
      const notifier = notifierByChannel(item.channel, env)
      const sendResult = await notifier.send({
        destination: item.destination,
        ticketCode: ticket.code,
        title: ticket.title,
        description: ticket.description,
        severity: ticket.severity,
        category: ticket.category,
        moduleName: ticket.moduleName,
        routePath: ticket.routePath,
        createdByUserId: ticket.createdByUserId,
        createdAt: ticket.createdAt,
      })
      results.push({
        channel: item.channel,
        destination: item.destination,
        status: sendResult.status,
        providerMessageId: sendResult.providerMessageId,
        errorMessage: sendResult.errorMessage,
      })
    } catch (error) {
      results.push({
        channel: item.channel,
        destination: item.destination,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Falha desconhecida.',
      })
    }
  }
  return results
}
