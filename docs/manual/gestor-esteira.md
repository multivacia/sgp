# Manual do Gestor de Esteira — SGP (Sistema de Gestão de Produção)

> **Para quem é este manual:** gestores responsáveis por criar, configurar e acompanhar
> esteiras individuais (OS / veículos).

---

## 1. Suas responsabilidades no SGP

Como Gestor de Esteira você:

- Cria a esteira para cada veículo / OS.
- Define a estrutura de tarefas, setores e atividades.
- Designa colaboradores e equipes para cada atividade.
- Acompanha o progresso e gerencia o ciclo de vida da esteira.
- Visualiza relatórios de evolução e eficiência.

---

## 2. Login e navegação

1. Acesse o SGP no navegador e entre com e-mail e senha.
2. Na primeira vez, o sistema pode pedir troca de senha.
3. O menu lateral dá acesso a todas as funcionalidades do gestor.

### Principais rotas do menu

| Seção | O que encontra |
|-------|---------------|
| Backlog | Todas as esteiras ativas com KPIs e filtros |
| Nova Esteira | Assistente de criação |
| Esteiras (via Backlog) | Detalhe e gestão de cada esteira |
| Evolução de Esteiras | Relatório previsto vs. realizado |
| Planejamento Semanal | Distribuição de atividades na semana |
| Dashboard | Indicadores gerenciais |
| Equipes | Cadastro e gestão de equipes |
| Colaboradores | Lista e saúde operacional |

---

## 3. Backlog

Caminho: menu lateral → **Backlog** (`/app/backlog`)

Visão consolidada de todas as esteiras. Cada card mostra:

- Nome / OS / veículo
- Status operacional (veja seção 8)
- Progresso geral (%)
- Indicadores de atraso

Use os filtros para encontrar esteiras por status, prazo ou palavra-chave.

---

## 4. Criar Nova Esteira

Caminho: menu lateral → **Nova Esteira** (`/app/nova-esteira`)

Há três pontos de partida:

### 4.1 Composição Manual

Você monta a estrutura do zero usando o assistente passo a passo.

**Etapa 1 — Dados iniciais**
- Nome da esteira / veículo
- Número da OS
- Prazo (opcional)
- Observações

**Etapa 2 — Montagem da estrutura**
- Adicione **Tarefas** (ex.: Desmontagem, Pintura, Montagem).
- Dentro de cada tarefa, adicione **Atividades** informando:
  - Nome da atividade
  - Setor técnico
  - Tempo previsto (em minutos)
  - Quantidade prevista (multiplicador de unidades)
  - Ordem de execução (para bloqueio de sequência)

**Etapa 3 — Revisão e criação**
- Revise toda a estrutura antes de confirmar.
- Corrija pendências sinalizadas pelo sistema.
- Clique em **Criar Esteira**.

### 4.2 A partir de um Documento (Pipeline R6)

Caminho: menu lateral → **Importar OS** (`/app/importar-os`)

1. Faça upload do PDF da OS (formato Bravo).
2. O sistema lê o documento e propõe automaticamente a estrutura hierárquica.
3. Revise o draft gerado — aceite, ajuste ou remova atividades conforme necessário.
4. Confirme para criar a esteira.

### 4.3 A partir da Matriz de Operações

Caminho: menu lateral → **Matrizes de Operação** (`/app/matrizes-operacao`)

A Matriz de Operações é um catálogo reutilizável de tarefas e atividades.

1. No assistente de Nova Esteira, escolha a opção **"A partir de uma matriz"**.
2. Selecione a matriz e o sistema preenche a estrutura base.
3. Ajuste o que for necessário para este veículo específico e confirme.

---

## 5. Estrutura da Esteira

Caminho: Backlog → clique na esteira → aba Estrutura

### Hierarquia

```
Esteira (veículo/OS)
└── Tarefa (macro-bloco, ex.: Desmontagem)
    └── Atividade / Passo (unidade que o colaborador executa e aponta)
        ├── Setor técnico
        ├── Tempo previsto
        └── Quantidade prevista
```

### Editar a estrutura

- **Adicionar atividade tardiamente:** use o botão **"Adicionar estrutura"** na tela de
  detalhe. Atividades novas podem ser adicionadas mesmo com a esteira em andamento.
- **Editar quantidade prevista:** clique no ícone de edição ao lado da atividade.
- **Abortar uma atividade:** use a opção **"Abortar passo"** — registra o motivo e marca
  como cancelada sem excluir o histórico.
- **Reabrir atividade abortada:** use **"Restaurar passo abortado"** se a decisão for
  revertida.
- **Concluir atividade manualmente:** use **"Concluir passo"** quando o colaborador não
  fez o apontamento pelo sistema.
- **Reabrir atividade concluída:** use **"Reabrir passo"** se houver retrabalho.

---

## 6. Designar Colaboradores e Equipes

### Por atividade individual

Na tela de detalhe da esteira, em cada linha de atividade há um **Avatar Strip** — uma
fileira de avatares dos colaboradores designados.

1. Clique no ícone **"+"** ao lado dos avatares.
2. Um popover com campo de busca aparece.
3. Selecione o colaborador ou equipe.
4. A designação é salva imediatamente.

### Papéis de designação

| Papel | Significado |
|-------|------------|
| Responsável | Principal executor da atividade |
| Apoio | Colaborador auxiliar |

### Workload por nó

Clique em **"Ver carga de trabalho"** na aba de estrutura para ver quantas horas estão
distribuídas por colaborador em toda a esteira.

---

## 7. Acompanhar o Progresso

### Tela de detalhe da esteira

Caminho: Backlog → clique na esteira

Mostra:

- Status geral e % de conclusão
- Lista de todas as tarefas com progresso individual
- Lista de atividades com: status, colaboradores, tempo previsto × executado
- Histórico de eventos operacionais (timeline)

### Painel analítico de passo

Clique em qualquer atividade para abrir o painel lateral com:

- Todos os apontamentos registrados (data, minutos, colaborador, observação)
- Histórico de designações

### Apontamento pelo Gestor

Gestores com permissão `time_entries.create_on_behalf` podem criar apontamentos em nome
de colaboradores.

Caminho: `/app/gestao/apontamento/:stepNodeId`

---

## 8. Ciclo de Vida da Esteira

Cada esteira passa por um ciclo de status com transições controladas.

### Status disponíveis

| Status | Significado |
|--------|------------|
| Em Elaboração | Rascunho — estrutura ainda sendo montada |
| Aguardando Planejamento | Estrutura pronta, aguarda plano |
| Em Planejamento | Plano operacional sendo elaborado |
| A Iniciar | Pronta para início, aguarda liberação |
| Em Andamento | Trabalho em execução |
| Finalizada | Concluída |
| Cancelada | Encerrada sem conclusão |

### Transições de retorno (auditadas)

É possível retornar uma esteira para um status anterior quando necessário:

- **Em Andamento → Em Planejamento** — para revisar o plano
- **Em Planejamento → Em Elaboração** — para revisar a estrutura

Toda transição de retorno exige **registro de motivo** e fica no histórico de eventos.

### Como avançar ou retornar o status

Na tela de detalhe da esteira, use os botões de ação no topo da página (disponíveis
conforme o status atual e suas permissões).

---

## 9. Plano Operacional

Caminho: tela de detalhe da esteira → aba **Plano Operacional**

O plano associa atividades a datas de execução e colaboradores responsáveis.

### Gerar o plano

1. Clique em **"Gerar plano"**.
2. O sistema propõe uma distribuição baseada na carga e disponibilidade.
3. Revise — ajuste datas e responsáveis se necessário.
4. **Aprove o plano** — o checklist de aprovação aparece para confirmação.

### Gerenciar o plano existente

- Veja itens agrupados por data.
- Edite datas ou responsáveis de itens individuais.
- Rejeite itens que não devem ser planejados.

---

## 10. Evolução de Esteiras (Relatório)

Caminho: menu lateral → **Evolução de Esteiras** (`/app/gestao/evolucao-esteiras`)

Relatório hierárquico com previsto × realizado × excedido para todas as esteiras.

### Filtros disponíveis

- Status da esteira
- Colaborador designado
- Período de referência

### O que o relatório mostra

| Coluna | Significado |
|--------|------------|
| Previsto | Soma de `tempo_previsto × quantidade_prevista` |
| Realizado | Soma de todos os apontamentos (`SUM(minutos)`) |
| Excedido | `Realizado − Previsto` quando positivo |
| Eficiência | `Realizado ÷ Previsto × 100%` |
| % Conclusão | Progresso médio das atividades |

### Imprimir

O relatório tem modo de impressão — clique em **"Imprimir"** para abrir a visualização
otimizada para papel.

### Imprimir Fichas de Atividade (Ticket Térmico)

Selecione esteiras e clique em **"Imprimir Fichas"** para gerar etiquetas térmicas com os
dados das atividades — útil para uso físico na fábrica.

---

## 11. Planejamento Semanal

Caminho: menu lateral → **Planejamento Semanal** (`/app/planejamento-semanal`)

Visão de todas as atividades planejadas para a semana, agrupadas por dia. Permite:

- Visualizar a carga da semana
- Redistribuir atividades entre dias
- Identificar lacunas ou sobrecargas

---

## 12. Dashboard Gerencial

Caminho: menu lateral → **Dashboard** (`/app/dashboard`)

Gráficos e KPIs de alto nível:

- **Visão Operacional:** progresso das esteiras ativas, atividades em atraso, carga por
  colaborador
- **Visão Executiva:** indicadores de eficiência, throughput, tendências

O acesso a cada visão depende das suas permissões.

---

## 13. SGP+ Produção — Visão do Gestor

O Modo Fábrica (`/app/producao`) e o Kiosk (`/app/kiosk`) são acessados pelos colaboradores.
O gestor gerencia o acesso via painel administrativo de colaboradores.

### Gerenciar PINs de colaboradores

Caminho: menu lateral → **Colaboradores** → selecione um colaborador

| Ação | Quando usar |
|------|------------|
| Resetar PIN | Colaborador esqueceu o PIN ou está bloqueado |
| Desbloquear | Após tentativas incorretas consecutivas |
| Ativar / Inativar acesso de produção | Controlar quem aparece no Kiosk/Modo Fábrica |

Após o reset o colaborador receberá um PIN temporário e será obrigado a criar um novo
PIN no próximo login de produção.

### Saúde Operacional dos Colaboradores

Caminho: menu lateral → **Colaboradores → Saúde Operacional**
(`/app/colaboradores/saude-operacional`)

Visão consolidada de todas as atividades por colaborador — útil para identificar gargalos
ou colaboradores sobrecarregados.

---

## 14. Equipes

Caminho: menu lateral → **Equipes** (`/app/equipes`)

Crie equipes nomeadas e vincule colaboradores. Ao designar uma equipe para uma atividade,
todos os membros ficam automaticamente designados.

### Criar uma equipe

1. Clique em **"Nova Equipe"**.
2. Defina nome e descrição.
3. Adicione colaboradores como membros.
4. Salve.

---

## 15. Dúvidas frequentes

**Posso criar uma esteira sem definir toda a estrutura de uma vez?**
Sim. Salve como rascunho (**Em Elaboração**) e complete a estrutura depois. Atividades
também podem ser adicionadas com a esteira já em andamento.

**Como corrigir um apontamento feito por um colaborador?**
Com a permissão `time_entries.edit_any`, acesse o painel analítico da atividade e edite
ou remova o apontamento. A operação fica registrada na auditoria.

**A esteira foi concluída mas precisa ser reaberta para retrabalho — como faço?**
Use a transição de retorno com registro de motivo. O sistema mantém todo o histórico.

**Quero usar uma estrutura padrão em várias esteiras — como evitar recriação manual?**
Configure uma **Matriz de Operações** (`/app/matrizes-operacao`) com as tarefas e
atividades padrão e reutilize-a na criação de cada nova esteira.

**O Kiosk não mostra um colaborador — por quê?**
O colaborador pode estar inativo ou sem credencial de produção configurada. Verifique
no painel **Colaboradores → Admin de Produção**.

**Como saber se um colaborador apontou fora de sequência?**
O painel analítico da atividade registra a justificativa de execução fora de sequência
quando o colaborador ou o Kiosk exige essa informação. Também aparece no histórico de
eventos da esteira.
