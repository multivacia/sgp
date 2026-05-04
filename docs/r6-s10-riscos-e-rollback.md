# R6 S10 — Riscos conhecidos e rollback manual

Documento de apoio ao **HML controlado** e à decisão de promoção. Não substitui runbook de infraestrutura.

---

## 1. Riscos conhecidos

| # | Risco | Mitigação / notas |
|---|--------|-------------------|
| 1 | **PDF Bravo com layout diferente** do baseline usado em desenvolvimento. | Testar PDFs representativos em HML; ajustar expectativas de parsing sem alterar parser na mesma release sem gate. |
| 2 | **Matriz incompleta ou desatualizada** no HML. | Carregar baseline acordado; alinhar IDs de times/colaboradores aos utilizados nos testes. |
| 3 | Matching **depende da qualidade e cobertura da Matriz**. | Tratar ausência de TASK como caminho “novo item” (ex.: cabo de aço). |
| 4 | Itens **sem TASK correspondente** na Matriz tornam-se **novo item** após confirmação do revisor. | Esperado; não é bug por si só. |
| 5 | **Flags de debug** ligadas aumentam volume de log e ruído (`SGP_DOCUMENT_DRAFT_*`, `CONVEYOR_CREATE_DIAGNOSTICS`). | Manter desligadas em HML contínuo; ligar só em janela de diagnóstico. |
| 6 | **Sem OCR dedicado**: depende da **extração textual** disponível no pipeline (PDF → texto). | PDFs só imagem ou protegidos podem degradar resultado. |
| 7 | **Fallback SQL / permissões**: em cenários extremos, subárvore completa pode não materializar como esperado. | Validar logs de matching e estrutura na esteira criada; escalar se reproduzível. |
| 8 | **HML diverge do local** se Matriz, times e colaboradores diferirem. | Usar checklist HML e mesma “persona” de dados sempre que possível. |

---

## 2. Rollback manual (operacional)

| Ação | Quando |
|------|--------|
| **Não usar** `/app/importar-os` | Suspender temporariamente o fluxo documento até correção ou decisão de negócio. |
| **Criar esteira manualmente** pelo fluxo já existente de composição de esteira | Continuidade operacional sem depender do import PDF. |
| **Apagar esteira criada em teste** | Apenas se política de dados permitir e com autorização; usar soft-delete se aplicável na org. |
| **Desligar ou alterar `DOCUMENT_DRAFT_ADAPTER`** | Bloquear ou redirecionar import no servidor (ex.: `stub` ou política infra) — coordenar com deploy; não é alteração automática neste doc. |
| **Manter pacote/deploy anterior** | Se release conjunta falhar critérios de smoke test — seguir processo de rollback da organização. |
| **Não versionar PDF real** no Git | Reduz risco LGPD e ruído; usar armazenamento controlado. |

---

## 3. Flags de diagnóstico (não deixar ligadas em HML contínuo)

- `SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS=1` — logs/diagnóstico do pipeline.
- `SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES=1` — requer a anterior; apenas não produção típica.
- `CONVEYOR_CREATE_DIAGNOSTICS=1` — logs na criação de esteira (payload/persistidos).

**Regra**: diagnóstico não deve **persistir** texto sensível em metadata operacional nem **impedir** criação por contaminar payload — se observar interferência, rever env e código na versão implantada.

---

## 4. Referências

- Fechamento técnico: `docs/r6-s10-fechamento-tecnico-os-bravo.md`
- Checklist HML: `docs/r6-s10-checklist-hml-os-bravo.md`
- Queries: `docs/r6-s10-queries-validacao-os-bravo.sql`
