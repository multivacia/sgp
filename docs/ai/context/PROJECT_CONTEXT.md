# PROJECT_CONTEXT — SGP+ Web

**Objetivo:** fornecer contexto estável e compacto para qualquer IA que trabalhe no SGP+.
**Última revisão:** 2026-10-01

Este arquivo não é diário de sessão. Mudanças transitórias devem ficar em
`SESSION_CHECKPOINT.md` e os resultados de cada atividade em `docs/ai/returns/`.

## Produto

SGP+ é o sistema de gestão de produção do ecossistema Multivacia / ARGOS,
voltado à operação de tapeçaria automotiva Premium.

Princípio operacional: **operação primeiro, visão depois**.

A UX deve reduzir raciocínio e digitação do colaborador de fábrica.
Gestores precisam de visão rápida e rastreável do planejamento e da execução.

## Modelo operacional

Hierarquia conceitual:

```text
Esteira
└── Tarefa
    └── Setor
        └── Atividade / Step
```

Status de esteira usados no fluxo operacional:

```text
EM_ELABORACAO
→ AGUARDANDO_PLANEJAMENTO
→ EM_PLANEJAMENTO
→ A_INICIAR
→ EM_ANDAMENTO
→ FINALIZADA
```

`CANCELADA` é estado terminal aplicável conforme regra de negócio.
Retrocesso de status deve preservar histórico e justificativa quando exigido.

## Regras de negócio críticas

- Backend é fonte da verdade para regras de negócio.
- Planejamento semanal publicado participa da fonte operacional da fila.
- Apontamentos e histórico já executado não podem ser silenciosamente reescritos.
- Alterações estruturais devem preservar IDs e vínculos quando houver histórico.
- Atividade que já possui apontamento deve ser tratada como histórica/protegida para alterações que mudem o significado do realizado.
- Quantidade prevista pode ser alterada quando a atividade ainda não possui apontamentos, respeitando as regras implementadas no domínio.
- Correção gerencial de apontamentos deve respeitar as permissões RBAC existentes.
- Kiosk/Produção possuem fluxo de autenticação e UX próprios; preservar o isolamento.
- Usuário final não deve receber jargão técnico como `STEP` quando existir termo funcional em português.

## Stack principal

Frontend:

- React 19;
- TypeScript;
- Vite 8;
- Tailwind CSS 4;
- React Router;
- Vitest.

Backend:

- Node.js;
- Express;
- PostgreSQL;
- Zod;
- Pino;
- Vitest/Supertest.

Estrutura backend predominante:

```text
controller → routes → service → repository
```

## Diretórios importantes

```text
src/                         frontend
src/features/                telas e features
src/domain/                  tipos e regras de domínio
src/services/                integração frontend/API
src/routes/                  rotas e guards
server/src/modules/          módulos backend
server/src/shared/           utilitários e infraestrutura compartilhada
server/migrations/           migrations SQL
docs/ai/                     camada neutra de IA
.claude/                     adaptadores/agentes Claude
```

Arquivos de governança:

```text
AGENTS.md
CLAUDE.md
docs/ai/context/PROJECT_CONTEXT.md
docs/ai/context/SESSION_CHECKPOINT.md
```

## Governança de branches

Referência operacional:

- `develop`: integração e validação das entregas;
- `homol`: homologação quando utilizada pelo fluxo de deploy;
- `main`: produção.

Promoção para `main`, merge e deploy exigem aprovação humana explícita.
Não usar force-push.

Antes de qualquer operação Git relevante, confirmar o estado real do remoto.

## Banco e migrations

As migrations são sequenciais e ficam em `server/migrations/`.

Em `develop`, na revisão de 2026-10-01, existiam migrations até `0053`.
**Não assuma que `0054` continua livre:** sempre liste/inspecione o diretório real antes de criar uma migration.

Nunca aplicar migration em ambiente compartilhado sem autorização.

## Camada de IA

`docs/ai/` é neutro em relação a Claude, Codex ou Cursor.

Papéis e regras de atuação ficam em `AGENTS.md`.
Adaptadores específicos podem existir em `.claude/`, `.cursor/`, `.codex/` ou `.agents/`.

Para atividades médias/grandes, seguir o fluxo já estabelecido:

1. contexto;
2. impacto;
3. especificação curta;
4. implementação;
5. revisão/testes;
6. retorno rastreável.

## Convenções

- Textos de produto e mensagens para usuário: português do Brasil.
- Código TypeScript: nomes de variáveis/funções/tipos preferencialmente em inglês.
- Validação backend: Zod.
- Logging: Pino.
- Permissões: reutilizar RBAC existente.
- Evitar criar padrão novo se já existe padrão equivalente no projeto.
- Evitar arquivos Markdown sem função operacional clara.

## Fontes dinâmicas que devem ser verificadas no código

Não manter aqui valores que mudam com frequência. Sempre consultar o repositório para:

- versão atual da aplicação;
- último SHA;
- branches ativas;
- próxima migration disponível;
- contagem de testes;
- lista exata de rotas;
- lista exata de módulos;
- status de deploy;
- features ainda pendentes.

## Continuidade entre chats

Ao iniciar uma nova sessão:

1. leia este arquivo;
2. leia `SESSION_CHECKPOINT.md`;
3. valide branch, HEAD e working tree;
4. retome a partir do estado real do Git;
5. consulte código/documentação adicional somente sob demanda.

O objetivo é reconstruir contexto suficiente sem carregar o histórico inteiro da conversa anterior.
