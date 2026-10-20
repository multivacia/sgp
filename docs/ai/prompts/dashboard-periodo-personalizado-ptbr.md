# PROMPT — SGP+ | Padronização do período e linguagem do Dashboard

## 1. Contexto

Projeto: SGP+ Web  
Repositório: `multivacia/sgp`  
Branch de trabalho: `hotfix/listagem-atividades-tati`  
TASK_ID: `dashboard-periodo-personalizado-ptbr`

**Objetivo:** implementar um único filtro de período, com Data inicial e Data final, compartilhado entre as visões Operacional e Gerencial do Dashboard, e corrigir textos técnicos e expressões inadequadas para usuários brasileiros.

A implementação deve ser realizada sobre a branch do hotfix existente, preservando integralmente as correções de paginação e listagem de atividades já implementadas.

Não misturar mudanças de outras branches.

## 2. Procedimento inicial obrigatório

Antes de modificar qualquer arquivo:

1. Ler `CLAUDE.md`, `AGENTS.md`, `PROJECT_CONTEXT.md` e `SESSION_CHECKPOINT.md`, quando existentes.
2. Consultar as instruções do fluxo de desenvolvimento em `docs/ai`.
3. Executar `git fetch origin --prune`.
4. Identificar HEAD, branch ativa e estado do working tree.
5. Verificar divergências entre a branch local e `origin/hotfix/listagem-atividades-tati`.
6. Não sobrescrever alterações locais, descartar stashes ou modificar arquivos não relacionados.
7. Se houver divergência, trabalho não commitado ou conflito, interromper operações destrutivas e relatar o problema.
8. Criar o arquivo `docs/ai/prompts/dashboard-periodo-personalizado-ptbr.md` com este prompt.

Não assumir que os SHAs encontrados em sessões anteriores continuam atuais.

## 3. Diagnóstico já realizado

A implementação atual possui dois filtros independentes.

**Dashboard Operacional**

- Estado: `opRealizedPreset`.
- Componente: `<select>` dentro de `DashboardPage.tsx`.
- Valores: sem período, `7d`, `15d`, `30d` e `month`.
- Persistência: `sgp.dashboard.operationalRealizedPreset`.
- API: `/api/v1/dashboard/operational`.
- Parâmetro: `realizedPeriodPreset`.
- Regra de cálculo: soma de apontamentos baseada em `conveyor_time_entries.entry_at`.
- O seletor aparece apenas na visualização Cards.

**Dashboard Gerencial**

- Estado: `execDays`.
- Componente: `ExecutiveWindowSelector.tsx`.
- Valores: 7, 15, 30, 60 e 90 dias.
- Persistência: `sgp.dashboard.executiveWindowDays`.
- API: `/api/v1/dashboard/executive`.
- Parâmetro: `days`.
- Regra de cálculo: esteiras concluídas com base em `completed_at`.
- O filtro já aparece na barra superior.

Esses comportamentos foram identificados na inspeção da branch, mas devem ser reconfirmados antes da implementação.

## 4. Comportamento esperado

Substituir os dois seletores por um componente compartilhado com dois campos:

- **Data inicial**
- **Data final**

Adicionar o botão **Aplicar período**.

O filtro deverá aparecer na barra superior do Dashboard, junto às opções Operacional, Gerencial, Cards, Gráficos e Atualizar.

Não duplicar o componente em cada aba.

### Período inicial

Configurar inicialmente:

- Data inicial: `2026-10-01`.
- Data final: `2026-10-20`.

Essas datas são a configuração inicial solicitada para esta entrega, não uma regra permanente de negócio para futuros usuários.

Persistir o intervalo aplicado no `localStorage` utilizando uma única chave apropriada.

Ao retornar ao Dashboard, recuperar o intervalo válido persistido.

Não continuar usando independentemente as antigas preferências Operacional e Gerencial.

Não introduzir uma migração automática dos presets antigos que possa substituir silenciosamente as datas definidas para esta entrega.

### Alternância entre visões

Ao selecionar um intervalo na visão Operacional e mudar para Gerencial:

- Preservar as datas.
- Utilizar exatamente o mesmo intervalo na consulta Gerencial.
- Não voltar para o período anteriormente selecionado no Gerencial.

O mesmo deve acontecer no caminho inverso.

A troca entre Cards e Gráficos também não pode modificar o período.

### Aplicação

O usuário poderá editar as datas antes de aplicar.

Somente ao clicar em **Aplicar período** o sistema deve atualizar o intervalo utilizado nas consultas.

O botão Atualizar deve recarregar os dados com o intervalo já aplicado.

Evitar requisições desnecessárias durante a edição das datas.

## 5. Validações

Implementar validações no frontend e no backend.

Regras:

1. Data inicial obrigatória.
2. Data final obrigatória.
3. Data inicial não pode ser posterior à data final.
4. Rejeitar datas inexistentes.
5. Aceitar somente datas válidas no formato contratual `YYYY-MM-DD`.
6. Exibir erros claros em português do Brasil.
7. Impedir envio de intervalos inválidos.
8. Avaliar e documentar um limite de intervalo, caso tecnicamente necessário, sem impor uma restrição arbitrária de 92 dias ou semelhante.
9. Não restringir automaticamente datas futuras sem justificativa de negócio: elas podem ser úteis para verificar conclusões futuras, embora os resultados dependam dos dados existentes.

Mensagens sugeridas:

- "Informe a data inicial."
- "Informe a data final."
- "A data inicial não pode ser posterior à data final."
- "Informe uma data válida."
- "Não foi possível atualizar o Dashboard. Tente novamente."

## 6. Tratamento de datas e fuso horário

Adotar como referência o fuso `America/Sao_Paulo`.

O período informado representa dias civis completos.

Exemplo:

Data inicial: `2026-10-01`  
Data final: `2026-10-20`

A consulta deve considerar todos os registros de 01/10/2026 até o término de 20/10/2026, inclusive.

Preferir consultas com:

- Limite inicial inclusivo.
- Limite superior exclusivo, correspondente ao início do dia seguinte no fuso operacional.

Não utilizar simplesmente `new Date('YYYY-MM-DD')` como conversão de data local.

Inspecionar e reutilizar, quando adequadas, as funções de `server/src/shared/operationalWorkDate.ts`, incluindo:

- `operationalDayStart`
- `operationalDayEnd`
- `operationalDateOf`

O backend já possui `resolveOperationalPeriod`, com suporte a `custom`, em `server/src/shared/operationalPeriod.ts`.

Reutilizar a lógica existente quando apropriado, sem criar implementações paralelas desnecessárias.

**Atenção:** verificar que a regra de data de realização de apontamentos permanece consistente com `entry_at`, inclusive para apontamentos retroativos.

## 7. Backend — Dashboard Operacional

Inspecionar:

- `server/src/modules/dashboard/dashboard.controller.ts`
- `server/src/modules/dashboard/dashboard.schemas.ts`
- `server/src/modules/dashboard/dashboard.service.ts`
- `server/src/modules/dashboard/dashboard.repository.ts`
- `server/src/modules/dashboard/dashboard.dto.ts`

Modificar a API para aceitar Data inicial e Data final.

Sugestão de contrato:

`GET /api/v1/dashboard/operational?startDate=2026-10-01&endDate=2026-10-20`

Regras:

- Filtrar o indicador de apontamentos do período pelas datas informadas.
- Não alterar o cálculo histórico acumulado.
- Não aplicar o período indiscriminadamente às contagens de esteiras por situação.
- Manter os demais indicadores com a semântica atual.
- Preservar compatibilidade dos parâmetros antigos da API, quando necessário, com precedência documentada e sem ambiguidade.
- Retornar metadados suficientes para o frontend apresentar corretamente o intervalo aplicado.

Revisar o contrato `OperationalDashboardDto` e os tipos correspondentes no frontend.

## 8. Backend — Dashboard Gerencial

Modificar a API para aceitar o mesmo intervalo.

Sugestão:

`GET /api/v1/dashboard/executive?startDate=2026-10-01&endDate=2026-10-20`

Atualmente, o sistema utiliza `days`.

A nova implementação deve utilizar o intervalo explícito para contabilizar as esteiras concluídas.

Regras:

- Considerar `completed_at` no intervalo selecionado.
- Incluir todo o dia final.
- Manter a regra de situação `FINALIZADA`.
- Não filtrar as esteiras ativas pelo período.
- Não alterar os cálculos globais de minutos previstos e apontados.
- Preservar compatibilidade de chamadas antigas com `days`, quando necessário.
- Atualizar o contrato de resposta e seus tipos.

Garantir que a apresentação da visão Gerencial utilize o intervalo real, e não uma quantidade fixa de dias.

## 9. Frontend — Componente compartilhado

Arquivo principal:

`src/features/gestor/DashboardPage.tsx`

Inspecionar também:

- `src/components/dashboard/ExecutiveWindowSelector.tsx`
- `src/lib/dashboard/executiveDashboardWindow.ts`
- `src/services/dashboard/dashboardApiService.ts`
- `src/domain/dashboard/dashboard.types.ts`
- Componentes de Cards e Gráficos.

Criar um componente reutilizável para seleção do intervalo.

Pode ser chamado de `DashboardDateRangeFilter`, respeitando os padrões de organização do projeto.

O componente deverá:

- Apresentar Data inicial e Data final.
- Utilizar o padrão visual atual do SGP+.
- Ser responsivo para celular.
- Ser acessível por teclado.
- Ter rótulos explícitos.
- Mostrar o formato das datas de maneira adequada ao português do Brasil.
- Exibir erros de validação.
- Desabilitar a aplicação enquanto o intervalo estiver inválido.
- Indicar atualização sem bloquear permanentemente a interface.

Preservar os mecanismos existentes de atualização automática após alterações operacionais e retorno à aba do navegador.

Cuidar para evitar condições de corrida: uma requisição antiga não deve sobrescrever dados de um intervalo mais recente.

## 10. Gráficos e detalhamento

Inspecionar:

`src/components/dashboard/charts/ExecutiveDashboardCharts.tsx`

E os demais componentes de gráficos do Dashboard.

Atualmente existem títulos construídos com expressões como:

- `Concluídas (30d)`
- `Janela temporal`
- `últimos 30 dias`

Substituir pela referência ao período selecionado.

Exemplo:

**Esteiras concluídas — 01/10/2026 a 20/10/2026**

Ajustar também os tooltips, legendas e textos auxiliares.

### Navegação para o Backlog

Verificar cuidadosamente os links que abrem o Backlog a partir dos indicadores e gráficos.

Hoje alguns links utilizam `days`.

Com o novo filtro personalizado, não é aceitável abrir um Backlog com período diferente do mostrado no Dashboard.

Inspecionar:

`src/lib/dashboard/dashboardNavigation.ts`

E o contrato de filtros da página de destino.

Se o Backlog já aceitar Data inicial e Data final, utilizar o contrato existente.

Caso não aceite, implementar o suporte estritamente necessário ou impedir a navegação incompatível com uma solução de interface clara.

Não apresentar dados de um período como se fossem de outro.

## 11. Padronização dos textos — português do Brasil

Revisar todos os textos visíveis das duas visões do Dashboard, incluindo:

- Títulos.
- Subtítulos.
- Cards.
- Gráficos.
- Legendas.
- Tooltips.
- Mensagens de estado vazio.
- Mensagens de erro.
- Textos acessíveis (`aria-label` e `title`).
- Descrições retornadas pela API que sejam exibidas ao usuário.

Inspecionar especialmente:

- `src/lib/operationalSemantics.ts`
- `src/features/gestor/DashboardPage.tsx`
- `src/components/dashboard/charts/`
- `server/src/modules/dashboard/dashboard.service.ts`

### Substituições prioritárias

| Atual | Esperado |
|---|---|
| STEPs | Atividades ou etapas, conforme o contexto |
| Bucket operacional | Situação operacional |
| Snapshot atual | Situação atual |
| Preset | Período selecionado |
| Janela temporal | Período de análise |
| Janela (conclusões) | Período de análise |
| Sem apontamentos registados | Nenhum apontamento registrado |
| Ao premir | Ao clicar ou Ao selecionar |
| Âmbito | Contexto ou abrangência |
| Recorte executivo | Visão gerencial, quando adequado |
| Minutos apontados (acumulado) | Total de horas apontadas |
| Minutos apontados (período) | Horas apontadas no período |
| Previsto estrutural (STEPs) | Tempo previsto das atividades |
| Bucket em atraso | Esteiras em atraso |

Essas substituições exigem cuidado semântico.

Não substituir indiscriminadamente todas as ocorrências nos arquivos, porque algumas expressões são identificadores de domínio, tipos, constantes ou estruturas técnicas.

Não modificar nomes internos, campos de banco ou contratos por razões exclusivamente linguísticas.

### Regra de linguagem

O usuário do SGP+ trabalha com esteiras, OS, atividades, colaboradores e apontamentos.

Ele não precisa compreender:

- `STEP`
- `bucket`
- `snapshot`
- `preset`
- `entry_at`
- `completed_at`
- `total_planned_minutes`

Esses termos podem continuar existindo no código, mas não devem aparecer em textos destinados ao usuário final.

Manter consistência entre os nomes dos indicadores e suas respectivas unidades.

Se um indicador for renomeado para "Horas", garantir que seu valor seja formatado adequadamente, sem alterar a unidade numérica contratual utilizada internamente.

## 12. Testes obrigatórios

Criar ou atualizar testes pertinentes.

### Backend

Validar:

1. Período de um único dia.
2. Intervalo entre 01/10/2026 e 20/10/2026.
3. Registro exatamente no início da data inicial.
4. Registro no último instante da data final.
5. Registro no dia seguinte à data final.
6. Datas inválidas.
7. Data inicial maior que a final.
8. Data de realização retroativa.
9. Mudança de mês e ano.
10. Preservação dos indicadores globais.
11. Esteiras concluídas dentro e fora do período.
12. Compatibilidade de chamadas antigas.

### Frontend

Validar:

1. Renderização dos dois campos.
2. Aplicação do intervalo.
3. Alternância Operacional → Gerencial.
4. Alternância Gerencial → Operacional.
5. Alternância Cards → Gráficos.
6. Persistência após recarregar a página.
7. Validação das datas.
8. Exibição das datas em português do Brasil.
9. Ausência de textos técnicos na interface.
10. Navegação para detalhamento com intervalo consistente.
11. Comportamento em telas pequenas.
12. Ausência de regressão nas atualizações automáticas.

Executar os testes relevantes, TypeScript, lint e build, conforme scripts disponíveis.

Não considerar testes não executados como aprovados.

## 13. Restrições

Está autorizado:

- Alterar frontend e backend relacionados ao Dashboard.
- Criar componentes e funções auxiliares necessários.
- Atualizar contratos e tipos.
- Criar testes.
- Atualizar documentação relacionada.
- Criar commit.
- Publicar via push normal na branch `hotfix/listagem-atividades-tati`.

Não está autorizado:

- Fazer merge em `develop`.
- Fazer merge em `main`.
- Alterar `homol`.
- Realizar deploy.
- Executar migrations.
- Modificar dados de produção.
- Reestruturar módulos não relacionados.
- Alterar regras de cálculo globais sem necessidade justificada.
- Fazer force-push.
- Apagar branches.
- Descartar trabalho local de terceiros.
- Abrir PR sem autorização posterior.

Se alguma migration se mostrar indispensável, interromper essa parte e relatar a necessidade antes de executar.

## 14. Publicação

Após implementar:

1. Revisar o diff integralmente.
2. Verificar ausência de alterações fora do escopo.
3. Executar os testes disponíveis.
4. Registrar resultados e limitações.
5. Confirmar novamente o HEAD remoto.
6. Se o remoto avançou, reconciliar antes de publicar.
7. Criar commit com mensagem objetiva.
8. Executar push normal exclusivamente para `hotfix/listagem-atividades-tati`.
9. Confirmar que HEAD local e branch remota apontam para o mesmo SHA.
10. Confirmar que `main`, `develop` e `homol` não foram alteradas.

Não publicar código com erro conhecido de build ou teste diretamente relacionado à alteração.

## 15. Relatório de retorno

Criar:

`docs/ai/returns/dashboard-periodo-personalizado-ptbr-retorno.md`

O relatório deverá incluir:

- Status final.
- Branch utilizada.
- SHA inicial e final.
- Arquivos alterados.
- Descrição da implementação.
- Contratos das APIs antes e depois.
- Regra de datas e fuso horário.
- Indicadores afetados e preservados.
- Textos corrigidos, com exemplos.
- Testes executados e resultados.
- Limitações ou falhas preexistentes.
- Evidências de funcionamento.
- Roteiro de homologação para Gustavo e Tati.
- Pendências identificadas.

Atualizar `SESSION_CHECKPOINT.md` conforme o fluxo do projeto.

## 16. Critérios de aceite

Considerar a implementação pronta somente quando:

- As duas abas exibirem Data inicial e Data final.
- O intervalo aplicado for compartilhado.
- O valor inicial for 01/10/2026 a 20/10/2026 em uma sessão sem preferência previamente salva.
- Os apontamentos do Operacional respeitarem esse período.
- As conclusões do Gerencial respeitarem esse período.
- Os acumulados e indicadores de situação atual permanecerem corretos.
- Cards e Gráficos apresentarem informações consistentes.
- Não houver textos técnicos conhecidos visíveis no Dashboard.
- O detalhamento não apresentar período divergente.
- Os testes pertinentes passarem.
- A branch do hotfix estiver publicada e pronta para homologação.

**Entregável final: implementação funcional, validada tecnicamente e publicada somente na branch do hotfix. Não realizar merge nem deploy.**
