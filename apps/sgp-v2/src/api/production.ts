import type { Justificativa, Pessoa, Tarefa } from '../domain/tablet'
import { api } from './client'

/** Modo Produção da V1 (cookie próprio do tablet, separado da sessão da gestora). */

const TOKEN = 'sgp-v2-kiosk-token'

/** Token do tablet (o mesmo `PRODUCTION_KIOSK_TOKEN` da V1), digitado uma vez pela gestora. */
export function tokenDoTablet(): string {
  try {
    return localStorage.getItem(TOKEN) ?? ''
  } catch {
    return ''
  }
}

export function salvarTokenDoTablet(t: string): void {
  try {
    localStorage.setItem(TOKEN, t.trim())
  } catch {
    // sem armazenamento: vale até fechar a tela
  }
}

export async function listPessoas(): Promise<Pessoa[]> {
  const t = tokenDoTablet()
  const r = await api<{ items: Pessoa[] }>('/production/collaborators', { headers: t ? { 'X-SGP-Kiosk-Token': t } : {} }, false)
  return r.items
}

export type Entrada = { status: 'AUTHENTICATED' | 'PIN_CHANGE_REQUIRED'; collaborator: Pessoa }

export function entrar(collaboratorId: string, pin: string): Promise<Entrada> {
  return api<Entrada>('/production/auth/login', { method: 'POST', body: JSON.stringify({ collaboratorId, pin }) }, false)
}

export function trocarPin(newPin: string, confirmPin: string): Promise<void> {
  return api<void>('/production/auth/change-pin', { method: 'POST', body: JSON.stringify({ newPin, confirmPin }) }, false)
}

export async function sair(): Promise<void> {
  await api<void>('/production/auth/logout', { method: 'POST', body: '{}' }, false).catch(() => undefined)
}

export async function minhaFila(): Promise<Tarefa[]> {
  return (await api<{ items: Tarefa[] }>('/production/me/work-queue', {}, false)).items
}

export function justificativas(): Promise<Justificativa[]> {
  return api<Justificativa[]>('/production/time-entry-justifications', {}, false)
}

export function lancar(body: unknown): Promise<unknown> {
  return api<unknown>('/production/time-entries', { method: 'POST', body: JSON.stringify(body) }, false)
}
