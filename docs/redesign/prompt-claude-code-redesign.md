# Prompt para Claude Code — Reformulação de UX das telas do SGP

Cole este prompt no Claude Code, rodando dentro do repo `sgp`, e anexe/cole junto os 4
artifacts (.jsx) e a spec (.md) referenciados abaixo — o próprio Claude Code deve criar a
branch e salvar esses arquivos no repo como primeiro passo (ver "Como trabalhar").

---

## Contexto — leia antes de tocar em qualquer arquivo

A funcionalidade do SGP **já existe e já funciona**. O problema não é o que o sistema faz,
é **como cada tela pede pra ser usada** — jargão interno vazando pra UI (mesa de montagem,
opções/áreas/etapas), fluxos de 2 painéis com drag-and-drop pesado onde um fluxo linear
resolveria, e tabelas genéricas onde a estrutura real do domínio (Esteira → Tarefa → Setor
→ Atividade) já contaria a história sozinha.

**Seu trabalho não é reescrever o backend, nem redesenhar o modelo de dados, nem inventar
funcionalidade nova.** É pegar a lógica que já existe e vestir com uma interação mais
direta — a mesma função, menos fricção. Trate os arquivos abaixo como a especificação de
UX validada com o dono do produto; a estrutura real do código (componentes, serviços,
tipos) é a sua.

## Referências obrigatórias (leia nesta ordem)

1. `CLAUDE.md` — contexto geral do projeto, modelo conceitual, stack
2. `src/styles/semantic-tokens.css` — os 3 temas reais (argos-dark, slate-dark,
   light-executive). Os protótipos usam uma paleta hardcoded só porque rodavam fora do
   projeto; aqui você usa os tokens de verdade, não reintroduz cores soltas.
3. `docs/redesign/sgp-prototipo.jsx` — Esteira (dashboard, trilho, apontamento, kiosk) +
   wizard "Nova Esteira a partir da Matriz" (4 passos) + sequência priorizada de
   colaboradores por atividade
4. `docs/redesign/sgp-admin.jsx` — Usuários, Permissões (RBAC), Auditoria
5. `docs/redesign/sgp-matriz.jsx` — Lista de matrizes + wizard de criação/edição (3 passos)
   com sequência de colaboradores por atividade
6. `docs/redesign/sgp-planejamento.jsx` — Backlog operacional + Agenda Semanal com motor
   de sugestão de planejamento
7. `docs/redesign/spec-sugestao-planejamento.md` — especificação normativa do algoritmo de
   sugestão. Implemente exatamente como descrito, não aproxime.

**Os `.jsx` são protótipos de validação de interação, não código para copiar.** Foram
escritos fora do projeto, com estilo inline e sem os componentes reais (`PageCanvas`,
`SgpToast`, `SgpContextActionsMenu`, etc.). Reimplemente a estrutura de tela e o fluxo de
interação usando os componentes e padrões que já existem no projeto real.

## Diferenças a corrigir na reimplementação (o protótipo tinha limitação de sandbox)

- **Drag-and-drop:** o protótipo usa HTML5 nativo porque rodava isolado, sem `@dnd-kit`
  disponível. O projeto real já usa `@dnd-kit` — use-o de verdade, com `PointerSensor` e
  `TouchSensor` configurados, pra resolver o mesmo problema de usabilidade que motivou a
  mudança (arrastar não funciona em touch) sem abrir mão de drag-and-drop no desktop.
  Mantenha como alternativa o fluxo de toque (selecionar → tocar no destino) para
  paridade total em touch, já que essa foi a correção pedida na validação.
- **Cores:** troque toda cor hardcoded pelos tokens de `semantic-tokens.css` reais.
- **Dados mock:** troque os nomes inventados (Sedan Premium, Val/Bruno/Edu/Marli/Sula)
  pelas matrizes e colaboradores reais que já existem em `mocks/` ou nos seeds/fixtures
  de teste do projeto. Não invente dado novo onde já existe dado real disponível.

## Escopo desta tarefa

- [ ] Esteira: dashboard, trilho, apontamento, kiosk, wizard "Nova Esteira a partir da Matriz"
- [ ] Admin: Usuários, Permissões (RBAC), Auditoria
- [ ] Matriz de operação: lista + wizard de criação/edição, com sequência de colaboradores
- [ ] Planejamento: Backlog + Agenda Semanal, com motor de sugestão (spec anexa)
- [ ] Sequência de colaboradores como sub-recurso de Atividade, herdada
      Matriz → Esteira → revisável no Planejamento (mesma referência, não cópia paralela)

Fora de escopo — não toque: qualquer endpoint novo em `server/`, qualquer migration,
qualquer mudança de schema. Se algo do escopo acima genuinamente exigir mudança de
backend, **pare e relate** em vez de implementar — isso muda a estimativa e precisa de
decisão humana antes de continuar.

## Regras de branch e permissão — inegociável

1. Primeiro passo da sessão, sem exceção: criar e mudar para uma branch nova a partir
   da `develop`: `git checkout -b feature/redesign-ux-prototipos`. Só depois disso
   qualquer arquivo é salvo ou editado — inclusive os de referência do passo 2 abaixo.
2. **Nunca** dê `checkout`, `merge`, `push`, `commit --amend` ou qualquer escrita nas
   branches `main`, `develop` ou `homol`. Leitura é permitida (ex.: `git diff develop`
   pra conferir o que mudou), escrita não.
3. **Não edite nada dentro de `server/`.** Leitura livre (pra entender tipos e contratos
   de API existentes), zero escrita.
4. Todo commit fica só na branch nova. Não dar push a menos que eu peça explicitamente.
5. Se em algum momento uma ação exigir sair desses limites, pare e pergunte antes de
   prosseguir — não assuma que está implícito.

## Como trabalhar

1. Crie a branch nova (regra abaixo) **antes de qualquer outra ação**.
2. Salve cada um dos 4 artifacts e a spec anexados a este prompt em `docs/redesign/`,
   com os nomes exatos referenciados acima (`sgp-prototipo.jsx`, `sgp-admin.jsx`,
   `sgp-matriz.jsx`, `sgp-planejamento.jsx`, `spec-sugestao-planejamento.md`). Isso é
   commit próprio, só de material de referência — antes de tocar em qualquer código
   de produto.
3. Leia as referências obrigatórias na ordem listada.
4. **Entre em Plan Mode antes de escrever qualquer código de produto.** Nada de
   `Edit`/`Write`/`Bash` de implementação nesta etapa — só leitura e produção do plano.
   O plano deve, para cada item do escopo:
   - listar os arquivos/componentes reais que serão criados ou alterados
   - dizer qual componente/padrão existente no projeto será reaproveitado (`PageCanvas`,
     `SgpToast`, `apiService`/`mockService`, etc.) em vez de criar algo novo equivalente
   - apontar explicitamente qualquer ponto onde o protótipo é ambíguo ou onde você
     precisou tomar uma decisão de design não coberta pelos artifacts — pergunte antes
     de assumir, não resolva a ambiguidade sozinho no plano
   - para o motor de sugestão (Planejamento): confirmar que a leitura da spec
     `spec-sugestao-planejamento.md` foi completa antes de propor a estrutura de dados
   Apresente o plano e **pare — não execute nada até eu aprovar.**
5. Só depois de eu aprovar o plano: implementar item por item, na ordem do plano
   aprovado → rodar lint/typecheck/testes existentes relevantes → seguir para o
   próximo. Não acumule tudo pra validar no final.
6. Se durante a execução algo divergir do plano aprovado (complicação inesperada,
   arquivo que não existia como o plano assumia, etc.), **pare e volte pro Plan Mode**
   em vez de improvisar uma solução fora do que foi combinado.
7. Ao final, um resumo do que foi feito, o que ficou de fora e por quê, e qualquer
   ponto onde você teve que tomar uma decisão de design não coberta pelos protótipos.

## Definition of Done

- [ ] Plano apresentado em Plan Mode e aprovado antes de qualquer código de produto
- [ ] Branch nova, zero diffs em `server/`, zero commits em main/develop/homol
- [ ] As 4 áreas do escopo implementadas com componentes reais do projeto (não JSX solto)
- [ ] 3 temas reais aplicados via `semantic-tokens.css`, sem cor hardcoded
- [ ] Dados mock reais do projeto, não os nomes inventados dos protótipos
- [ ] Drag-and-drop da Agenda Semanal funciona em mouse E em toque
- [ ] Motor de sugestão implementado conforme a spec anexa: determinístico, nunca
      commit automático, sempre com motivo explicável, sem memória de rejeição
- [ ] Sequência de colaboradores editável nos 3 pontos (Matriz, Esteira, Planejamento),
      mesma referência de dado nos três
- [ ] Lint, typecheck e testes existentes passam
