# Changelog — Catálogo de justificativas no apontamento

## Entrega

Integração do catálogo de **Justificativas Operacionais** nos fluxos de apontamento que exigem justificativa (fora de sequência, exceção de alocação).

### Incluído

- `JustificationSelect` sempre visível no `QuickTimeEntryDrawer` (opcional em apontamento normal; obrigatório em exceção/OOS)
- `QuickTimeEntryDrawer`, `KioskActivityCard`, `ProductionTimeEntryDialog`, `EsteiraDetalhePage` (conclusão OOS)
- Backend: `justificationId` no PATCH de conclusão de step; mensagem 422 padronizada
- Validação: `requiresComplement = true` exige complemento; `false` oculta o campo

### Fora do escopo desta entrega

- `OperationalPlanningPage` — conclusão fora de sequência ainda usa prompt/texto livre
- `WeeklyAgendaPage` — conclusão fora de sequência ainda usa prompt/texto livre
- Filtro por `usageScope` na listagem do catálogo (campo existe no banco, sem regra aplicada)

### Notas técnicas

- Modelo de complemento: apenas boolean `requiresComplement` (sem distinção opcional/obrigatório/não exigido além disso)
- Fallback para texto livre somente quando catálogo vazio ou erro de carregamento
- Retrocompatível com apontamentos legados via `outOfSequenceJustification` / texto livre
