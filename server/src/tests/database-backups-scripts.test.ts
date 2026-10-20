import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const BACKUP_SCRIPT = join(repoRoot, 'scripts/db/backup/sgp-db-backup.sh')
const REMOTE_SCRIPT = join(repoRoot, 'scripts/db/backup/sgp-backup-remote.sh')

function retentionPlan(names: string[]): Map<string, string> {
  const r = spawnSync('bash', [BACKUP_SCRIPT, '--retention-plan'], {
    input: names.join('\n') + '\n',
    encoding: 'utf-8',
  })
  expect(r.status).toBe(0)
  const out = new Map<string, string>()
  for (const line of r.stdout.trim().split('\n')) {
    const [action, name] = line.split(' ')
    out.set(name!, action!)
  }
  return out
}

function dump(ymd: string, hms: string, reason: string): string {
  return `sgp_${ymd}-${hms}_${reason}.dump`
}

describe('sgp-db-backup.sh --retention-plan (7 diários, 4 semanais, 3 mensais)', () => {
  it('mantém os 7 dias mais recentes, 4 domingos e 3 dias 1; apaga o resto', () => {
    // Um backup agendado por dia de 2026-06-01 a 2026-10-19, mais um pre-deploy no último dia.
    const names: string[] = []
    const start = Date.UTC(2026, 5, 1)
    const end = Date.UTC(2026, 9, 19)
    for (let t = start; t <= end; t += 86_400_000) {
      const d = new Date(t).toISOString().slice(0, 10).replace(/-/g, '')
      names.push(dump(d, '030000', 'scheduled'))
      names.push(`sgp_${d}-030000_scheduled.globals.sql`)
    }
    names.push(dump('20261019', '140000', 'pre-deploy'))
    names.push('backup-log.jsonl')
    names.push('outro-arquivo.dump')

    const plan = retentionPlan(names)
    const kept = [...plan.entries()]
      .filter(([n, a]) => a === 'keep' && n.endsWith('.dump'))
      .map(([n]) => n.slice(4, 12))
      .sort()

    // Diários: 13..19/10. Semanais (domingos): 18/10, 11/10, 04/10, 27/09.
    // Mensais (dia 1): 01/10, 01/09, 01/08. Total distinto de datas: 7 + 3 + 3 = 13.
    expect([...new Set(kept)]).toEqual([
      '20260801',
      '20260901',
      '20260927',
      '20261001',
      '20261004',
      '20261011',
      '20261013',
      '20261014',
      '20261015',
      '20261016',
      '20261017',
      '20261018',
      '20261019',
    ])
    // pre-deploy segue a retenção dos diários (mantido junto com o agendado do mesmo dia).
    expect(plan.get(dump('20261019', '140000', 'pre-deploy'))).toBe('keep')
    expect(plan.get(dump('20261019', '030000', 'scheduled'))).toBe('keep')
    // globals acompanha o dump do mesmo conjunto.
    expect(plan.get('sgp_20261001-030000_scheduled.globals.sql')).toBe('keep')
    expect(plan.get('sgp_20261002-030000_scheduled.globals.sql')).toBe('delete')
    // Semanal e mensal mais antigos que o limite são apagados.
    expect(plan.get(dump('20260920', '030000', 'scheduled'))).toBe('delete')
    expect(plan.get(dump('20260701', '030000', 'scheduled'))).toBe('delete')
    expect(plan.get(dump('20261012', '030000', 'scheduled'))).toBe('delete')
    // Arquivos fora do padrão nunca são apagados.
    expect(plan.get('backup-log.jsonl')).toBe('ignore')
    expect(plan.get('outro-arquivo.dump')).toBe('ignore')
  })

  it('no domingo com dois backups, o semanal é o último do dia', () => {
    const names = [
      dump('20260913', '030000', 'scheduled'),
      dump('20260913', '150000', 'pre-deploy'),
      ...Array.from({ length: 8 }, (_, i) => dump(`202610${String(10 + i)}`, '030000', 'scheduled')),
    ]
    const plan = retentionPlan(names)
    expect(plan.get(dump('20260913', '150000', 'pre-deploy'))).toBe('keep')
    expect(plan.get(dump('20260913', '030000', 'scheduled'))).toBe('delete')
    // 8 dias recentes: o mais antigo (10/10) sai dos diários e não é domingo nem dia 1.
    expect(plan.get(dump('20261010', '030000', 'scheduled'))).toBe('delete')
    expect(plan.get(dump('20261011', '030000', 'scheduled'))).toBe('keep')
  })

  it('se o agendamento parar, os últimos backups não são apagados', () => {
    const names = [dump('20250102', '030000', 'scheduled'), dump('20250103', '030000', 'scheduled')]
    const plan = retentionPlan(names)
    expect([...plan.values()]).toEqual(['keep', 'keep'])
  })

  it('recusa motivo inválido', () => {
    const r = spawnSync('bash', [BACKUP_SCRIPT, '--reason', 'qualquer'], { encoding: 'utf-8' })
    expect(r.status).toBe(2)
  })
})

describe('sgp-backup-remote.sh (forced command)', () => {
  let dir: string
  const okDump = 'sgp_20261019-030000_scheduled.dump'
  const okSha = 'a'.repeat(64)

  function remote(command: string): ReturnType<typeof spawnSync> {
    return spawnSync('bash', [REMOTE_SCRIPT], {
      env: { ...process.env, SGP_BACKUP_DIR: dir, SSH_ORIGINAL_COMMAND: command },
      encoding: 'utf-8',
    })
  }

  beforeAll(() => {
    const root = mkdtempSync(join(tmpdir(), 'sgp-remote-'))
    dir = join(root, 'db')
    mkdirSync(dir)
    writeFileSync(join(dir, okDump), 'conteudo-dump')
    writeFileSync(join(dir, `${okDump}.sha256`), `${okSha}  ${okDump}\n`)
    // Arquivo com nome válido mas sem .sha256: fora da lista.
    writeFileSync(join(dir, 'sgp_20261018-030000_scheduled.dump'), 'sem-sha')
    // Link simbólico com nome válido apontando para fora: fora da lista.
    writeFileSync(join(root, 'segredo.txt'), 'segredo')
    symlinkSync(join(root, 'segredo.txt'), join(dir, 'sgp_20261017-030000_manual.dump'))
    writeFileSync(join(dir, 'sgp_20261017-030000_manual.dump.sha256'), `${okSha}  x\n`)
    writeFileSync(join(root, 'sgp_20261016-030000_manual.dump'), 'fora-do-diretorio')
  })

  afterAll(() => {
    rmSync(dirname(dir), { recursive: true, force: true })
  })

  it('list mostra só arquivos válidos com SHA-256', () => {
    const r = remote('list')
    expect(r.status).toBe(0)
    expect(String(r.stdout).trim()).toBe(`${okSha} ${okDump} 13`)
  })

  it('get envia o arquivo listado', () => {
    const r = remote(`get ${okDump}`)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('conteudo-dump')
  })

  it.each([
    ['comando desconhecido', 'rm -rf /'],
    ['comando desconhecido (shell)', 'bash'],
    ['comando vazio', ''],
    ['path traversal com ../', 'get ../sgp_20261016-030000_manual.dump'],
    ['path absoluto', `get /etc/passwd`],
    ['arquivo sem .sha256', 'get sgp_20261018-030000_scheduled.dump'],
    ['link simbólico', 'get sgp_20261017-030000_manual.dump'],
    ['nome fora do padrão', 'get backup-log.jsonl'],
    ['metacaracteres', `get ${okDump}; cat /etc/passwd`],
    ['argumentos extras', `get ${okDump} outro`],
    ['confirm com SHA inválido', `confirm ${okDump} xyz`],
    ['confirm de arquivo fora da lista', `confirm ../x ${okSha}`],
  ])('recusa: %s', (_label, command) => {
    const r = remote(command)
    expect(r.status).toBe(2)
    expect(String(r.stdout)).toBe('')
  })

  it('confirm com SHA divergente falha e não registra', () => {
    const r = remote(`confirm ${okDump} ${'b'.repeat(64)}`)
    expect(r.status).toBe(1)
    let log = ''
    try {
      log = readFileSync(join(dir, 'backup-log.jsonl'), 'utf-8')
    } catch {
      log = ''
    }
    expect(log).toBe('')
  })

  it('confirm com SHA correto registra a cópia no log', () => {
    const r = remote(`confirm ${okDump} ${okSha}`)
    expect(r.status).toBe(0)
    const lines = readFileSync(join(dir, 'backup-log.jsonl'), 'utf-8').trim().split('\n')
    const ev = JSON.parse(lines[lines.length - 1]!) as Record<string, string>
    expect(ev.event).toBe('copy-confirm')
    expect(ev.file).toBe(okDump)
    expect(ev.sha256).toBe(okSha)
  })
})
