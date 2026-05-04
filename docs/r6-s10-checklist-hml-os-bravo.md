# R6 S10 — Checklist HML: OS Bravo por documento

Checklist para **homologação controlada** no ambiente HML. Marcar cada linha e registar resultado final na secção 15.

---

## Pré-condições

- [ ] Banco HML com **Matriz operacional** carregada e consistente com o cenário de teste.
- [ ] **Colaboradores** e **times** existentes e utilizáveis nos matches esperados.
- [ ] Utilizador com permissão **`conveyors.create`** (e demais RBAC necessários à navegação).
- [ ] `DOCUMENT_DRAFT_ADAPTER=local` no servidor HML (ou política explícita acordada com infra).
- [ ] **Flags de debug desligadas** por padrão (`SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS=0`, `SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES=0`, `CONVEYOR_CREATE_DIAGNOSTICS` não definido ou `0` em HML contínuo).
- [ ] PDF Bravo **real** preparado para teste, **fora do Git** (não versionar PDF sensível).
- [ ] Número da OS / identificador do teste acordado para rastreio.

---

## Fluxo de validação

### 1. Login
- [ ] Autenticação com utilizador de teste HML.

### 2. Navegação
- [ ] Aceder a **`/app/importar-os`**.

### 3. Upload
- [ ] Selecionar PDF Bravo controlado.
- [ ] Aguardar processamento sem erro bloqueante.

### 4. Modo / banner
- [ ] Validar indicador de **modo local / adapter** conforme política HML (banner ou cópia de ambiente esperada).

### 5. Dados básicos (ajustar ao combinado para HML)
- [ ] Nome da esteira alinhado ao **número OS**, sem prefixo indesejado.
- [ ] Cliente conforme combinado.
- [ ] Veículo / modelo.
- [ ] Placa conforme política (Bravo pode omitir em alguns modos).
- [ ] Modelo/versão vazio **se** for o esperado para o PDF de teste.
- [ ] Prazo vazio **se** esperado.
- [ ] Observações vazias **se** esperado.

### 6. Revisão — conteúdo protegido
- [ ] Dados financeiros/sensíveis **removidos** ou não apresentados como linhas operacionais.
- [ ] Serviços operacionais extraídos de forma inteligível.
- [ ] Peças: **não** como lista operacional detalhada; apenas mensagem agregada se aplicável.
- [ ] Sem valores monetários explícitos nas linhas de serviço apresentadas ao revisor.
- [ ] Sem CPF/CNPJ, telefone, e-mail, endereço, chassi indevido no texto que segue para criação.

### 7. Matching
- [ ] TASKs macro reaproveitadas quando existirem na Matriz.
- [ ] ACTIVITY folha quando aplicável ao cenário.
- [ ] **Cabo de aço** (ou equivalente): tratado como **item novo** se não houver TASK correspondente — conforme decisão de revisão.

### 8. Confirmação de decisões
- [ ] Todas as decisões obrigatórias confirmadas (similares / novos / ignorados conforme modelo de revisão).

### 9. Criação da esteira
- [ ] **Criar esteira** sem erro; mensagem de sucesso ou redirecionamento esperado.

### 10. Abertura
- [ ] Abrir esteira criada (detalhe) e verificar carregamento.

### 11. Estrutura persistida
- [ ] Hierarquia **OPTION** (tarefa) → **AREA** (setor) → **STEP** (atividade).
- [ ] **Sem pseudo-rollup**: não deve existir área “Área”/placeholder com STEP igual ao nome da TASK com minutos agregados **após** as guardas R6.
- [ ] Tempos coerentes (soma das folhas, sem duplicação por rollup).
- [ ] **Times e colaboradores** nas etapas esperadas.

### 12. Queries SQL
- [ ] Executar scripts em `docs/r6-s10-queries-validacao-os-bravo.sql` (ajustar nome da esteira/OS).
- [ ] Pseudo-rollup: **zero linhas**.
- [ ] Padrões financeiros/LGPD em nomes operacionais: **zero linhas** (ou justificar excepção documental).

### 13. Auditoria
- [ ] `metadata_json` na esteira contém `documentReviewAudit` quando aplicável.
- [ ] Schema `schemaVersion`, `summary`, `decisions` presentes.
- [ ] Sem campos de cliente/placa/texto bruto/candidatos debug na auditoria persistida.

### 14. Ausência de dados proibidos
- [ ] Confirmado por revisão manual + queries que não há vazamento de padrões proibidos nas strings operacionais relevantes.

### 15. Registo do resultado

| Campo | Preencher |
|-------|-----------|
| Data | |
| Responsável | |
| Ambiente HML | |
| Versão / commit | |
| PDF usado (referência interna, não colar dados sensíveis) | |
| **Resultado** | ☐ Aprovado &nbsp; ☐ Aprovado com ressalvas &nbsp; ☐ Reprovado |
| Ressalvas / bugs | |
| Evidências (links internos, IDs de esteira) | |

---

## Critério de “pronto para produção”

Este checklist **não** substitui gate de negócio. Aprovação final depende do **comité de release** e da política da organização.
