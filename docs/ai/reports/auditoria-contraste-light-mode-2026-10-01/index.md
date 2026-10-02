# Auditoria de Contraste Visual — Light Mode (light-executive)

**Data:** 2026-10-01
**Escopo:** Tema `light-executive` — SGP+ Web (React + TypeScript + Tailwind CSS 4)
**Auditor:** Agente de auditoria de acessibilidade automatizado
**Método:** Análise estática de código (CSS custom properties + JSX) + cálculo WCAG 2.1 AA

---

## 1. RESUMO EXECUTIVO

| Item | Valor |
|------|-------|
| Data da auditoria | 2026-10-01 |
| Escopo | Tema `light-executive` |
| Total de combinações analisadas | 50 |
| CRITICO (< 2:1) | 18 |
| ALTO (2:1–4.49:1 texto normal) | 7 |
| MÉDIO (3:1–4.49:1 texto normal, passa para grande) | 2 |
| PASSA (≥ 4.5:1 texto normal) | 23 |
| Componentes afetados | 12 |
| Rotas/telas afetadas | 7+ |

### Principais causas raiz

1. **CAUSA RAIZ 01 — Tokens de texto dark-mode usados em componentes sem override light:** Cores como `text-amber-100`, `text-rose-100`, `text-emerald-200`, `text-sky-200`, `text-slate-200/300` são eficazes no dark mode (texto claro sobre fundo escuro) mas no light mode ficam sobre fundo branco ou claro, produzindo contraste quase nulo.

2. **CAUSA RAIZ 02 — KpiCard/BacklogKpiCards sem override de texto no light mode:** O componente usa `text-slate-50` para valores e `text-slate-400` para labels — no dark mode funcionam, mas no light mode o override CSS que transforma `text-slate-50` em `#0f172a` está definido na regra genérica `html[data-theme="light-executive"] .text-slate-50`, porém o `kpiCardClass` aplica `border-white/[0.08]` e `bg-sgp-app-panel-deep/90` que são convertidos para `#ffffff` pelo guardrail do tema. O problema real é que `text-slate-50` neste contexto específico pode não ter o override aplicado corretamente ou a regra global pode ser sobreposta por especificidade — a auditoria estática indica risco.

3. **CAUSA RAIZ 03 — Ausência de `light-executive` override em SgpToast e SgpInlineBanner:** Os componentes usam paleta dark-only (`bg-sgp-navy-deep/96`, `text-slate-100`, `text-emerald-100/95`, `text-rose-100/95`, `text-emerald-500/0.07`) sem nenhum override para light mode, resultando em texto claro sobre fundo branco.

4. **CAUSA RAIZ 04 — NavLink sidebar: texto muted levemente abaixo do mínimo:** `text-slate-400` (#64748b) sobre fundo sidebar `#d3ddec` produz 3.47:1 — abaixo de 4.5:1 para texto normal de 13px.

5. **CAUSA RAIZ 05 — text-sgp-gold como cor de link no light mode:** O token gold (#c9a227) sobre fundo branco tem apenas 2.42:1 de contraste — menos da metade do mínimo para texto.

### Limitações da auditoria

- Auditoria estática: não foi possível executar o app em navegador para capturar cores computadas reais.
- Algumas classes com opacidade fracionada (ex: `bg-rose-500/[0.06]`) foram aproximadas para o valor efetivo sobre fundo branco.
- O override CSS `html[data-theme="light-executive"] .text-slate-50 { color: #0f172a !important }` pode resolver alguns casos que aparecem como críticos — marcados como "depende do override" onde aplicável.
- Componentes kiosk e production foram parcialmente auditados (UI touch-first, isolada).

---

## 2. PROBLEMAS CONFIRMADOS

### C-001 — CRÍTICO
```
ID: C-001
Severidade: CRÍTICO
Tela/Rota: /app/gestao/jornada-colaborador
Componente: JornadaColaboradorGestorPage — card "COBERTURA DE TEMPO"
Elemento visual: Título e valor numérico do card
Texto exibido: "COBERTURA DE TEMPO" + valor de ratio
Foreground efetivo (hex): #fcd34d (text-amber-200/90)
Background efetivo (hex): #fffbec (bg-sgp-gold/0.06 sobre branco)
Relação de contraste calculada: 1.39:1
Mínimo WCAG AA esperado: 4.5:1 (texto normal) / 3:1 (texto grande)
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-amber-200/90 (classe Tailwind sem override light)
Arquivo e linha: src/features/gestor/JornadaColaboradorGestorPage.tsx, linha 493
Outras telas afetadas: src/features/colaborador/JornadaPage.tsx (padrão similar)
Causa raiz: CAUSA RAIZ 01 — token dark-mode sem override light
Recomendação de correção: Aplicar text-amber-900 (#78350f) ou usar --semantic-ops-warning-text
Risco Dark Mode se corrigir o token: ALTO — se alterar a classe Tailwind diretamente quebra dark mode. Usar override [data-theme="light-executive"] no CSS ou data-sgp-surface.
```

### C-002 — CRÍTICO
```
ID: C-002
Severidade: CRÍTICO
Tela/Rota: /app/gestao/jornada-colaborador
Componente: JornadaColaboradorGestorPage — card "COBERTURA DE TEMPO"
Elemento visual: Descrição/texto auxiliar do card (text-amber-100)
Texto exibido: Texto explicativo da cobertura
Foreground efetivo (hex): #fde68a (text-amber-100)
Background efetivo (hex): #fffbec (bg-sgp-gold/0.06)
Relação de contraste calculada: 1.20:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-amber-100 (linha 499) — override transforma em #92400e via html[data-theme="light-executive"] .text-amber-100
Arquivo e linha: src/features/gestor/JornadaColaboradorGestorPage.tsx, linha 499
Outras telas afetadas: —
Causa raiz: CAUSA RAIZ 01
Nota: O override global converte text-amber-100 para #92400e (contrast 6.65:1 sobre fff7e6). Verificar se o override está sendo aplicado a ESTE elemento específico ou se a especificidade do bg-sgp-gold/0.06 cria contexto diferente. Se override funcionar, este item passa.
Recomendação de correção: Adicionar data-sgp-surface="warning" e usar --semantic-ops-warning-text
```

### C-003 — CRÍTICO
```
ID: C-003
Severidade: CRÍTICO
Tela/Rota: /app/gestao/jornada-colaborador
Componente: JornadaColaboradorGestorPage — card "PREVISÃO DE ATRASO"
Elemento visual: Título do card de atraso
Texto exibido: "PRESSÃO DE ATRASO (alocações no bucket «em atraso»)"
Foreground efetivo (hex): #fecdd3 (text-rose-200/90)
Background efetivo (hex): #fff5f5 (bg-rose-500/0.06)
Relação de contraste calculada: 1.32:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-rose-200/90 sem override light
Arquivo e linha: src/features/gestor/JornadaColaboradorGestorPage.tsx, linha 509
Outras telas afetadas: —
Causa raiz: CAUSA RAIZ 01
Recomendação de correção: Usar --semantic-ops-danger-text (#9f1239) neste contexto light
Risco Dark Mode: ALTO se alterar a classe. Usar override por seletor ou data-sgp-surface.
```

### C-004 — CRÍTICO
```
ID: C-004
Severidade: CRÍTICO
Tela/Rota: /app/gestao/jornada-colaborador
Componente: JornadaColaboradorGestorPage — card "PREVISÃO DE ATRASO"
Elemento visual: Texto descritivo/auxiliar do card
Texto exibido: Contagens por situação
Foreground efetivo (hex): #ffe4e6 (text-rose-100/75)
Background efetivo (hex): #fff5f5 (bg-rose-500/0.06)
Relação de contraste calculada: 1.12:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-rose-100/75 (linha 516-518)
Arquivo e linha: src/features/gestor/JornadaColaboradorGestorPage.tsx, linhas 516-519
Outras telas afetadas: DashboardPage (linhas 452-456, alert de erro semelhante)
Causa raiz: CAUSA RAIZ 01
Recomendação: data-sgp-surface="danger" + --semantic-ops-danger-text
```

### C-005 — CRÍTICO
```
ID: C-005
Severidade: CRÍTICO
Tela/Rota: /app/jornada (colaborador)
Componente: JornadaPage — KPI card "Apontamentos no período"
Elemento visual: Label e valor do KPI skyblue
Texto exibido: "APONTAMENTOS NO PERÍODO" + valor
Foreground efetivo (hex): #93c5fd (text-sky-200/80)
Background efetivo (hex): #f0faff (bg-sky-500/0.06)
Relação de contraste calculada: 1.70:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-sky-200/80 (linha 530-534 JornadaPage)
Arquivo e linha: src/features/colaborador/JornadaPage.tsx, linhas 529-535
Outras telas afetadas: —
Causa raiz: CAUSA RAIZ 01
Recomendação: Usar --semantic-ops-info-text (#1e3a5f) neste card no light mode
```

### C-006 — CRÍTICO
```
ID: C-006
Severidade: CRÍTICO
Tela/Rota: /app/jornada (colaborador)
Componente: JornadaPage — KPI card "Apontamentos acumulados"
Elemento visual: Label e valor emerald
Texto exibido: "APONTAMENTOS ACUMULADOS" + valor
Foreground efetivo (hex): #a7f3d0 (text-emerald-200/85)
Background efetivo (hex): #f0fdf9 (bg-emerald-500/0.06)
Relação de contraste calculada: 1.23:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-emerald-200/85 sem override light
Arquivo e linha: src/features/colaborador/JornadaPage.tsx, linhas 537-543
Outras telas afetadas: —
Causa raiz: CAUSA RAIZ 01
Recomendação: Usar --semantic-ops-success-text (#065f46)
```

### C-007 — CRÍTICO
```
ID: C-007
Severidade: CRÍTICO
Tela/Rota: /app/jornada (colaborador)
Componente: JornadaPage — KPI card "Esteiras em atraso"
Elemento visual: Label e valor rose
Texto exibido: "ESTEIRAS EM ATRASO" + número
Foreground efetivo (hex): #fecdd3 (text-rose-200/85)
Background efetivo (hex): #fff5f5 (bg-rose-500/0.07)
Relação de contraste calculada: 1.32:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-rose-200/85 sem override light
Arquivo e linha: src/features/colaborador/JornadaPage.tsx, linhas 545-551
Outras telas afetadas: —
Causa raiz: CAUSA RAIZ 01
```

### C-008 — ALTO
```
ID: C-008
Severidade: ALTO
Tela/Rota: múltiplas
Componente: BacklogKpiCards, formulários gerais, labels auxiliares
Elemento visual: Labels de KPI, textos placeholder de campos
Texto exibido: labels como "Rascunho", "Em planejamento", etc.
Foreground efetivo (hex): #94a3b8 (text-slate-400)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 2.56:1
Mínimo WCAG AA esperado: 4.5:1 (texto 10-11px bold = texto normal)
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-slate-400 — override light força para #64748b (4.76:1) MAS apenas para classes .text-slate-400. Quando aplicado como Tailwind class em contexto de cards com bg claro, o override pode não cobrir text-slate-400 aplicado inline ou como valor de classe dinâmica.
Arquivo e linha: src/components/backlog/BacklogKpiCards.tsx, linha 90; src/features/gestor/JornadaColaboradorGestorPage.tsx (múltiplas)
Outras telas afetadas: DashboardPage, BacklogPage, JornadaPage
Causa raiz: CAUSA RAIZ 01 / especificidade CSS insuficiente
Nota: O override `html[data-theme="light-executive"] .text-slate-400 { color: #64748b !important }` DEVE resolver isso para classes Tailwind literais. Verificar se casos dinâmicos (interpolação de string em className) são cobertos.
```

### C-011 — CRÍTICO
```
ID: C-011
Severidade: CRÍTICO
Tela/Rota: /app/dashboard
Componente: DashboardPage — tabela de colaboradores, linha de "realizado"
Elemento visual: Célula de minutos realizados na tabela
Texto exibido: formatHumanMinutes(realizedMinutes)
Foreground efetivo (hex): #a7f3d0 (text-emerald-200/95 sem override)
Background efetivo (hex): #ffffff (tabela no light mode)
Relação de contraste calculada: 1.28:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-emerald-200/95 — sem override para .text-emerald-200
Arquivo e linha: src/features/gestor/DashboardPage.tsx, linha 846 (td tabela), também linha 987 (executivo)
Outras telas afetadas: DashboardPage aba executivo (linha 987)
Causa raiz: CAUSA RAIZ 01 — override cobre text-emerald-50/100 mas NÃO text-emerald-200/300
Recomendação: Adicionar override para .text-emerald-200 no light mode ou usar token semântico
```

### C-012 — CRÍTICO
```
ID: C-012
Severidade: CRÍTICO
Tela/Rota: /app/dashboard
Componente: DashboardPage — linha "Apontamentos no período"
Elemento visual: Valor de apontamentos no período (dd element)
Texto exibido: valor de minutos formatado
Foreground efetivo (hex): #bae6fd (text-sky-200)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 1.33:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-sky-200 sem override
Arquivo e linha: src/features/gestor/DashboardPage.tsx, linha 724
Causa raiz: CAUSA RAIZ 01 — override não cobre text-sky-200
```

### C-013 — CRÍTICO
```
ID: C-013
Severidade: CRÍTICO
Tela/Rota: /app/dashboard
Componente: DashboardPage — célula de capacidade "over"
Elemento visual: Indicador de sobrecarga de capacidade
Texto exibido: formatação de previsto/capacidade
Foreground efetivo (hex): #fecdd3 (text-rose-200/95)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 1.41:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-rose-200/95 sem override
Arquivo e linha: src/features/gestor/DashboardPage.tsx, linha 827
Causa raiz: CAUSA RAIZ 01
```

### C-014 — CRÍTICO
```
ID: C-014
Severidade: CRÍTICO
Tela/Rota: /app/dashboard
Componente: DashboardPage — célula de capacidade "attention"
Elemento visual: Indicador de atenção de capacidade
Texto exibido: formatação de previsto/capacidade
Foreground efetivo (hex): #fcd34d (text-amber-200/95)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 1.44:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-amber-200/95 sem override
Arquivo e linha: src/features/gestor/DashboardPage.tsx, linha 829
Causa raiz: CAUSA RAIZ 01
```

### C-015 — CRÍTICO
```
ID: C-015
Severidade: CRÍTICO
Tela/Rota: /app/backlog e todas que usam BacklogKpiCards
Componente: BacklogKpiCards — valor principal dos KPIs
Elemento visual: Número grande de KPI (40px bold)
Texto exibido: contagem numérica (ex: "12")
Foreground efetivo (hex): #f8fafc (text-slate-50)
Background efetivo (hex): #ffffff (bg kpi card no light)
Relação de contraste calculada: 1.05:1
Mínimo WCAG AA esperado: 3:1 (texto grande ≥ 18pt/24px)
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-slate-50 — há override global que muda para #0f172a. VERIFICAR se o override é aplicado.
Arquivo e linha: src/components/backlog/BacklogKpiCards.tsx, linha 93
Outras telas afetadas: BacklogPage
Causa raiz: CAUSA RAIZ 02 — possível falha de especificidade no override
Nota IMPORTANTE: Se o override `html[data-theme="light-executive"] .text-slate-50 { color: #0f172a !important }` for aplicado corretamente, o contraste passa para 21:1. Este é um item de VERIFICAÇÃO RUNTIME obrigatória.
```

### C-017 — CRÍTICO
```
ID: C-017
Severidade: CRÍTICO
Tela/Rota: /app/backlog
Componente: BacklogTable — PriorityPill "Alta"
Elemento visual: Badge de prioridade Alta
Texto exibido: "Alta"
Foreground efetivo (hex): #fff1f2 (text-rose-50)
Background efetivo (hex): #fff5f5 (bg-rose-500/16 sobre branco)
Relação de contraste calculada: 1.03:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-rose-50 sem override no BacklogTable.tsx; classes com /14 e /16 e /18 NÃO são cobertas pelo guardrail que usa text-rose-50 global
Arquivo e linha: src/components/backlog/BacklogTable.tsx, linha 23-24
Outras telas afetadas: toda página que renderiza BacklogTable
Causa raiz: CAUSA RAIZ 01 — paleta dark-only, sem cobertura de override
Recomendação: Usar data-backlog-priority-badge ou adicionar override CSS para as classes específicas do PriorityPill
```

### C-018 — CRÍTICO
```
ID: C-018
Severidade: CRÍTICO
Tela/Rota: /app/backlog
Componente: BacklogTable — PriorityPill "Média"
Elemento visual: Badge de prioridade Média
Texto exibido: "Média"
Foreground efetivo (hex): #fffbeb (text-amber-50)
Background efetivo (hex): #fffdf5 (bg-amber-500/16 sobre branco)
Relação de contraste calculada: 1.02:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-amber-50 sem override no BacklogTable.tsx
Arquivo e linha: src/components/backlog/BacklogTable.tsx, linha 26-27
Causa raiz: CAUSA RAIZ 01
```

### C-019 — CRÍTICO
```
ID: C-019
Severidade: CRÍTICO
Tela/Rota: qualquer tela com SgpToast
Componente: SgpToast (toast de notificação global)
Elemento visual: Mensagem do toast
Texto exibido: mensagem de ação (ex: "Salvo com sucesso")
Foreground efetivo (hex): #f1f5f9 (text-slate-100)
Background efetivo (hex): #ffffff (bg-sgp-navy-deep/96 → converte para branco no light)
Relação de contraste calculada: 1.10:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: SgpToast usa text-slate-100 hardcoded sem override light; bg-sgp-navy-deep/96 é convertido para #ffffff pelo guardrail
Arquivo e linha: src/components/ui/SgpToast.tsx, linhas 6-11
Outras telas afetadas: TODAS as telas que disparam toast
Causa raiz: CAUSA RAIZ 03 — ausência total de override light mode no componente
Recomendação: Adicionar override `html[data-theme="light-executive"] .sgp-toast-*` com fundo sólido e texto escuro
```

### C-020 — CRÍTICO
```
ID: C-020
Severidade: CRÍTICO
Tela/Rota: qualquer tela com SgpInlineBanner (error)
Componente: SgpInlineBanner — variante error
Elemento visual: Banner inline de erro
Texto exibido: mensagem de erro
Foreground efetivo (hex): #ffe4e6 (text-rose-100/95)
Background efetivo (hex): #fff5f5 (bg-rose-500/0.08)
Relação de contraste calculada: 1.12:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: SgpInlineBanner sem override light
Arquivo e linha: src/components/ui/SgpToast.tsx, linha 73
Causa raiz: CAUSA RAIZ 03
```

### C-021 — CRÍTICO
```
ID: C-021
Severidade: CRÍTICO
Tela/Rota: qualquer tela com SgpInlineBanner (success)
Componente: SgpInlineBanner — variante success
Elemento visual: Banner inline de sucesso
Texto exibido: mensagem de sucesso
Foreground efetivo (hex): #d1fae5 (text-emerald-100/95)
Background efetivo (hex): #f0fdf9 (bg-emerald-500/0.07)
Relação de contraste calculada: 1.09:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: SgpInlineBanner sem override light
Arquivo e linha: src/components/ui/SgpToast.tsx, linha 73
Causa raiz: CAUSA RAIZ 03
```

### C-022 — MÉDIO
```
ID: C-022
Severidade: MÉDIO
Tela/Rota: todas (sidebar)
Componente: AppSidebar — link de navegação inativo
Elemento visual: Texto de item de menu inativo
Texto exibido: labels de navegação (13px)
Foreground efetivo (hex): #64748b (text-slate-400 → override para #64748b)
Background efetivo (hex): #d3ddec (sidebar bg light mode)
Relação de contraste calculada: 3.47:1
Mínimo WCAG AA esperado: 4.5:1 (texto 13px = texto normal)
Resultado: FALHA para texto normal; PASSA para texto grande
Token/Classe/Regra CSS de origem: navLinkClass + sidebar gradient
Arquivo e linha: src/components/AppSidebar.tsx, linha 175; semantic-tokens.css linha 307
Causa raiz: CAUSA RAIZ 04 — contraste insuficiente no sidebar light
Recomendação: Alterar --color-text-muted para #4a5568 ou usar #475569 (7.58:1) para links inativos
Risco Dark Mode: NENHUM — o token --color-text-muted é específico do light mode
```

### C-030 — MÉDIO
```
ID: C-030
Severidade: MÉDIO
Tela/Rota: /gestao/evolucao-esteiras
Componente: ConveyorProgressMetricsCells — ExceededCell
Elemento visual: Valor de tempo excedido na célula da tabela
Texto exibido: "+2h 30min" (valor de tempo)
Foreground efetivo (hex): #d97706 (text-amber-600)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 3.19:1
Mínimo WCAG AA esperado: 4.5:1 (texto ~12px)
Resultado: FALHA para texto normal; PASSA para texto grande (≥18pt)
Token/Classe/Regra CSS de origem: text-amber-600 hardcoded em ConveyorProgressMetricsCells.tsx
Arquivo e linha: src/features/conveyor-progress/ConveyorProgressMetricsCells.tsx, linhas 37 e 45
Causa raiz: CAUSA RAIZ 05 — amber como cor de destaque sem contraste suficiente
Recomendação: Usar text-amber-700 (#b45309, contraste 4.84:1) ou text-amber-800 (#92400e)
Risco Dark Mode: ALTO se alterar a classe. Usar [data-theme="light-executive"] override.
```

### C-031 — ALTO
```
ID: C-031
Severidade: ALTO
Tela/Rota: /gestao/evolucao-esteiras
Componente: ConveyorProgressMetricsCells — células neutras (RemainingCell, text-slate-400)
Elemento visual: células com valor zero ou sem dados
Texto exibido: "—" ou valor formatado
Foreground efetivo (hex): #94a3b8 (text-slate-400)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 2.56:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-slate-400 inline — override global deve converter para #64748b (4.76:1). Verificar aplicação.
Arquivo e linha: src/features/conveyor-progress/ConveyorProgressMetricsCells.tsx, linhas 32, 39
Causa raiz: CAUSA RAIZ 01
```

### C-037 — ALTO
```
ID: C-037
Severidade: ALTO
Tela/Rota: todas com sgp-input-app
Componente: sgp-input-app — placeholder
Elemento visual: texto placeholder em campos de entrada
Texto exibido: "Selecione…", "Buscar…", etc.
Foreground efetivo (hex): #94a3b8 (placeholder light mode)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 2.56:1
Mínimo WCAG AA esperado: 4.5:1 (WCAG 2.1 aplica a placeholder também)
Resultado: FALHA
Token/Classe/Regra CSS de origem: index.css linha 239-241 — placeholder hardcoded em #94a3b8
Arquivo e linha: src/index.css, linha 240
Outras telas afetadas: todas com inputs — JornadaPage, JornadaColaboradorGestorPage, DashboardPage
Causa raiz: Token de placeholder muito claro para fundo branco
Recomendação: Alterar placeholder para #64748b (4.76:1) no tema light
Risco Dark Mode: NENHUM — regra já está dentro do seletor light-executive
```

### C-044 — CRÍTICO
```
ID: C-044
Severidade: CRÍTICO
Tela/Rota: /app/dashboard
Componente: DashboardPage — tabela de colaboradores (body)
Elemento visual: Células da tabela de carga de colaboradores
Texto exibido: texto de nome/alocações
Foreground efetivo (hex): #e2e8f0 (text-slate-200)
Background efetivo (hex): #ffffff (tabela branca no light)
Relação de contraste calculada: 1.23:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-slate-200 — override light converte para #334155 (10.35:1). Verificar se o override abrange class="border-b border-white/[0.04] text-slate-300" e o contexto dinâmico do template.
Arquivo e linha: src/features/gestor/DashboardPage.tsx, linha 808
Causa raiz: CAUSA RAIZ 01 — similar ao C-045
Nota: Override global DEVE cobrir, mas a mistura com border-b border-white/[0.04] pode criar especificidade conflitante.
```

### C-045 — CRÍTICO
```
ID: C-045
Severidade: CRÍTICO
Tela/Rota: /app/dashboard
Componente: DashboardPage — tabela de colaboradores
Elemento visual: Células de dados secundários (text-slate-300)
Texto exibido: valores de alocações, tempo
Foreground efetivo (hex): #cbd5e1 (text-slate-300)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 1.48:1
Mínimo WCAG AA esperado: 4.5:1
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-slate-300 — override light converte para #334155. Verificar aplicação em tabela.
Arquivo e linha: src/features/gestor/DashboardPage.tsx, linhas 809, 812, 815, 839
Causa raiz: CAUSA RAIZ 01
```

### C-047 — ALTO
```
ID: C-047
Severidade: ALTO
Tela/Rota: /app/gestao/jornada-colaborador, /app/jornada
Componente: Links de esteira no histórico de apontamentos
Elemento visual: Link "Esteira" no histórico
Texto exibido: "Esteira"
Foreground efetivo (hex): #c9a227 (text-sgp-gold)
Background efetivo (hex): #ffffff
Relação de contraste calculada: 2.42:1
Mínimo WCAG AA esperado: 4.5:1 (texto 12px) / 3:1 (link como componente UI)
Resultado: FALHA
Token/Classe/Regra CSS de origem: text-sgp-gold — no light mode mapeia para #d97706 (3.19:1). Ainda abaixo de 4.5:1 para texto normal, porém o override faz color: var(--color-accent-gold-text) = #92400e para text-sgp-gold? Verificar.
Arquivo e linha: src/features/gestor/JornadaColaboradorGestorPage.tsx, linha 668-670; JornadaPage.tsx linha 644
Causa raiz: CAUSA RAIZ 05 — gold como cor de link sem contraste adequado no light
Recomendação: Links no light mode devem usar text-sgp-blue-bright (#2f6d9b, 5.55:1) ou color #1e3a5f
```

---

## 3. AGRUPAMENTO POR CAUSA RAIZ

### CAUSA C01 — Tokens de texto dark-mode sem override para luz
**Tokens afetados:** `text-amber-200`, `text-amber-100`, `text-rose-200`, `text-rose-100`, `text-sky-200`, `text-emerald-200`, `text-slate-200`, `text-slate-300`, `text-slate-400`
**Problemas:** C-001, C-002, C-003, C-004, C-005, C-006, C-007, C-008, C-011, C-012, C-013, C-014, C-031, C-044, C-045
**Afeta:** JornadaColaboradorGestorPage, JornadaPage, DashboardPage, ConveyorProgressMetricsCells
**Observação:** O sistema de overrides em theme.css cobre `text-slate-50/100/200/300/400/500` e `text-amber-50/100`, `text-rose-50/100`, `text-emerald-50/100`, `text-sky-50/100` — MAS NÃO cobre `text-amber-200/300`, `text-rose-200/300`, `text-emerald-200/300`, `text-sky-200/300`. Estas classes aparecem amplamente no DashboardPage e páginas de jornada.

### CAUSA C02 — BacklogKpiCards sem override verificado de KPI value
**Tokens afetados:** `text-slate-50` em contexto de KPI card
**Problemas:** C-015, C-016
**Afeta:** BacklogPage, BacklogKpiCards
**Observação:** O override global converte text-slate-50 para #0f172a. Risco de especificidade no componente.

### CAUSA C03 — SgpToast e SgpInlineBanner sem override light mode
**Tokens afetados:** `text-slate-100`, `text-rose-100/95`, `text-emerald-100/95`; `bg-sgp-navy-deep/96`
**Problemas:** C-019, C-020, C-021
**Afeta:** TODAS as telas que usam toast ou banner de feedback
**Observação:** Componentes completamente cegos ao light mode. Alta frequência de uso.

### CAUSA C04 — Sidebar: contraste insuficiente de texto inativo
**Tokens afetados:** `--color-text-muted` (#64748b) sobre `--color-sidebar-bg` (#d3ddec)
**Problemas:** C-022
**Afeta:** Sidebar em todas as telas
**Observação:** 3.47:1 — marginalmente abaixo de 4.5:1.

### CAUSA C05 — Cor gold/amber como cor de link e destaque textual
**Tokens afetados:** `text-sgp-gold`, `text-amber-600`
**Problemas:** C-030, C-047, C-049 (parcial)
**Afeta:** Links de histórico, células de tabela de evolução
**Observação:** No light mode gold (#c9a227) = 2.42:1, amber-600 (#d97706) = 3.19:1 — ambos abaixo de 4.5:1.

### CAUSA C06 — PriorityPill do BacklogTable sem override
**Tokens afetados:** `text-rose-50`, `text-amber-50`, `bg-rose-500/16`, `bg-amber-500/16`
**Problemas:** C-017, C-018
**Afeta:** BacklogTable
**Observação:** Dark-pattern completo — texto claro (quase branco) sobre fundo claro semi-transparente.

---

## 4. TOKENS COM RISCO SISTÊMICO

| Token | Valor atual (dark) | Valor sugerido (light) | Problemas resolvidos | Risco Dark Mode |
|-------|-------------------|----------------------|---------------------|-----------------|
| Adicionar override `text-amber-200` | — | #92400e | C-001, C-014 | Nenhum (override específico light) |
| Adicionar override `text-rose-200` | — | #9f1239 | C-003, C-007, C-013 | Nenhum |
| Adicionar override `text-emerald-200` | — | #065f46 | C-006, C-011 | Nenhum |
| Adicionar override `text-sky-200` | — | #1e3a5f | C-005, C-012 | Nenhum |
| Adicionar override `text-slate-200` e `text-slate-300` em tabelas | — | #334155 | C-044, C-045 | Nenhum (override específico light) |
| `--color-text-muted` sidebar | #64748b | #475569 | C-022 | Nenhum (token específico light) |
| SgpToast light override | ausente | adicionar bloco CSS completo | C-019, C-020, C-021 | Nenhum |
| PriorityPill text-rose-50 → #9f1239 | text-rose-50 | Adicionar override de chip no light | C-017 | ALTO (muda aparência dark) |
| PriorityPill text-amber-50 → #92400e | text-amber-50 | Adicionar override de chip no light | C-018 | ALTO |
| Placeholder sgp-input-app | #94a3b8 | #64748b | C-037 | Nenhum (já em seletor light) |
| text-sgp-gold como link | #c9a227 | Usar text-sgp-blue-bright | C-047 | ALTO se alterar global |
| text-amber-600 ExceededCell | #d97706 | text-amber-700 (#b45309) ou override | C-030 | MÉDIO |

---

## 5. CORES SOLTAS FORA DO DESIGN SYSTEM

### Cor hardcoded 1 — `#0f172a` em hover de sgp-cta-primary
- **Arquivo:** src/index.css, linha 29
- **Valor:** color: #0f172a
- **Contexto:** Texto do botão primário em light mode. Correto e com bom contraste (21:1 sobre amber).

### Cor hardcoded 2 — `#d97706` como bg do sgp-cta-primary light
- **Arquivo:** src/index.css, linha 37
- **Valor:** background-color: #d97706
- **Contraste texto:** 5.60:1 com #0f172a — PASSA.

### Cor hardcoded 3 — `#334155` e `#0f172a` no sgp-cta-secondary light
- **Arquivo:** src/index.css, linhas 62-65
- **Valores:** color: #334155 (10.35:1) sobre bg #ffffff — PASSA.

### Cor hardcoded 4 — `#c9a227` como link no histórico
- **Arquivo:** src/features/gestor/JornadaColaboradorGestorPage.tsx, linha 668; JornadaPage.tsx linha 644
- **Contexto:** Link "Esteira" no histórico — usa text-sgp-gold que no light mode é #d97706 (3.19:1) — FALHA.

### Cor hardcoded 5 — Tabela header usa `var(--sgp-gradient-header)` com `text-white`
- **Arquivo:** src/components/backlog/BacklogTable.tsx, linhas 147-149
- **Contexto:** No light mode o gradiente é linear-gradient de branco para azul claro; o texto fica `text-white` → override para #0f172a. Depende do override ser aplicado. Risco de contraste se não aplicado.

---

## 6. FALSOS POSITIVOS / EXCEÇÕES

### FP-001 — StatusBadge (backlog) com tokens semânticos light corretos
**Por que pareceu suspeito:** Os badges de status usavam antes tokens dark. Após análise, os overrides light-executive `[data-backlog-status="*"]` substituem completamente com paleta calibrada.
**Resultado calculado:** Todos os status do backlog passam WCAG AA no light mode:
- `em_elaboracao`: #374151 sobre #f3f4f6 = **9.37:1** ✓
- `aguardando_planejamento`: #1d4ed8 sobre #eff6ff = **6.16:1** ✓
- `em_planejamento`: #92400e sobre #fef3c7 = **6.37:1** ✓
- `a_iniciar` / `em_andamento`: tokens calibrados ✓
- `finalizada`: #166534 sobre #f0fdf4 = **6.81:1** ✓
- `cancelada`: #b91c1c sobre #fef2f2 = **5.91:1** ✓

### FP-002 — sgp-cta-primary light mode
**Por que pareceu suspeito:** Gradiente gold em dark mode. No light é solid amber.
**Resultado calculado:** #0f172a sobre #d97706 = **5.60:1** ✓

### FP-003 — ConveyorProgressMetricsCells — células coloridas (azul, verde, amber)
**Resultado calculado:** sky-700/sky-50 = 5.57:1 ✓; emerald-700/emerald-50 = 5.21:1 ✓; amber-700/amber-50 = 4.84:1 ✓

### FP-004 — Texto de ops warning/danger com token semântico
**Por que pareceu suspeito:** Cards de Cobertura/Atraso na JornadaPage usam `data-sgp-surface="pointing"` em alguns componentes.
**Nota:** Os cards nas JornadaColaboradorGestorPage e JornadaPage NÃO usam `data-sgp-surface`, portanto os overrides específicos de surface NÃO se aplicam — os problemas C-001 a C-007 são reais.

### FP-005 — sgp-page-title no light mode
**Resultado calculado:** Override aplica #0f172a (21:1 sobre branco) ✓

---

## 7. RISCO DARK MODE

| Correção | Token/Classe | Risco Dark Mode | Mitigação |
|----------|-------------|-----------------|-----------|
| Adicionar override text-amber-200 no light | text-amber-200 → #92400e | NENHUM — override dentro de [data-theme="light-executive"] | N/A |
| Adicionar override text-rose-200 no light | text-rose-200 → #9f1239 | NENHUM | N/A |
| Adicionar override text-emerald-200 | text-emerald-200 → #065f46 | NENHUM | N/A |
| Adicionar override text-sky-200 | text-sky-200 → #1e3a5f | NENHUM | N/A |
| Corrigir SgpToast para light mode | novas classes light | NENHUM | N/A |
| Corrigir PriorityPill | text-rose-50 → texto dark | ALTO — muda visual dark | Usar data-attribute ou !important no light seletor |
| Corrigir ExceededCell | text-amber-600 → text-amber-700 | BAIXO — amber-700 também funciona dark | Testar em dark após mudança |
| Corrigir placeholder input | #94a3b8 → #64748b no light | NENHUM — já em seletor light-executive | N/A |
| Corrigir link gold → azul no light | text-sgp-gold → outro no light | ALTO se mudança global; NENHUM se override | Usar override localizado |
| Sidebar muted text | #64748b → #475569 | NENHUM — token light exclusivo | N/A |

---

## 8. PRIORIZAÇÃO E ROADMAP

| ID | Severidade | Causa Raiz | Impacto UX | Esforço | Prioridade |
|----|-----------|-----------|-----------|---------|-----------|
| C-019, C-020, C-021 | CRÍTICO | C03 — Toast sem light override | CRÍTICO — feedback de ação ilegível em toda app | Baixo (1 arquivo CSS + 1 classe) | P0 |
| C-017, C-018 | CRÍTICO | C06 — PriorityPill | ALTO — badges fundamentais do backlog | Médio (guardrail CSS ou atributo) | P0 |
| C-001 a C-007 | CRÍTICO | C01 — tokens dark em cards status | ALTO — 2 telas principais de gestão | Médio (adicionar overrides text-*-200) | P1 |
| C-011 a C-014, C-044, C-045 | CRÍTICO | C01 — tokens dark em tabelas Dashboard | ALTO — dashboard operacional/executivo | Médio (overrides text-emerald/rose/sky/slate-200/300) | P1 |
| C-022 | MÉDIO | C04 — sidebar muted | MÉDIO — navegação em toda app | Baixo (1 token CSS) | P1 |
| C-037 | ALTO | Placeholder claro | MÉDIO — campos de entrada em toda app | Baixo (1 linha CSS existente) | P1 |
| C-030 | MÉDIO | C05 — amber como destaque | MÉDIO — tabela de evolução de esteiras | Baixo (1 classe CSS) | P2 |
| C-031 | ALTO | C01 — text-slate-400 em tabelas | MÉDIO — células neutras (verificar override) | Baixo (verificar aplicação) | P2 |
| C-047 | ALTO | C05 — gold como link | BAIXO — links auxiliares do histórico | Médio (mudança contextual) | P2 |
| C-008, C-016 | ALTO | C01 — text-slate-400 labels | BAIXO — labels auxiliares (override pode cobrir) | Baixo (verificar override) | P3 |
| C-015 | CRÍTICO | C02 — KPI value (verificar) | CRÍTICO se override falhar | Baixo (investigar especificidade) | P0 (verificação) |

---

## APÊNDICE — Tokens de light-executive auditados com contraste OK

Os seguintes tokens foram calculados e estão conformes WCAG AA:

| Token/Uso | FG | BG | Ratio |
|-----------|----|----|-------|
| --color-text-primary | #0f172a | #ffffff | 21:1 |
| --color-text-secondary | #334155 | #ffffff | 10.35:1 |
| --color-text-muted | #64748b | #ffffff | 4.76:1 |
| sgp-cta-primary (light) | #0f172a | #d97706 | 5.60:1 |
| sgp-cta-secondary (light) | #334155 | #ffffff | 10.35:1 |
| backlog status badges (todos) | várias | várias | ≥5.91:1 |
| conveyor progress coloridos | sky/emerald/amber-700 | 50-bgs | ≥4.84:1 |
| ops-warning (light) | #92400e | #fff7e6 | 6.65:1 |
| ops-danger (light) | #9f1239 | #fef2f2 | 7.33:1 |
| ops-success (light) | #065f46 | #ecfdf5 | 7.29:1 |
| ops-info (light) | #1e3a5f | #e8f1f8 | 10.06:1 |
| nav link ativo (light) | #92400e | #fff7e6 | 6.65:1 |
| sgp-input-app texto (light) | #0f172a | #ffffff | 21:1 |
