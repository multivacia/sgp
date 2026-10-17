# SGP+ V2 — documento vivo

> **Para que serve:** retomar o desenvolvimento da V2 em qualquer sessão/chat.
> **Como usar:** ler isto + `git log` da branch antes de começar; atualizar **Status** e **Decisões** ao fim de cada passo.
> **Branch de trabalho:** `ccr-683413c7-571rnk` · **Atualizado em:** 2026-10-17 (Fases 0, 1 e 2 implementadas)

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
| 0 | Fundação: app vazio em `/V2`, PWA, login compartilhado, tokens de UI, build/deploy separados, guarda de CI "V2 não altera `src/`" | não | baixo | ✅ código pronto · ⏳ falta aplicar nginx + 1º deploy (manual) |
| 1 | Hoje + Esteiras (só leitura): exceções do dia; ver esteira (etapas → setores → atividades → responsável) | não (usa `/api/v1/conveyors` e `/conveyors/:id`) | baixo | ✅ código pronto (§12) |
| 2 | Nova esteira (cardápio): matriz → etapas com figura → personalizar (setor/atividade/responsável) → carro → prazo | não (usa `/api/v1`); fotos reais das etapas ficam para 2b | médio | ✅ código pronto (§13) |
| 3 | Alterar esteira = telas da criação + cadeados; motivo obrigatório (inclui troca de responsável) | não (usa `PATCH /conveyors/:id/structure`; motivo vai como texto livre da V1) | médio | ✅ código pronto (§14) |
| 4 | Planejar semana por esteira (início → dias pela folga de cada responsável) + lotação por dia + "Sugerir semana" | não (usa `/operational-planning/*` da V1; sugestão é cálculo no front) | alto | ✅ código pronto (§15) |
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

## 11. Fase 0 — o que foi entregue e como usar

- App: `apps/sgp-v2/` (login com a mesma conta da V1 → casca com menu inferior; telas das próximas fases vazias; `/V2/tablet` reservado). Sessão via `/api/v1/auth/{me,login,logout}`.
- Rodar local: `cd apps/sgp-v2 && npm ci && npm run dev` (abre em `http://localhost:5174/V2/`; `/api` vai para o backend em `127.0.0.1:4000`, mude com `VITE_DEV_API_TARGET`).
- Testes: `npm test` (3 testes críticos de sessão). Build: `npm run build`.
- CI: `.github/workflows/verify-v2.yml` (só quando `apps/sgp-v2/**` muda): build + testes + **guarda que reprova PR que altere `src/`**.
- Deploy: `.github/workflows/deploy-v2.yml` — **só manual** (Actions → "Deploy SGP+ V2" → homologação/produção). Publica em `/var/www/sgp-v2[-hml]/V2`; aborta se o destino for a pasta da V1.
- Nginx: `deploy/nginx/sgp-v2.location.example` — blocos para colar no `server` da V1; passo a passo e como desfazer no próprio arquivo. Testado em nginx 1.24 local: V1 (`/`, rotas internas, `/api`) idêntica; `/V2/` ok; `/v2` e `/V2` redirecionam; asset inexistente dá 404.
- Dependências: o `package-lock.json` da V2 foi semeado do lock da V1 (mesmas versões testadas). Motivo: o npm 10.9 falha ao resolver `vitest` do zero ("edgesOut").

**Passos manuais pendentes (com aprovação):** (1) criar `/var/www/sgp-v2-hml` no servidor de HML, colar o bloco nginx, `nginx -t`, reload; (2) rodar "Deploy SGP+ V2" → homologação; (3) repetir em produção.

## 12. Fase 1 — o que foi entregue

- **Esteiras** (`/V2/esteiras`): lista "Em produção" (A iniciar + Em andamento) ou "Todas ativas"; cada cartão mostra prazo, situação (Parada / Atrasada / status) e % feito.
- **Ver esteira** (`/V2/esteiras/:id`): etapas → setores → atividades com situação, minutos, responsável (ou "feito por"); abre e rola até a etapa onde o trabalho está.
- **Hoje** (`/V2/hoje`): contadores + "Precisa de você" (atividade parada primeiro, depois esteira atrasada) + "Andando bem".
- Regras em `apps/sgp-v2/src/domain/conveyors.ts`: % pelo previsto (minutos × quantidade, sem atividades interrompidas); atraso = mesma regra da V1 (`server/src/shared/operationalBucket.ts`).
- Backend: **nenhum endpoint novo**. Leitura: `GET /api/v1/conveyors` + `GET /api/v1/conveyors/:id` (só exigem login).
- **Limites conhecidos:** sem figuras das etapas (Fase 2); "sem apontamento hoje" e "colaborador sem tarefa" ainda não aparecem (precisariam de dados de apontamento/fila — avaliar na Fase 5); ações (realocar, avisar) ficam para fases com escrita.
- ⚠️ **Desempenho:** o % de cada esteira exige 1 pedido de detalhe por esteira (até 4 em paralelo, cache de 60 s). Se a fábrica tiver muitas esteiras em produção e ficar lento, criar o equivalente V2 agregado (`/api/v2/...`) chamando os services da V1.

## 13. Fase 2 — Nova esteira (cardápio)

- Rota `/V2/nova` (tela cheia): **Qual matriz?** → **Confira as etapas** (grade com figura, Incluída/Fora, Personalizar) → **Personalizar etapa** (setores, atividades, responsável por atividade ou setor inteiro) → **Pra qual carro?** (placa, veículo, cliente) → **Pra quando?** (Hoje/Amanhã/Até sexta/data + responsável da esteira) → **Esteira criada!** ("Ver esteira" / "Criar outra igual").
- Botão "Nova esteira" no Início só aparece para quem tem `conveyors.create` **e** `operation_matrix.view` (mesmas permissões que a V1 exige).
- API da V1, sem endpoint novo: `GET /operation-matrix/items?is_active=true`, `GET /operation-matrix/items/:id/tree`, `GET /collaborators?status=ACTIVE`, `POST /conveyors` (`originType: BASE`, `matrixRootItemId`, `sourceOrigin: base`, `sourceKey` da matriz, responsável = COLLABORATOR principal + equipe padrão como apoio — mesma tradução da V1).
- **Teste de contrato:** `src/domain/novaEsteira.test.ts` valida o corpo gerado com o **validador real da V1** (`server/src/modules/conveyors/conveyors.schemas.ts`). Se a V1 mudar o contrato, o CI da V2 quebra.
- **Ainda na V1 (não feito na V2):** montar esteira sem matriz; juntar complementos de outras matrizes (HYBRID); busca de carro pela placa (não há endpoint); prioridade (fica "média").
- ⚠️ **Figuras das etapas são provisórias:** ilustrações do cartaz (geradas por IA), escolhidas pelo nome da etapa. Fotos reais por etapa exigem guardar imagem no backend → **Fase 2b** (equivalente V2 + migration aditiva), quando decidido.
- "Do setor" no seletor de responsável usa o setor do cadastro do colaborador (`sector_name`) igual ao nome do setor da matriz.

## 14. Fase 3 — Alterar esteira

- Rota `/V2/esteiras/:id/alterar` (tela cheia), aberta pelo botão **Alterar esteira** no detalhe (só com `conveyors.create` e esteira não finalizada/cancelada).
- Mesmas peças visuais da criação (`src/ui/wizard.tsx`): **Confira as etapas** (etapas da esteira + etapas da matriz que ainda não estão) → **Personalizar etapa** → **Por que está alterando?** (resumo "O que muda" + motivo obrigatório).
- **Cadeado:** atividade feita ou em andamento não sai e não troca responsável (`isLocked`). "Tirar setor/etapa" só tira o que está livre.
- API da V1, sem endpoint novo: `PATCH /conveyors/:id/structure` com a árvore desejada (nó com id = mantém; sem id = novo; ausente = sai). Como a V1 **substitui** os responsáveis de cada atividade, a V2 reenvia os atuais e troca só o principal (equipe de apoio fica).
- **Motivo:** 6 botões + detalhe opcional, enviados como texto "Motivo: detalhe" (campo `reason` da V1, 3–500 caracteres). "Outro motivo" exige o texto. Catálogo de motivos no backend fica para quando a lista real for decidida (§8).
- `sourceOrigin` = `manual` se a esteira foi criada manual, senão `base`. Ressalva (igual à V1): atividades existentes perdem o `sourceKey` ao alterar.
- **Teste de contrato:** `src/domain/alterarEsteira.test.ts` valida o corpo com `patchConveyorStructureBodySchema` real da V1 + cadeados + troca de responsável + etapa incluída/tirada + motivo.

## 15. Fase 4 — Planejar semana

- Aba **Semana** (`/V2/semana`), só com `conveyors.create` (mesma permissão do planejamento da V1).
- Lê da V1: `GET /operational-planning/week?weekStart=` (plano + capacidade por pessoa/dia), `GET /operational-planning/backlog?conveyorId=` para cada esteira em planejamento/a iniciar/em andamento, `GET /operational-planning/factory-intake` (itens do plano da esteira aguardando encaixe).
- **Limite de 100 do backlog da V1:** esteira com 100 ou mais atividades esperando é buscada de novo por responsável (`collaboratorId`) e remontada na ordem da esteira (testado com 138).
- **Esperando** (por esteira) → **Escolher início**: cada dia mostra "Termina Qua · dentro do prazo" / "depois do prazo" / "Não cabe: sobram ~X h". As atividades vão, na ordem da esteira, para o primeiro dia (≥ o da anterior) em que o responsável tem folga; atividade maior que um dia ocupa um dia vazio. Capacidade = a da V1 por colaborador/dia (8 h se a V1 não informar).
- **Sugerir semana:** pela ordem do prazo, cada esteira começa no primeiro dia em que termina no prazo.
- **Na semana:** esteiras já no plano + as escolhidas; **Tirar da semana** mantém o que já começou/terminou (a V1 também preserva concluídas) e o resto volta a esperar.
- **Lotação:** barra por dia (planejado ÷ capacidade), toque abre o que entra no dia (por esteira + etapa).
- Grava como a V1: `POST /operational-planning/week` com a semana inteira (ordem por pessoa/dia: existentes primeiro, novos depois) e `POST /week/:planId/publish`. "Guardar" grava rascunho sem publicar.
- Não faz (fica na V1): mover atividade a atividade entre pessoas/dias, aplicar valores do plano da esteira, exportar Excel. Atividade sem responsável não entra (definir em Alterar esteira).
- **Teste:** `src/domain/planejarSemana.test.ts` — corpo validado com `saveOperationalWeekPlanBodySchema` real; encaixe pela folga; sobra/sem responsável; sugerir; tirar mantendo o que começou.
