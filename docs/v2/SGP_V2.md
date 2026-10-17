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
| 2b | Fotos reais das etapas | **sim**: módulo isolado `server/src/modules/v2-etapa-imagens` + migration `0054_v2_etapa_imagens.sql` | médio | ✅ código pronto (§20) · ⏳ aplicar a migration (manual) |
| 3 | Alterar esteira = telas da criação + cadeados; motivo obrigatório (inclui troca de responsável) | não (usa `PATCH /conveyors/:id/structure`; motivo vai como texto livre da V1) | médio | ✅ código pronto (§14) |
| 4 | Planejar semana por esteira (início → dias pela folga de cada responsável) + lotação por dia + "Sugerir semana" | não (usa `/operational-planning/*` da V1; sugestão é cálculo no front) | alto | ✅ código pronto (§15) |
| 5 | Tablet do colaborador (`/V2/tablet`): nome → PIN → próxima tarefa → cronômetro ou lançar horas → quanto ficou pronto | não (usa `/production/*` da V1; cronômetro fica no tablet) | alto | ✅ código pronto (§16) · QR do ticket pendente |
| 6 | Acabamento para a demonstração: Pessoas hoje, Outra atividade no tablet, ajustar atividade no planejamento, Liberar esteira, versão de demonstração | não | médio | ✅ código pronto (§17) |
| 7 | Dados básicos da esteira (incluir, alterar, consultar) iguais à V1 | não | baixo | ✅ código pronto (§18) |
| 8 | Corrigir/remover apontamento pela gestora | não (V1 já tem, auditado) | médio | ✅ código pronto (§19) |

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
- **Corrigir apontamento** — só a gestora (feito, §19). Em reflexão: deixar o colaborador ajustar o próprio lançamento enquanto a atividade não estiver concluída (precisa de endpoint novo no Modo Produção — proposta no retorno §34).

Continuam abertas:
- Quais matrizes existem além de "Gol GTI completo".
- Como o usuário chega na V2 sem tocar na V1: link direto/atalho no celular (padrão) ou link no menu da V1.
- **Token do tablet:** a V2 pede o `PRODUCTION_KIOSK_TOKEN` uma vez por aparelho. Alternativa: secret novo no build.

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

## 16. Fase 5 — Tablet do colaborador

- Rota `/V2/tablet` (fora do login da gestora; atalho em **Eu → Abrir modo tablet neste aparelho**).
- Fluxo: **Toque no seu nome** (grade com iniciais; bloqueado/sem PIN aparece apagado) → **PIN** (teclado grande; 1º acesso cria PIN novo, como a V1) → **Sua próxima tarefa** (a recomendada pela V1, depois atrasadas; "Ou escolha outra") → **COMEÇAR** (cronômetro com PAUSAR/motivo e TERMINEI) ou **Já fiz · lançar horas** (tarefa, Hoje/Ontem, tempo com atalhos e ±15) → **Quanto ficou pronto?** (¼, ½, ¾, Terminei) → **Registrado!** ("Começar próxima" ou sai sozinho em 15 s).
- API da V1, sem endpoint novo: `GET /production/collaborators` (header `X-SGP-Kiosk-Token`), `POST /production/auth/login|logout|change-pin`, `GET /production/me/work-queue`, `GET /production/time-entry-justifications`, `POST /production/time-entries`.
- **Cronômetro:** só no tablet (localStorage, por colaborador). Sair não para o tempo; ao voltar, o colaborador cai no cronômetro. Pausas não contam e vão na observação do apontamento ("Pausas: Almoço / intervalo"). Ao terminar vira **um** apontamento normal da V1 (minutos arredondados, mínimo 1).
- **Justificativa (regra da V1):** fora de sequência é pedida antes de começar; tempo acima do previsto é pedida ao registrar. Usa o catálogo de justificativas da V1 (com complemento quando exigido).
- "Terminei a tarefa" só aparece se a V1 deixa concluir (`canCompleteStep`) → `markAsDone`.
- **Teste:** `src/domain/tablet.test.ts` — corpo validado com `productionTimeEntryBodySchema` real; regra de justificativa; cronômetro com pausa; ordem da próxima tarefa.
- **Fora (pendências §8):** QR do ticket; corrigir apontamento; "Outra atividade" (apontar em atividade não planejada — `unassigned-exception` da V1).

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
- **V2:** tela **Fotos das etapas** (Início, para quem cuida da matriz): escolhe a etapa → tira/escolhe a foto → a foto é reduzida no próprio celular (até 1000 px, WebP) → Salvar; "Voltar à ilustração" remove. A foto aparece no cardápio da Nova esteira e na Alterar esteira (na esteira, achada pelo nome da etapa). Sem foto ou sem a tabela, fica a ilustração.
- ⚠️ **Deploy:** o deploy da V1 não roda migrations (guardrail). Aplicar `0054` manualmente em HML/produção com aprovação humana. Antes disso a V2 funciona normalmente com as ilustrações.
- Testes: servidor `src/tests/v2-etapa-imagens.test.ts` (regras + HTTP contra Postgres: grava, lê, 403 colaborador, 422 etapa errada/arquivo falso, 413, 401, remove); V2 `src/domain/fotosEtapas.test.ts`.
