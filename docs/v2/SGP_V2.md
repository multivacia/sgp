# SGP+ V2 — documento vivo

> **Para que serve:** retomar o desenvolvimento da V2 em qualquer sessão/chat.
> **Como usar:** ler isto + `git log` da branch antes de começar; atualizar **Status** e **Decisões** ao fim de cada passo.
> **Branch de trabalho:** `ccr-683413c7-571rnk` (figuras das etapas — recortes do cartaz da Bravo + ícone de reserva — em `feat/v2-imagens-fluxo-revestimento`, §25) · **Atualizado em:** 2026-10-18 (Fases 0 a 10 + 2b implementadas, incluindo fotos no aparelho e fotos do carro, visual com o design system do SGP+; pronta para apresentar à gestora) · **Demonstração:** https://claude.ai/artifact/RFAWgUFLAB541XT4839dhW (e na VPS em `/V2-demo/`, §23)

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
| 2b | Fotos reais das etapas | **sim**: módulo isolado `server/src/modules/v2-etapa-imagens` + migration `0054_v2_etapa_imagens.sql` | médio | ✅ código pronto (§20) · ⏳ aplicar a migration (manual) |
| 3 | Alterar esteira = telas da criação + cadeados; motivo obrigatório (inclui troca de responsável) | não (usa `PATCH /conveyors/:id/structure`; motivo vai como texto livre da V1) | médio | ✅ código pronto (§14) |
| 4 | Planejar semana por esteira (início → dias pela folga de cada responsável) + lotação por dia + "Sugerir semana" | não (usa `/operational-planning/*` da V1; sugestão é cálculo no front) | alto | ✅ código pronto (§15) |
| 5 | Tablet do colaborador (`/V2/tablet`): nome → PIN → próxima tarefa → cronômetro ou lançar horas → quanto ficou pronto | não (usa `/production/*` da V1; cronômetro fica no tablet) | alto | ✅ código pronto (§16) · QR do ticket descontinuado |
| 6 | Acabamento para a demonstração: Pessoas hoje, Outra atividade no tablet, ajustar atividade no planejamento, Liberar esteira, versão de demonstração | não | médio | ✅ código pronto (§17) |
| 7 | Dados básicos da esteira (incluir, alterar, consultar) iguais à V1 | não | baixo | ✅ código pronto (§18) |
| 8 | Corrigir/remover apontamento pela gestora | não (V1 já tem, auditado) | médio | ✅ código pronto (§19) |
| 9 | Colaborador corrige o próprio apontamento no tablet | **sim**: módulo `server/src/modules/v2-producao-correcao` + migration `0055_v2_correcoes_apontamento.sql` | médio | ✅ código pronto (§22) · ⏳ aplicar a migration (manual) |
| 10 | Fotos guardadas no aparelho antes de enviar + fotos do carro na esteira (laboratório) | **sim**: módulo `server/src/modules/v2-esteira-fotos` + migration `0056_v2_esteira_fotos.sql` | médio | ✅ código pronto (§24) · ⏳ aplicar a migration (manual) |

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

Decisões do dono do produto em 2026-10-17:
- ~~QR do ticket~~ — **descontinuado** (não será feito).
- **Fluxo de status da esteira** — dono do produto ainda vai pensar. Até lá: botão "Liberar" manual (§17), nada automático, sem "Finalizar/Cancelar" na V2.
- **Motivo de alteração** — segue a base do SGP+ (V1): texto obrigatório de 3–500 caracteres fora da elaboração (MSG-EST-001), o mesmo motivo vale para dados e estrutura (manual §41.2). Os botões da V2 são só atalhos para escrever o texto. *Confirmar com o dono do produto se "base do SGP+" é isso ou um catálogo a ser criado.*
- **Fotos das etapas** — migration aprovada → feito (§20).
- **Corrigir apontamento** — gestora corrige qualquer um (§19); colaborador corrige/remove o próprio, de hoje, com a atividade aberta (aprovado e feito, §22).

Continuam abertas:
- **Fotos no aparelho (laboratório, §24):** decidir se, depois do teste, as fotos passam a ir direto para o banco ou continuam com o passo "Enviar".
- Quais matrizes existem além de "Gol GTI completo".
- Como o usuário chega na V2 sem tocar na V1: link direto/atalho no celular (padrão) ou link no menu da V1.
- **Token do tablet:** a V2 pede o `PRODUCTION_KIOSK_TOKEN` uma vez por aparelho. Alternativa: secret novo no build.

## 9. Como retomar numa nova sessão

1. Ler `CLAUDE.md`, `AGENTS.md` e este arquivo.
2. `git log --oneline -15` na branch acima; conferir §4 (status) e §8 (pendências).
3. Continuar a próxima fase ⬜/🟨; ao terminar, atualizar §4/§6 e responder no formato da §7.

**Para publicar (ações humanas pendentes, em ordem):**
1. Aplicar as migrations `server/migrations/0054_v2_etapa_imagens.sql`, `0055_v2_correcoes_apontamento.sql` e `0056_v2_esteira_fotos.sql` (o deploy da V1 não roda migrations).
2. Aplicar o bloco `deploy/nginx/sgp-v2.location.example` no servidor (HML primeiro).
3. Levar `deploy-v2.yml` para a branch padrão (merge aprovado) e rodar em `homologacao`.
4. Validar em celular e tablet reais e só então em `producao`.

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
- **Figuras das etapas:** escolhidas pelo nome da etapa. São os recortes do cartaz "Fluxo do Processo de Revestimento Automotivo", feito pela Tati, da Bravo (uso liberado); se um recorte não carrega, entra o ícone Tabler (MIT). Ver §25. Fotos reais por etapa: Fase 2b.
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

## 16. Fase 5 — Tablet do colaborador

- Rota `/V2/tablet` (fora do login da gestora; atalho em **Eu → Abrir modo tablet neste aparelho**).
- Fluxo: **Toque no seu nome** (grade com iniciais; bloqueado/sem PIN aparece apagado) → **PIN** (teclado grande; 1º acesso cria PIN novo, como a V1) → **Sua próxima tarefa** (a recomendada pela V1, depois atrasadas; "Ou escolha outra") → **COMEÇAR** (cronômetro com PAUSAR/motivo e TERMINEI) ou **Já fiz · lançar horas** (tarefa, Hoje/Ontem, tempo com atalhos e ±15) → **Quanto ficou pronto?** (¼, ½, ¾, Terminei) → **Registrado!** ("Começar próxima" ou sai sozinho em 15 s).
- API da V1, sem endpoint novo: `GET /production/collaborators` (header `X-SGP-Kiosk-Token`), `POST /production/auth/login|logout|change-pin`, `GET /production/me/work-queue`, `GET /production/time-entry-justifications`, `POST /production/time-entries`.
- **Cronômetro:** só no tablet (localStorage, por colaborador). Sair não para o tempo; ao voltar, o colaborador cai no cronômetro. Pausas não contam e vão na observação do apontamento ("Pausas: Almoço / intervalo"). Ao terminar vira **um** apontamento normal da V1 (minutos arredondados, mínimo 1).
- **Justificativa (regra da V1):** fora de sequência é pedida antes de começar; tempo acima do previsto é pedida ao registrar. Usa o catálogo de justificativas da V1 (com complemento quando exigido).
- "Terminei a tarefa" só aparece se a V1 deixa concluir (`canCompleteStep`) → `markAsDone`.
- **Teste:** `src/domain/tablet.test.ts` — corpo validado com `productionTimeEntryBodySchema` real; regra de justificativa; cronômetro com pausa; ordem da próxima tarefa.
- **Depois:** "Outra atividade" (feito na Fase 6, §17); colaborador corrige o próprio lançamento (Fase 9, §22); relógio do cronômetro mostra segundos (h:mm:ss) para não parecer parado no primeiro minuto. QR do ticket descontinuado (§8).

## 17. Fase 6 — acabamento para a demonstração

- **Hoje → Pessoas hoje** (só `conveyors.create`): quem tem tarefa hoje e ainda não apontou, quem trabalha hoje e está sem tarefa, quem já apontou. Lê `GET /operational-planning/week` + `GET /operational-planning/week-activity` (até 200 lançamentos da semana, mais recentes primeiro). Só considera o plano **publicado**; semana não publicada mostra aviso. Não aparece em sábado/domingo.
- **Tablet → Fiz outra atividade:** busca (≥ 2 letras) em `GET /production/me/time-entry-candidates?includeUnassigned=true` e lança em `POST /production/time-entries/unassigned-exception`, com a justificativa como exceção e/ou fora de sequência (mesma regra do quiosque da V1).
- **Planejar semana → Ajustar:** no dia aberto, cada etapa tem "Ajustar" para mudar de dia ou passar para outra pessoa (o que já começou/terminou não se move).
- **Liberar esteira** (`conveyors.edit_status`, `PATCH /conveyors/:id/status`): na V1 a esteira nasce *Em elaboração* e só entra no planejamento em *Em planejamento*; o tablet só aponta em *A iniciar/Em andamento*. A V2 mostra o botão no detalhe, na tela "Esteira criada!" e no Planejar semana (esteira na semana ainda não liberada). Passos só pelas transições da V1 (teste importa `canTransitionConveyorStatus`). Nada é liberado automaticamente.
- **Versão de demonstração:** `npm run build:demo` gera `dist-demo/` com a API simulada no navegador (`src/demo/`: matriz da planilha mestra, nomes fictícios, dados em memória). O build normal não inclui nada de `src/demo` (conferido no `dist/`). Publicada como página privada para validação.

## 18. Fase 7 — Dados básicos da esteira

- Mesmos campos da aba "Dados básicos" da V1: **Nome** (obrigatório; em branco usa "veículo · PLACA"), Cliente, Veículo, Placa, Modelo/versão, Responsável (colaborador), Prioridade (Baixa/Média/Alta), Prazo, Observações; Tempo total previsto e Criada em só na consulta. "Início/Fim previsto" da tela da V1 não são gravados pela V1 → ficaram fora.
- **Incluir:** passos "Pra qual carro?" (placa, veículo, modelo, cliente, nome) e "Pra quando?" (prazo, prioridade, responsável, observações) da Nova esteira → `dados` do `POST /conveyors`.
- **Consultar:** "Dados da esteira" no detalhe (abre/fecha).
- **Alterar:** cartão "Dados da esteira" no topo da Alterar esteira → mesmo formulário → "O que muda" mostra antes → depois → `PATCH /conveyors/:id` só com o que mudou + motivo; estrutura no mesmo salvamento com o mesmo motivo. Em elaboração não pede motivo (regra da V1).
- Componente único `src/ui/FormDados.tsx` (criação e alteração iguais). Regras em `src/domain/dadosEsteira.ts`; teste com `postConveyorDadosSchema` e `patchConveyorDadosBodySchema` reais.

## 19. Fase 8 — Corrigir apontamento (gestora)

- No detalhe da esteira, cada atividade começada tem **Horas** (só com `time_entries.edit_any` ou `time_entries.delete_any`, papéis ADMIN/GESTOR na V1): lista os lançamentos (quem, quando, quanto, total) → **Corrigir tempo** (±15/±5, atalhos) ou **Remover**, sempre com motivo.
- API da V1: `GET/PATCH/DELETE /conveyors/:id/steps/:stepId/time-entries[/:id]`. O PATCH leva o `updatedAt` lido: se alguém mudou antes, a V1 recusa ("Atualize a tela"). A V1 grava auditoria (`time_entry_edited_by_manager` / `time_entry_deleted_by_manager`) com motivo, antes e depois.
- Teste com `patchTimeEntryBodySchema` e `deleteTimeEntryBodySchema` reais.

## 20. Fase 2b — Fotos das etapas (com migration)

- **Backend (único ponto em `server/`, aditivo):** migration `server/migrations/0054_v2_etapa_imagens.sql` (tabela nova `v2_etapa_imagens`: 1 foto por etapa TASK da matriz, WebP/JPEG/PNG, até 1 MB, no próprio banco → entra no backup) e módulo isolado `server/src/modules/v2-etapa-imagens` registrado em `server/src/app.ts` (1 linha). Nenhuma tabela/rota da V1 muda.
- Rotas: `GET /api/v1/v2/etapa-imagens` (lista, logado), `GET /api/v1/v2/etapa-imagens/:etapaId` (imagem, logado, cache 1 dia com endereço que muda ao trocar), `PUT` e `DELETE` (só `operation_matrix.manage`). Tipo conferido pelo conteúdo do arquivo; acima de 1 MB → 413.
- **V2:** tela **Fotos das etapas** (Início, para quem cuida da matriz): escolhe a etapa → **Tirar foto** (abre a câmera traseira) ou **Galeria** → a foto é reduzida no aparelho (até 1000 px, WebP) e **guardada só neste aparelho** (selo "Neste aparelho") → **Enviar para o banco** (uma ou "Enviar todas") ou **Descartar**; "Voltar à ilustração" remove a do banco. No cardápio vale: foto deste aparelho → foto do banco → ilustração (na esteira, achada pelo nome da etapa). Ver §24.
- ⚠️ **Deploy:** o deploy da V1 não roda migrations (guardrail). Aplicar `0054` manualmente em HML/produção com aprovação humana. Antes disso a V2 funciona normalmente com as ilustrações.
- Testes: servidor `src/tests/v2-etapa-imagens.test.ts` (regras + HTTP contra Postgres: grava, lê, 403 colaborador, 422 etapa errada/arquivo falso, 413, 401, remove); V2 `src/domain/fotosEtapas.test.ts`.

## 21. Visual — design system do SGP+

- Fonte do design system: V1 `src/styles/semantic-tokens.css` + `src/styles/theme.css` + `src/index.css` (tema claro **light-executive** e identidade ARGOS). Lidos, não alterados.
- V2 (`apps/sgp-v2/src/styles.css`): superfícies claras (`#f3f6fa`/branco, borda `#d8e0ea`, sombra de cartão do SGP+), texto `#0f172a`/`#566579`, faixa da marca com o gradiente do cabeçalho do SGP+ (azul-marinho → azul), **CTA âmbar com texto escuro** (`#d97706`, como no light-executive), azul `#2f6d9b` para foco e **seleção**, dourado `#c9a227` da marca no selo "V2". Fontes **Montserrat** (títulos) e **Open Sans** (texto), as mesmas da V1.
- Logo Bravo (cópia de `src/assets/bravo-logo.png` em `apps/sgp-v2/public/brand/`) no selo branco, como na barra lateral da V1: cabeçalho do app, login e tablet.
- Componentes: `.brand-band`, `.card`, `.field` (foco azul), `.btn-primary` (CTA), `.btn-secondary`, `.eyebrow`; `ui/Marca.tsx`. Cabeçalho dos passos (Nova/Alterar) em azul-marinho com progresso âmbar; barra inferior com o CTA; menu inferior com indicador âmbar na aba ativa; Início com saudação, ação principal em destaque e atalhos com ícone.
- Mantido do §3: letra base 18 px, alvos ≥ 48 px, verde para concluir/confirmar no tablet, cores de estado (ok, atraso, parada).

## 22. Fase 9 — Colaborador corrige o próprio apontamento (tablet)

- **Regra (aprovada):** o colaborador corrige o tempo ou remove **só o próprio lançamento**, **lançado hoje** (dia da fábrica, horário de São Paulo), **com a atividade ainda não concluída nem dispensada**, sempre com motivo. Fora disso, só a gestora (§19).
- **Backend V2 (aditivo):** `server/src/modules/v2-producao-correcao` (sessão do Modo Produção da V1: PIN; reaproveita `updateConveyorTimeEntryMinutes` e `softDeleteConveyorTimeEntry` da V1 sem alterá-los) + migration `0055_v2_correcoes_apontamento.sql` (registro de cada correção/remoção: quem, antes, depois, motivo). Motivo da tabela própria: a auditoria da V1 exige usuário do sistema e o tablet entra só com PIN.
- Rotas: `GET /api/v1/v2/producao/meus-lancamentos` (o meu de hoje, com `podeCorrigir`/`bloqueio`), `PATCH …/:id` (`minutes`, `reason`, `expectedUpdatedAt` — recusa 409 se mudou), `DELETE …/:id` (`reason`). Regras conferidas no servidor (403 lançamento de outro, 422 fora da regra/sem motivo).
- **Tablet:** "Meus lançamentos de hoje" (na lista de tarefas e quando não há tarefa) e "Tempo errado? Corrigir" na tela Registrado (como no protótipo). Corrigir: ±15 min + motivo (atalhos ou texto). Remover: motivo.
- Testes: servidor `src/tests/v2-producao-correcao.test.ts` (regras, incluindo virada de dia em São Paulo, + HTTP contra Postgres: lista, 422, 409, 403, 401, corrige, remove e registra antes/depois).
- ⚠️ Aplicar `0055` manualmente (como a `0054`). Sem ela, o tablet mostra erro só nessa tela; o resto funciona.
- **Planejar semana:** "Sugerir semana" aparece com 1 ou mais esteiras esperando (antes só com 2+).

## 23. Demonstração na VPS (`/V2-demo/`)

- Guia completo (roteiro da apresentação, rodar local, publicar, cuidados): [`README_DEMO.md`](../../README_DEMO.md) na raiz.
- Pacote: `cd apps/sgp-v2 && npm ci && npm run build:demo` → `apps/sgp-v2/dist-demo/` (arquivos com caminho relativo, endereços com `#`; abre em qualquer pasta).
- **Não usa o backend:** toda chamada `/api/v1` é respondida no próprio navegador (`src/demo/api.ts`), com a matriz da planilha mestra e nomes fictícios. Cada visitante tem os próprios dados; recarregar recomeça. Nada vai para o banco.
- Publicar: pasta própria `/var/www/sgp-v2-demo/` (nunca a da V1 nem `/var/www/sgp-v2`) + bloco `deploy/nginx/sgp-v2-demo.location.example` dentro do `server` existente (`nginx -t` antes do reload). Testado em nginx local: V1 intacta, `/V2-demo` → 301, `/V2-demo/` 200, assets 200, inexistente 404, `X-Robots-Tag: noindex`.
- Dentro da página do Claude a câmera é bloqueada pelo visualizador (só "Galeria"); na VPS, no navegador do celular, "Tirar foto" abre a câmera.
- A demo mostra a faixa "DEMONSTRAÇÃO · dados de exemplo". Não instalar como app no celular (o atalho instalado aponta para a V2 real, `/V2/`).

## 24. Fase 10 — Fotos no aparelho antes de enviar + fotos do carro (laboratório)

- **Pedido:** "tirar foto não está habilitado"; guardar a foto localmente e subir para o banco depois da confirmação; e foto do veículo na esteira.
- **Câmera:** componente `src/ui/EscolherFoto.tsx` com dois botões: **Tirar foto** (`capture="environment"`, câmera traseira) e **Galeria**. A foto é reduzida no aparelho (`ui/redimensionar.ts`). Dentro da página do Claude a câmera é bloqueada pelo visualizador.
- **Guardar no aparelho:** `src/ui/fotosLocais.ts` (IndexedDB `sgp-v2-fotos`; sem IndexedDB fica só na memória da tela). Uma pendente por etapa (`etapa:<id>`, a nova substitui) e várias por esteira (`esteira:<id>:<n>`). A foto pendente aparece só naquele aparelho, com o selo **"Neste aparelho"**, e sobrevive a recarregar a página.
- **Enviar:** botão explícito ("Enviar para o banco", "Enviar todas", "Enviar as N fotos"); ao enviar, a cópia local é apagada. **Descartar** apaga só a local.
- **Fotos do carro:** até 10 por esteira. Na **Nova esteira**, passo "Pra qual carro?" (opcional); ao criar, ficam no aparelho ligadas à esteira e a tela "Esteira criada!" já mostra **Enviar**. No **detalhe da esteira**, bloco **Fotos do carro**: ver (toque amplia), incluir, enviar e remover (`conveyors.create`; remover pede confirmação).
- **Backend (aditivo):** migration `0056_v2_esteira_fotos.sql` (tabela nova `v2_esteira_fotos`, WebP/JPEG/PNG até 1 MB, cascata ao apagar a esteira) + módulo `server/src/modules/v2-esteira-fotos` (GET lista e imagem: logado; POST/DELETE: `conveyors.create`; limite 10; tipo pelo conteúdo). Reaproveita a validação e o leitor de corpo do módulo `v2-etapa-imagens`.
- **Fotos de exemplo (só demonstração):** botão "Escolher entre as fotos de exemplo (N)" ao lado de Tirar foto/Galeria, alimentado pelos arquivos de `apps/sgp-v2/src/demo/fotos-exemplo/` (nome do arquivo = nome mostrado). Sem arquivos, o botão não aparece; o app real nunca mostra. **Pasta ainda vazia:** o site da Bravo (`bravotapecaria.com.br`, também usado no link do logo da V1) não resolve na internet e a rede deste ambiente bloqueia baixar imagens de sites externos — aguardando fotos da Bravo (enviadas no chat ou com o acesso liberado).
- **Ressalvas do laboratório:** foto pendente fica só naquele navegador/aparelho; some se limparem os dados do navegador; Safari/iPhone pode apagar dados de site sem uso por ~7 dias. O banco continua sendo a fonte oficial.
- **Testes:** servidor `src/tests/v2-esteira-fotos.test.ts` (inclui, lista, lê, 403 colaborador, 422 arquivo falso, 404 esteira, limite 10, remove); V2 `src/ui/fotosLocais.test.ts` (guardar por etapa/esteira, substituir, remover).

## 25. Figuras das 20 etapas: recortes do cartaz + ícone de reserva (2026-10-18, branch `feat/v2-imagens-fluxo-revestimento`)

- **Figura principal:** recortes `apps/sgp-v2/public/etapas/01.webp` a `20.webp`, tirados da única imagem do documento *Fluxo do Processo de Operação.docx* (cartaz "Fluxo do Processo de Revestimento Automotivo"). O cartaz foi feito pela **Tati, da Bravo**; o usuário confirmou em 2026-10-18 que **não há restrição de uso**.
- **Reserva:** 20 ícones Tabler (licença MIT, `LICENSE-TABLER.txt` junto) da branch `assets/fluxo-revestimento-automotivo-2026-10-18` (commit `30dc5cb8`). Foram copiados sem alteração (mesmo SHA-256) para `apps/sgp-v2/public/etapas/revestimento-automotivo/`, com `manifesto.json` e `README.md`. Se um recorte não carregar, `src/ui/figura.ts` (`trocarPelaReserva`, no `onError`) troca pelo ícone da mesma etapa, inteiro e com respiro. Nada foi posto no `public/` da V1.
- **Uso (só visual):** `figuraDaEtapa` (`src/domain/novaEsteira.ts`) acha a figura pelo **nome da etapa** e devolve `recorte(n)`; `reservaDaFigura` devolve `ilustracao(n)`. Títulos, sequência e IDs da matriz não mudam, e a figura não vira regra. Vale no cardápio da Nova esteira, em Personalizar, Alterar esteira, Fotos das etapas e no cartão da matriz. Ordem: foto do aparelho → foto do banco → recorte → ícone.
- **Acessibilidade:** ao lado do nome da etapa a imagem é decorativa (`alt=""`). Na folha de Fotos das etapas o texto alternativo é "Ilustração da Etapa X" (ou "Foto da Etapa X", quando há foto).
- **Testes:** `src/domain/novaEsteira.test.ts`. Verifica que manifesto e código batem; que os 20 recortes, os 20 ícones e a licença existem; que os 20 títulos da planilha mestra caem cada um no seu recorte, com o ícone certo de reserva; que nome desconhecido fica sem figura; e que fotos não têm reserva.
