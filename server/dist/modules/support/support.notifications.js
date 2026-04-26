import nodemailer from 'nodemailer';
export function buildSupportEmailSubject(env, ticketCode, severity, category, title) {
    const prefix = env.supportEmailSubjectPrefix.trim() || '[SGP]';
    const raw = `${prefix}[${ticketCode}][${severity}] ${category} - ${title}`;
    return raw.length > 250 ? raw.slice(0, 247) + '...' : raw;
}
export function buildSupportEmailText(input) {
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
    ];
    return lines.join('\n');
}
class EmailSupportNotifier {
    env;
    constructor(env) {
        this.env = env;
    }
    async send(input) {
        const from = this.env.supportEmailFrom?.trim();
        if (!from) {
            return {
                status: 'SKIPPED',
                errorMessage: 'SUPPORT_EMAIL_FROM não configurado.',
            };
        }
        const host = this.env.smtpHost?.trim();
        if (!host) {
            return {
                status: 'SKIPPED',
                errorMessage: 'SMTP_HOST não configurado.',
            };
        }
        const port = this.env.smtpPort ?? 587;
        const secure = this.env.smtpSecure ?? false;
        const requireTLS = this.env.smtpRequireTls ?? port === 587;
        try {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure,
                requireTLS,
                auth: this.env.smtpUser?.trim()
                    ? {
                        user: this.env.smtpUser.trim(),
                        pass: this.env.smtpPass ?? '',
                    }
                    : undefined,
            });
            const subject = buildSupportEmailSubject(this.env, input.ticketCode, input.severity, input.category, input.title);
            const text = buildSupportEmailText(input);
            const info = await transporter.sendMail({
                from,
                to: input.destination,
                replyTo: this.env.supportEmailReplyTo?.trim() || undefined,
                subject,
                text,
            });
            return {
                status: 'SENT',
                providerMessageId: info.messageId?.replace(/[<>]/g, '') ?? undefined,
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message.slice(0, 500) : 'Falha SMTP desconhecida.';
            return { status: 'FAILED', errorMessage: msg };
        }
    }
}
class WhatsAppSupportNotifier {
    async send() {
        return {
            status: 'SKIPPED',
            errorMessage: 'WhatsApp provider indisponível neste ambiente.',
        };
    }
}
function notifierByChannel(channel, env) {
    return channel === 'EMAIL' ? new EmailSupportNotifier(env) : new WhatsAppSupportNotifier();
}
export async function dispatchNotifications(env, plan, ticket) {
    const results = [];
    for (const item of plan) {
        const enabled = item.channel === 'EMAIL' ? env.supportEmailEnabled : env.supportWhatsappEnabled;
        if (!enabled) {
            results.push({
                channel: item.channel,
                destination: item.destination,
                status: 'SKIPPED',
                errorMessage: `${item.channel} desativado por configuração.`,
            });
            continue;
        }
        try {
            const notifier = notifierByChannel(item.channel, env);
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
            });
            results.push({
                channel: item.channel,
                destination: item.destination,
                status: sendResult.status,
                providerMessageId: sendResult.providerMessageId,
                errorMessage: sendResult.errorMessage,
            });
        }
        catch (error) {
            results.push({
                channel: item.channel,
                destination: item.destination,
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Falha desconhecida.',
            });
        }
    }
    return results;
}
//# sourceMappingURL=support.notifications.js.map