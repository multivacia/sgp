# SGP+ V2 — documento vivo

> **Para que serve:** retomar o desenvolvimento da V2 em qualquer sessão/chat.
> **Como usar:** ler isto + `git log` da branch antes de começar; atualizar **Status** e **Decisões** ao fim de cada passo.
> **Branch de trabalho:** `ccr-683413c7-571rnk` · **Atualizado em:** 2026-10-17

---

## 1. Objetivo

Tirar a operação do notebook. A V2 é um app **mobile-first** (celular da gestora, tablet do setor) com UX de "cardápio de fast-food": tocar em vez de digitar, figuras, poucos passos, letra grande.

Usuários: gestora de esteira (criar esteira, planejar, acompanhar o dia) e colaboradores de fábrica (apontar trabalho).

Protótipo aprovado: https://claude.ai/artifact/QBY3svGbjp7ALeewX1w9n2 (privado do dono).
Histórico da concepção: `docs/ai/returns/redesenho-ux-mobile-retorno.md`.

## 2. Regras da V2 (combinadas com o dono do produto)

1. **V1 não é tocada.** `src/` (frontend V1) não recebe mudança da V2. V1 só recebe hotfix pelo fluxo normal.
2. **Pasta separada:** frontend da V2 em `apps/sgp-v2/` — nome do produto **SGP+ V2**, link terminando em **`/V2`**. Não importa nada de `src/`.
3. **Backend: usar o da V1.** Consumir `/api/v1` como está. Só quando faltar algo, criar o **equivalente V2** em módulo próprio (`/api/v2`), como **adaptador fino que chama os services da V1** — nunca copiar regra de negócio. Migrations só aditivas.
4. **Testes só do que importa** (ver §5). Nada de teste de texto, cor ou snapshot.
5. **Retorno no chat em 6 linhas** (§7). O arquivo `docs/ai/returns/<TASK_ID>-retorno.md` continua **detalhado** como manda o `CLAUDE.md`.
6. **Piloto aberto a todos os usuários** (sem liberação por papel para *acessar*; permissões de *ação* continuam no RBAC).

## 3. Arquitetura

| Parte | V1 (congelada) | V2 |
|---|---|---|
| Frontend | `src/` → web dir da V1 em `/` | `apps/sgp-v2/` → **web dir próprio** (ex.: `/var/www/sgp-web-v2`) em `/V2/` (gestor) e `/V2/tablet` (setor), PWA; `/v2` redireciona para `/V2/` |
| Sessão | cookie httpOnly `path: '/'` | mesmo cookie → login único, sem mudança de CORS |
| API | `/api/v1` | reutiliza `/api/v1`; novos só em `/api/v2` (adaptadores) |
| Banco | — | mesmo banco; migrations aditivas (conferir número livre em `server/migrations/`) |
| Permissões | RBAC atual | RBAC atual + permissões novas quando preciso (ex.: alterar esteira em andamento = só gestora) |

Stack: Vite, React 19, TypeScript, Tailwind 4 (igual V1). Hierarquia de domínio: **Matriz › Etapa (tarefa) › Setor › Atividade**.

Padrões de UI obrigatórios: corpo ≥ 16px, alvos de toque ≥ 48px, contraste AA, barra de menu inferior, uma pergunta por tela, ação principal no rodapé.

## 4. Fases e status

Legenda: ⬜ não iniciada · 🟨 em andamento · ✅ concluída

| # | Fase | Backend novo? | Risco | Status |
|---|---|---|---|---|
| 0 | Fundação: app vazio em `/V2`, PWA, login compartilhado, tokens de UI, build/deploy separados, guarda de CI "V2 não altera `src/`" | não | baixo | 🟨 spec pronta (§10), aguardando OK |
| 1 | Hoje + Esteiras (só leitura): exceções do dia; ver esteira (etapas → setores → atividades → responsável) | talvez agregador de exceções | baixo | ⬜ |
| 2 | Nova esteira (cardápio): matriz → etapas com figura → personalizar (setor/atividade/responsável) → carro → prazo | imagens de etapa | médio | ⬜ |
| 3 | Alterar esteira = telas da criação + cadeados; motivo obrigatório (inclui troca de responsável) em catálogo + histórico | catálogo de motivos | médio | ⬜ |
| 4 | Planejar semana por etapa (lotação por dia); "Sugerir semana" depois | motor de sugestão (depois) | alto | ⬜ |
| 5 | Tablet do colaborador: lançar horas + QR do ticket; cronômetro depois | sessão de trabalho (cronômetro) | alto | ⬜ |

Fases 4 e 5 (e qualquer mudança em regra de planejamento/apontamento) seguem o fluxo completo do `AGENTS.md`.

**Definição de pronto de cada fase:** build verde · testes críticos da fase passando · testes da V1 intactos e verdes · conferido em celular real (ou navegador mobile) · este documento atualizado.

## 5. Política de testes da V2

Testar **apenas**:
- regras de negócio que a V2 aplica ou depende (ex.: atividade feita/em andamento não pode ser tirada; motivo obrigatório ao alterar esteira em andamento; responsável herdado da matriz);
- contratos com o backend (formato do que a V2 envia/recebe nos endpoints usados);
- permissões (quem pode alterar esteira / trocar responsável);
- 1 teste ponta a ponta por fluxo principal (criar esteira, alterar esteira, apontar).

Não testar: textos, estilos, layout, componentes triviais, snapshots.

## 6. Decisões

| Data | Decisão |
|---|---|
| 2026-10-17 | V2 em pasta separada, produto "SGP+ V2", link final `/V2` |
| 2026-10-17 | Piloto aberto a todos os usuários |
| 2026-10-17 | Backend da V1 reutilizado; adaptação só via equivalente V2 |
| 2026-10-17 | Só a gestora troca responsável e altera esteira em andamento; ambas exigem motivo |
| 2026-10-17 | Ordem de implementação: fases 0 → 5 |
| 2026-10-17 | Chat: retorno em 6 linhas; arquivo de retorno continua detalhado |

## 7. Formato da resposta no chat ao fim de cada passo (6 linhas)

```
Passo: <fase/tarefa> — <concluído | parcial | bloqueado>
Mudou: <1–3 linhas>
⚠️ Crítico: <riscos, decisões pendentes, impacto em V1/banco — ou "nada">
Validação: build <ok/falhou> · testes <n ok / n falha> · V1 intacta <sim/não>
Próximo: <1 linha>
Commit: <sha> · branch <nome>
```

## 8. Pendências / perguntas abertas

- Quais motivos de alteração vocês usam de verdade (protótipo tem 6 de exemplo).
- Quais matrizes existem além de "Gol GTI completo" (planilha mestra em `docs/Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx`).
- Fotos reais das peças/etapas (a figura do protótipo foi gerada por IA).
- Como o usuário chega na V2 sem tocar na V1: link direto/atalho instalado no celular (padrão) ou um link no menu da V1 (exigiria exceção à regra 1).

## 9. Como retomar numa nova sessão

1. Ler `CLAUDE.md`, `AGENTS.md` e este arquivo.
2. `git log --oneline -15` na branch acima; conferir §4 (status) e §8 (pendências).
3. Continuar a próxima fase ⬜/🟨; ao terminar, atualizar §4/§6 e responder no formato da §7.

## 10. Fase 0 — especificação (contexto + impacto)

**Achados críticos**
- ⚠️ O deploy da V1 faz `rsync --delete dist/ $REMOTE_WEB_DIR/` (`.github/workflows/deploy-*.yml`). Se a V2 ficar **dentro** da pasta web da V1, **cada deploy da V1 apaga a V2**. → V2 em pasta web própria + bloco próprio no nginx.
- URL é sensível a maiúsculas: `/V2/` é o endereço oficial; `/v2` redireciona.
- Login: reaproveita `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` (cookie `path: '/'` já vale para `/V2`). Tablet (fase 5) reaproveita `/api/v1/production/*`.
- CI da V1 (`verify-deploy.yml`: build `tsc -b` + vitest) só olha `src/` → não é afetado pela pasta nova. O `eslint .` da raiz também lê `apps/` → código da V2 deve passar no mesmo lint (ou o lint da V2 roda separado sem mexer no da V1).

**Escopo da Fase 0 (nenhum arquivo da V1 alterado)**
1. `apps/sgp-v2/` independente: `package.json` e lockfile próprios; Vite `base: '/V2/'`; React 19 + TS + Tailwind 4; tokens de UI (§3); manifest + ícone PWA.
2. Telas: Login (e-mail/senha) → Shell com barra inferior (Início · Esteiras · Semana · Hoje · Eu) e telas vazias; "Eu" com sair. Rota `/V2/tablet` com placeholder.
3. Cliente de API com `credentials: 'include'` e tratamento de 401 → login.
4. Testes críticos (3): sem sessão vai para login; login ok abre o shell; 401 em qualquer chamada volta ao login.
5. CI novo `verify-v2.yml` (só quando `apps/sgp-v2/**` muda): build + testes da V2 + **guarda** que falha se o mesmo PR alterar `src/`.
6. Deploy: `deploy/nginx/sgp-v2.location.example` (novo, não altera o exemplo da V1) e workflow de deploy da V2 **manual** para pasta própria.

**Precisa de aprovação humana**
- Aplicar o bloco nginx no servidor (HML e produção) e criar a pasta web da V2.
- Usar os secrets de deploy existentes no workflow novo da V2.

**Fora do escopo:** qualquer endpoint novo, migration, mudança em `src/` ou `server/`.
