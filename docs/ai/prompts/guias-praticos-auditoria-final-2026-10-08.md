# SGP+ — Auditoria e correção final dos Guias Práticos (Colaborador e Gestor)

**TASK_ID:** `guias-praticos-auditoria-final-2026-10-08`  
**Repositório:** `multivacia/sgp`  
**Branch de origem OBRIGATÓRIA:** `origin/integration/ajustes-tati-2026-10-07`  
**SHA de referência verificado em 07/10 à noite:** `f15483d66e8a81335d91ecbd5dca9d7f8cdd11fd` — **validar o SHA remoto atual antes de iniciar; não presumir que permaneça igual**.  
**Branch de trabalho:** `docs/guias-praticos-auditoria-final-2026-10-08`  
**Modelo recomendado:** Claude Opus, versão mais recente disponível no Claude Code; esforço de raciocínio alto.

## Missão e prazo

Precisamos apresentar amanhã à Tati (Bravo Tapeçaria) os Guias Práticos do SGP+ **confiáveis para uso na operação**, evitando imprimir o manual integral de aproximadamente 260 páginas.

**Não confunda "guia 100%" com "sistema sem bugs":** 100% significa que **todas as jornadas operacionais críticas previstas nos guias estejam descritas de modo completo, verificável, atualizado e sem afirmações falsas**, inclusive limitações reais claramente identificadas. Se uma jornada não puder ser comprovada, **não declare 100%**; explicite a pendência e o impacto na entrega.

Este trabalho é de **DOCUMENTAÇÃO E VALIDAÇÃO**, não de implementação de funcionalidades. Não corrigir o sistema para fazê-lo coincidir com o guia.

## Regras de governança e segurança

1. Leia primeiro `CLAUDE.md`, `AGENTS.md`, `docs/ai/context/PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md` na branch base. Confirme as instruções atuais, o Git e o estado real do remoto; use `git fetch origin --prune` ou equivalente. Salve o conteúdo integral deste prompt em `docs/ai/prompts/guias-praticos-auditoria-final-2026-10-08.md` na branch documental, sem sobrescrever outros prompts.
2. Confirme se a branch de integração contém as correções funcionais da Tati e a reconstrução dos guias. **Não usar `origin/develop` como base**, pois ainda não reúne o conjunto. Não se basear no texto de relatórios sem conferir código e execução.
3. Crie/use branch isolada a partir do tip atual da integração. **Não alterar** `develop`, `main`, `homol`, `fix/ajustes-tati-2026-10-07`, `docs/ajustes-tati-2026-10-07-guias-praticos` ou a própria branch de integração.
4. Escopo permitido: `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`, imagens correspondentes sob `docs/manual/img/guia-colaborador/` e `docs/manual/img/guia-gestor/`, prompt/retorno/checkpoint em `docs/ai/` quando necessário. **Não editar** `src/`, `server/`, migrations, testes, `package.json`, versões, manual integral ou gerador do manual.
5. Nenhuma conexão/escrita em banco de produção/homologação; sem dados pessoais/reais nas capturas. Se precisar, use backend/banco locais isolados e dados fictícios ou mocks fiéis ao código, identificando o método. Nada de migrations em banco compartilhado.
6. **Não fazer merge, deploy, PR automático, force-push ou promoção para branches principais.** Autoriza-se commit e push **normais exclusivamente da branch de documentação**, se o ambiente permitir; sem force e somente após validar. Se bloqueado, informe e mantenha a entrega segura localmente.
7. Não maquiar falhas, não inventar testes, aprovação da Tati, permissões ou funcionalidades.

## Fontes da verdade e material de partida

- `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` — dois guias canônicos escritos à mão.
- `docs/manual/source/MANUAL_USUARIO_SGP.md` — manual do usuário para confrontar cobertura, **não editar nesta tarefa**.
- `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` — referência de rastreabilidade, mas o **código atual prevalece**.
- `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md` e `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md` — evidências anteriores e pendências, **não substituem revalidação**.
- Interface e testes atuais, principalmente páginas da Minha Fila, Minha Jornada, Apontar Horas, Planejamento, Dashboard, Jornada por Colaborador, Apontamento Gerencial, Evolução/PDF, Totem e Produção.
- Capturas existentes: 21 do colaborador e 19 do gestor; elas foram geradas **antes dos ajustes funcionais integrados**, portanto parte pode estar desatualizada.

## Etapa 1 — Inventário e matriz de verdade (antes de editar)

Criar no retorno uma tabela por jornada/funcionalidade com: **público, seção do guia, caminho da tela, ação, resultado correto, evidência no código, evidência no navegador, captura correspondente, status [CONFIRMADO / CORRIGIR / PENDENTE], impacto**.

Cobertura mínima do **Colaborador**:
- Login, primeiro acesso, senha e menus reais por perfil.
- Minha Fila por dia **e Por período** (inclusive múltiplas semanas, início/fim invertidos e alternância de modo).
- Apontar Horas: seleção da esteira e atividade, inclusive pesquisa `esteira & atividade`, consulta sem `&`, acentos, identificador de OS, lista de atividades fora da alocação, campos e validações.
- Justificativas: quando exigidas, catálogo e fora de sequência; feedback e erros.
- Conclusão de atividade e diferenciação entre apontar horas e concluir.
- Extra Esteira: criação e **visualização na Minha Jornada** (inclusive descrição já removida do catálogo, se aplicável).
- Minha Jornada: períodos, seção de Extra Esteira, justificativas, observações, situações e acesso a detalhes.
- Totem/Modo Fábrica: PIN, primeira utilização, apontamento, conclusão, tempo acima do previsto, Extra Esteira e Outra Atividade.
- SGP+ Produção no navegador: regras próprias e limitações reais (não equiparar ao totem).
- Dúvidas/erros comuns e caminho de correção gerencial.

Cobertura mínima do **Gestor**:
- Menu/permissões e Painel Operacional.
- Criar/alterar esteira, estrutura, equipe/alocação, status, cancelamento/finalização e retrocessos.
- Conclusão, reabertura, dispensa de atividades e tratamento de histórico.
- Planejamento semanal, publicação, Agenda da Semana e **Pesquisa por período** entre semanas com "Ver semana".
- **Exportação para IA**: export por semana e por período, abas `Prompt para IA`, `Backlog`, `Planejado`, `Carga dos colaboradores` e `Carga por dia`; descrever a limitação dos itens apenas de equipe (presentes em Planejado, não somam carga individual), sempre fiel ao código.
- Evolução de Esteiras: gerar PDF em **Retrato e Paisagem**, paginação e diferença entre gerar PDF e ticket da atividade.
- Dashboard: atualização automática dos cards após apontamento (conforme implementação, sem afirmar polling contínuo).
- Jornada por Colaborador: Extra Esteira, justificativas, observações e filtros.
- Apontamento Gerencial: editar/remover, permissões e os campos de fato editáveis; não inventar lançamento em nome do colaborador.
- Configuração PIN, equipes, saúde operacional, configurações e erros comuns.

## Etapa 2 — Resolver todas as ressalvas dos guias, SEM apagar evidência

Tratar **um a um** os 20 IDs existentes, registrando decisão e prova em matriz de rastreabilidade. Atualizar o conteúdo dos capítulos de ressalvas e todas as referências cruzadas. Não apagar automaticamente um ID simplesmente porque a integração contém uma correção; confirmar na UI ou nos testes.

**Colaborador:**
- `GUIA-COL-001` — menu real / "Minhas Atividades" ausente.
- `GUIA-COL-002` — Previsto/Realizado/Pendente com múltiplas unidades: verificar o que realmente representa cada número.
- `GUIA-COL-003` — papel Principal/Apoio na gaveta aberta pela fila.
- `GUIA-COL-004` — agrupamento da Minha Jornada pela situação da esteira e botões sobre atividade concluída.
- `GUIA-COL-005` — **DESATUALIZADO NA DOCUMENTAÇÃO:** a integração passou a mostrar Extra Esteira na Minha Jornada; validar e corrigir texto, referências e captura.
- `GUIA-COL-006` — **DESATUALIZADO NA DOCUMENTAÇÃO:** justificativa e observação passaram a ser exibidas; validar e corrigir texto/captura.
- `GUIA-COL-007` — tela de Apontamento aberta pela Jornada: confirmar campos e ações, não prometer recursos inexistentes.
- `GUIA-COL-008` — diferenças Totem vs. navegador da fábrica, sobretudo PIN e ações disponíveis.
- `GUIA-COL-009` — Busca rápida / Alertas: confirmar se são funcionais ou decorativos.
- `GUIA-COL-010` — correção/remoção pelo colaborador e fluxo de solicitação ao gestor.

**Gestor:**
- `GUIA-GES-001` — permissão `time_entries.create_on_behalf`: verificar migrations, RBAC e uso real; **não criar migration nesta tarefa**. Se depender de decisão, registrar bloqueio.
- `GUIA-GES-002` — alocação na criação/alteração, não no detalhe.
- `GUIA-GES-003` — previsto por unidade vs. previsto total e consistência.
- `GUIA-GES-004` — **DESATUALIZADO NA DOCUMENTAÇÃO:** justificativas/observações agora exibidas; validar e corrigir texto/captura.
- `GUIA-GES-005` — **DESATUALIZADO NA DOCUMENTAÇÃO:** Dashboard com atualização após apontamento; validar e corrigir texto/captura sem prometer atualização para outros eventos não testados.
- `GUIA-GES-006` — cancelar/finalizar sem confirmação/motivo: descrever risco real; **não alterar fluxo**.
- `GUIA-GES-007` — Plano Operacional da Esteira não auditado anteriormente: decidir por evidência se é jornada relevante para o guia, documentar ou assinalar não validado.
- `GUIA-GES-008` — PIN provisório, redefinição e inexistência das outras ações.
- `GUIA-GES-009` — menu/nomes reais e distinção entre PDF e ticket.
- `GUIA-GES-010` — formato de semana exibida/seleção real, inclusive nova pesquisa por período.

**Regra:** registrar cada ID como **corrigido no guia, limitação real documentada ou bloqueado aguardando decisão**. Não manter mensagens do tipo "não aparece" para funcionalidades demonstradas na integração. Se o comportamento integrado divergir do relatório antigo, o código e a execução atual prevalecem.

## Etapa 3 — Reescrever e atualizar capturas relevantes

- Priorizar jornadas que Tati e colaboradores precisam executar amanhã, com linguagem **pt-BR, objetiva, passo a passo: onde acessar → ação → resultado esperado → bloqueios/solução**. Evitar jargões técnicos e promessas de funções futuras.
- Incluir/atualizar imediatamente imagens de Minha Jornada (Extra Esteira e justificativas), Jornada gerencial, Dashboard, pesquisa por período, busca `&`, exportação para IA e PDF Retrato/Paisagem; rever quaisquer imagens que contrariem as instruções.
- Usar Playwright/Chromium e frontend/backend reais quando possível, com dados **100% fictícios**; se usar mock, comprovar que reproduz a API atual. Separar **validação funcional real** de **captura ilustrativa simulada** no retorno.
- Validar legibilidade em desktop (1280px) e celular (390px); não deixar imagens quebradas, informação privada, scroll horizontal ou títulos cortados.
- Preservar links/índices/âncoras e estilos atuais; remover imagens comprovadamente órfãs se seguras e dentro do escopo.
- Não retratar como "liberado em produção" algo presente apenas na branch de integração. Incluir uma nota discreta de versão/estado: **"material validado contra a branch de integração; disponibilidade em produção depende de publicação"**, até haver evidência de deploy.

## Etapa 4 — Validação automatizada e funcional

1. Recontar e verificar existência de todas as imagens locais referenciadas, links e âncoras internas, IDs duplicados e recursos remotos.
2. Testar renderização de ambos os HTML em 390px e 1280px; checar imagens e transbordamento horizontal.
3. Executar `npm run manual:usuario:html:check` para garantir que o manual integral não foi afetado; se ambiente permitir, `npm run build`, testes focados de rotas/funcionalidades documentadas e `git diff --check`.
4. Comparar a evidência de cada orientação com o código atual e capturas reais; documentar **limitações e falhas sem escondê-las**.
5. Confirmar por diff que somente os arquivos de documentação/capturas autorizados mudaram. **Nenhuma mudança no manual canônico, `src/`, `server/` ou migrations.**
6. Se fizer sentido, gerar versões PDF dos **guias** para leitura/impressão opcional, mas sem alterar o pipeline do manual e sem exigir impressão das 260 páginas. Não é requisito bloquear a entrega se não for viável.

## Critério de aceite rigoroso

Os guias só podem ser declarados **PRONTOS PARA VALIDAÇÃO DA TATI** quando:
- 100% das jornadas críticas acima estiverem cobertas e as orientações comprovadas;
- 20/20 ressalvas estiverem classificadas, com decisão e evidência (limitações reais podem permanecer, mas não como erro do texto);
- nenhuma informação sabidamente desatualizada persistir;
- prints usados forem consistentes com a aplicação documentada;
- verificações de HTML/imagens/navegação/renderização forem aprovadas;
- nenhum arquivo funcional ou branch principal for alterado.

**"Pronto para a Tati" não equivale a "homologado pela Tati" ou "em produção".** Se faltarem testes ou decisões, indique status **COM RESSALVAS / NÃO PRONTO**, com lista exata e severidade, e não declare 100%.

## Entrega e retorno

- Gerar `docs/ai/returns/guias-praticos-auditoria-final-2026-10-08-retorno.md` com TASK_ID, base/SHA, branch/HEAD inicial e final, diff, arquivos, **matriz 20/20 dos IDs**, matriz das jornadas, evidências, testes e exit codes, imagens novas/retiradas, pendências e o roteiro de validação da Tati para 09:00–09:30.
- Atualizar `docs/ai/context/SESSION_CHECKPOINT.md` **somente** se necessário para handoff, mantendo-o compacto.
- Commit e push normal SOMENTE da branch documental após gates aprovados. Não PR/merge/deploy. Informar link da branch, SHA final, `git status` e porcentagem de tokens restantes somente se disponível de forma confiável (caso contrário: `INDISPONÍVEL`).
- Na resposta final, priorizar: **o que foi corrigido, o que ainda impede 100%, status real da entrega e link dos guias/retorno**.
