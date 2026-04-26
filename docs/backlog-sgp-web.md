# Backlog geral do SGP+ Web

## P0 — curto prazo / alto valor

### 1. Governança de acesso

- Reset administrativo de senha
- Forçar troca de senha por admin com UX melhor
- Tela/menu de troca voluntária de senha para o usuário logado
- Aplicar a migration `0011` em todos os ambientes
- Resolver manualmente os casos ambíguos de `collaborator_id`
- Endurecer/restringir o que ainda estiver público demais (GET `/roles`, integrações antigas, etc.)

### 2. Auditoria administrativa

Log de:

- Criação/edição de usuário
- Ativação/inativação
- Soft delete / restore
- Força de troca de senha
- Vínculo/desvínculo usuário ↔ colaborador

Consulta simples dessa trilha depois.

### 3. Operação real ainda a evoluir

- Apontamento em nome de outro colaborador (perfil gestor/admin)
- Remoção gerencial de apontamento
- Eventual evolução de `entry_mode`
- Melhorar UX do apontamento para casos administrativos

---

## P1 — próximo bloco importante

### 4. RBAC mais fino

Hoje a governança está boa, mas ainda grossa demais em alguns pontos.

**Backlog:**

- Permissões por ação
- Não depender só de ADMIN / GESTOR
- Matriz tipo:
  - Ver
  - Criar
  - Editar
  - Ativar/inativar
  - Soft delete
  - Restaurar
  - Resetar senha
  - Administrar governança

### 5. Administração — acabamento

- Paginação real em Utilizadores / Colaboradores
- Filtros mais fortes
- Persistência de filtros
- Deep-link ainda melhor entre telas administrativas
- Abrir o registro exato mesmo com filtros mais restritivos
- Refinar UX de criação/edição

### 6. Integridade e migrations

- Melhorar o processo de migrations
- Parar de depender de migrate-file manual como solução de longo prazo
- Fluxo incremental mais seguro para DEV/HML/PRD
- Documentação operacional mais forte de rollout

---

## P1 — produto / operação

### 7. Backlog / Esteiras / Navegação

- Filtros mais fortes na tela de esteiras
- Deep-links melhores entre:
  - Dashboard
  - Backlog
  - Detalhe da esteira
  - Eventualmente abrir direto no STEP crítico
- Refinar recortes temporais e filtros compostos

### 8. Jornada gerencial

- Visão de gestão por colaborador mais forte
- Histórico do colaborador
- Leitura de carga / risco / execução
- Eventual evolução da Jornada do Colaborador além de “Minhas Atividades”

---

## P2 — dashboards e acabamento fino

### 9. Dashboards — melhorias opcionais

Funcionalmente estão fechados, mas ainda cabem evoluções:

- Visualizer de bundle
- E2E de drill-down
- Otimização fina de chunks
- Refino pixel-perfect do skeleton
- Tooltips/legendas mais ricos
- Filtros adicionais no gerencial
- Eventual drill-down mais profundo

### 10. Semântica avançada de indicadores

Mesmo com o “previsto canônico” resolvido, ainda existe backlog de inteligência:

- Eficiência/produtividade com definição sólida
- Gargalos por área/step
- Recortes temporais mais ricos
- Análises por colaborador com mais precisão

---

## P2 — segurança e robustez

### 11. Segurança evolutiva

- Lockout real por tentativas
- Contador de falhas de login
- Fluxo de reset por token/e-mail, se fizer sentido
- Revogação de sessão mais forte
- Rechecagem de conta ativa no middleware/JWT
- Endurecimento de endpoints auxiliares

### 12. Integrações externas

- Revisar consumidores externos das rotas endurecidas
- Documentar contrato novo
- Adaptar integrações antigas que usavam endpoints públicos sem auth

---

## Backlog técnico transversal

### Testes

- Integração para mais rotas administrativas
- Testes de auth/governança
- Testes de reset de senha
- Testes de vínculo usuário ↔ colaborador
- E2E dos fluxos críticos

### Performance

- Revisar queries grandes
- Monitorar dashboards em base maior
- Índices/materializações se crescer
- Paginação/virtualização nas telas administrativas

### UX

- Loading/empty/error states mais caprichados
- Mensagens mais consistentes
- Microcopy refinado
- Navegação mais fluida entre módulos

---

## Sugestão de ordem (empilhamento)

### Sprint curta 1

- Reset administrativo de senha
- Tela/menu de troca voluntária de senha
- Aplicar `0011` e resolver pendências de vínculo
- Revisar endpoints/integrações endurecidas

### Sprint curta 2

- Auditoria administrativa básica
- Paginação e refinamento de Utilizadores/Colaboradores
- Hardening de sessão/JWT

### Sprint média 3

- RBAC mais fino
- Ações gerenciais em apontamento
- Refinamento de navegação e esteiras

---

## Resumo executivo

Hoje o backlog geral está concentrado em **4 macrofrentes**:

1. **Governança de acesso**
2. **Hardening / segurança / migrations**
3. **Refino operacional e gerencial**
4. **Acabamento e inteligência dos dashboards**
