# Playbook: orchestrated-delivery

## Objetivo

Entregar uma demanda média ou grande do SGP+ Web com o mínimo de intervenção
humana, sem abrir mão de rastreabilidade e sem confiar em relatório de agente
como se fosse evidência.

Este playbook é executado pela **sessão orquestradora** (a sessão principal do
Claude Code). A sessão orquestradora não implementa: ela coordena subagentes,
lê artefatos reais e decide se avança ou para.

## Papéis

| Etapa | Agente | Altera código? |
|---|---|---|
| Contexto | `sgp-context-reader` | Não |
| Impacto | `sgp-impact-analyst` | Não |
| Especificação | `sgp-feature-spec-writer` | Não |
| Implementação | `sgp-implementer` | **Sim (único)** |
| Teste | `sgp-test-reviewer` | Não |

## Onde o humano entra

Só em dois pontos. Fora deles, o loop é autônomo.

1. **Impacto ≠ SEGUIR.** Se o `sgp-impact-analyst` devolver
   `SEGUIR COM AJUSTES`, `BLOQUEAR ATÉ ESCLARECER` ou `NÃO IMPLEMENTAR`,
   o fluxo para e devolve para o humano. A automação não tenta "resolver"
   um bloqueio sozinha.
2. **Antes do PR.** Nada é mergeado em `develop` sem aprovação humana.
   O agente abre o PR; o humano revisa e faz o merge.

## Regra de ouro dos gates

O orquestrador **nunca aprova uma etapa com base no que o subagente disse ter
feito**. Aprova com base em artefato que ele mesmo consegue ver ou reexecutar:

- `git diff` real;
- saída real de `npm run lint` (eslint);
- saída real de `tsc -b` (typecheck);
- saída real de `npm test` / `npm run server:test` (vitest), com exit code.

Relatório em prosa é resumo, não prova. Se o relatório e o exit code
divergirem, vale o exit code.

## Fluxo

### 0. Refino da demanda (humano + orquestrador)

O humano descreve a demanda. O orquestrador reescreve em uma frase objetiva
e confirma antes de gastar tokens em subagente.

### 1. Contexto — `sgp-context-reader`

Produz um mapa de contexto enxuto (arquivos, módulos, permissões relevantes).
As etapas seguintes reusam esse mapa em vez de redescobrir a árvore de `src/`.

### 2. Impacto — `sgp-impact-analyst`

Devolve `docs/ai/templates/impact-report.md` com veredito.

- Veredito = **SEGUIR** → segue automático para a etapa 3.
- Veredito ≠ SEGUIR → **para. Volta para o humano.** (Gate humano 1.)

### 3. Especificação — `sgp-feature-spec-writer`

Transforma a demanda em escopo fechado com **critérios de aceite explícitos**.
Os critérios de aceite são a definição independente de "certo" — escritos
antes da implementação, para que o teste não seja escrito só para passar.

Saída: `docs/ai/templates/spec.md`.

### 4. Implementação — `sgp-implementer`

Único agente que altera código. Implementa a produção **e** os testes que
cobrem os critérios de aceite da etapa 3. Escopo fechado, sem refatoração
oportunista.

Saída obrigatória: `docs/ai/templates/implementation-report.md` **acompanhado
de `git diff` e da saída real de tsc/eslint**. Sem isso, o orquestrador não
avança.

### 5. Teste — `sgp-test-reviewer`

Reexecuta a suíte inteira (não confia no report do implementador), confere se
os testes cobrem os critérios de aceite da spec e reporta lacunas.

Saída: `docs/ai/templates/test-report.md` com veredito `PASSA` / `PASSA COM
RESSALVAS` / `REPROVA`.

- `PASSA` → segue para o gate do PR.
- `PASSA COM RESSALVAS` ou `REPROVA` → volta para o `sgp-implementer`
  corrigir. Isto é loop autônomo (não é gate humano), **limitado a 2 ciclos**.
  Ao fim do 2º ciclo sem `PASSA`, para e escala para o humano.

> Nota: esse limite de 2 ciclos é uma trava de segurança contra loop infinito.
> Não estava na decisão original; foi adicionado porque "humano só em não-SEGUIR
> e no PR" não cobre o caso de teste que nunca fecha. Ajuste o número se quiser.

### 6. Pull Request (gate humano 2)

O agente abre PR de `feature/*` (ou `fix/*`) para **`develop`**, anexando:
spec, impact-report, implementation-report, test-report e o diff.

O humano revisa e faz o merge. **O agente não faz merge nem deploy.**
`develop` não dispara deploy de produção (só `main` dispara, via
`deploy-ec2.yml`), então o merge em `develop` é seguro — mas continua sendo
decisão humana.

## Quando NÃO usar este playbook

Mudança trivial (ajuste de texto, CSS isolado, troca de label sem regra):
pula a cerimônia inteira, conforme `docs/ai/agents/sgp-impact-analyst.md`
("quando não usar"). Rodar 5 agentes para trocar um label é desperdício.

## Encerramento

Após o merge, o mapa de contexto e os relatórios ficam no PR como trilha de
auditoria. Se algum artefato de `docs/ai/` não for reusado em 60 dias,
arquivar (regra anti-zoológico do `docs/ai/README.md`).
