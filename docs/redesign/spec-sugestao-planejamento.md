# Especificação — Sugestão de Planejamento Semanal (v1)

**Status:** proposta, não implementada
**Escopo:** heurística de apoio à decisão para a Agenda Semanal — nunca commit automático

---

## 1. Objetivo

Dado o backlog de atividades não alocadas de uma ou mais esteiras, propor uma alocação
(colaborador × dia) que o gestor possa **revisar, editar e confirmar** — não substituir o
julgamento do gestor, só poupar o trabalho de montagem manual quando o caso é simples.

## 2. Fora de escopo (v1 — explícito para não crescer sozinho)

- Otimização global entre múltiplas esteiras simultaneamente (minimizar atraso do pátio todo)
- Rebalanceamento proativo entre times sem gatilho do gestor
- Simulação "e se" / cenários hipotéticos
- Qualquer bloqueio automático de execução por sequência — sequência aqui é **preferência
  forte**, nunca trava (confirmado: `order_index` hoje é informativo, não bloqueante)
- Aprendizado com histórico (heurística é determinística e auditável, não é ML)

Se algum desses vier a ser necessário, é uma v2 com especificação própria — não expandir
esta heurística por dentro.

## 3. Dados de entrada (todos já existentes — nada novo no modelo)

| Dado | Origem | Uso na heurística |
|---|---|---|
| `order_index` da Atividade | Matriz / Esteira | desempate de prioridade dentro da esteira |
| `planned_minutes` da Atividade | Matriz (herdado) / apontamento | tamanho do bloco a alocar |
| Prioridade e prazo da Esteira | Backlog | ordena qual esteira é atendida primeiro |
| Capacidade diária por colaborador | `planningBoardHelpers` (já existe) | teto de alocação por dia |
| Alocações já confirmadas na semana | Agenda Semanal (estado atual) | ponto de partida — nunca é ignorado |
| Time/papel do colaborador | Colaboradores/Equipes | pool de candidatos por setor da atividade |

**Sem dado confiável de `planned_minutes`, a heurística não deve rodar para aquela
atividade** — melhor deixar em aberto do que sugerir com base em estimativa ruim
(ver risco §6.1).

## 4. Regras do algoritmo (heurística gulosa, determinística)

```
entrada: lista de atividades não alocadas (de 1+ esteiras selecionadas pelo gestor)

1. ORDENAR atividades por:
   a) prioridade da esteira (Urgente > Alta > Média > Baixa)
   b) prazo da esteira (mais próximo primeiro)
   c) order_index dentro da esteira (desempate — preferência de sequência)

2. PARA CADA atividade, na ordem acima:
   a. montar pool de candidatos = colaboradores cujo time cobre o setor da atividade
   b. para cada candidato, calcular capacidade_livre(dia) = capacidade_diária - já_alocado(dia)
      considerando TODA a semana corrente, dia a dia, a partir de hoje
   c. escolher o par (candidato, dia) com:
      - capacidade_livre(dia) >= planned_minutes da atividade
      - dentre os elegíveis, o de MAIOR capacidade_livre no dia mais cedo possível
        (prioriza terminar cedo, não sobrecarregar quem já está cheio)
   d. se NENHUM candidato/dia comporta a atividade inteira na semana:
      marcar como "não coube na semana" — não fragmentar atividade, não estourar
      capacidade silenciosamente
   e. registrar o motivo da escolha (ver §5) e reservar a capacidade para as
      próximas iterações do loop

3. RETORNAR lista de propostas (atividade → colaborador → dia → motivo)
   + lista de atividades que não couberam, com o motivo
```

Complexidade: O(n_atividades × n_candidatos × n_dias) — trivial para a escala atual
(~5 colaboradores, poucas esteiras simultâneas). Não precisa de solver.

## 5. Explicabilidade (obrigatório, não opcional)

Cada sugestão carrega um motivo curto e verificável, por exemplo:

> "Marli — terça-feira: tem 3h10 livres, é do time de Costura, e a atividade anterior
> da esteira termina segunda."

Se o gestor não consegue entender *por quê* em uma frase, a sugestão não deve ser aceita
por padrão — ela existe pra ser conferida, não pra ser um oráculo.

## 6. Riscos e mitigação

### 6.1 Qualidade do dado de entrada (risco principal)
`planned_minutes` mal calibrado → sugestão sistematicamente errada, mais rápido de
perder a confiança do gestor do que ganhar produtividade.
**Mitigação:** heurística roda só quando a atividade tem tempo planejado vindo da Matriz
(não estimado no ato); atividades sem essa origem ficam de fora com aviso explícito.

### 6.2 Falsa precisão / confiança cega
Sugestão parece autoritativa mesmo ignorando fatores reais (qualidade do colaborador
na tarefa específica, imprevisto do dia, urgência que chegou depois).
**Mitigação:** nunca commit automático — toda sugestão é um rascunho editável até o
gestor confirmar, célula por célula, igual ao fluxo manual já existente.

### 6.3 Instabilidade / plano "chacoalhando"
Recalcular do zero a cada mudança pequena faz alocações já confirmadas se moverem
sem necessidade, e o gestor perde confiança na ferramenta.
**Mitigação:** alocações já confirmadas pelo gestor são **imutáveis para o algoritmo**
— ele só preenche o que ainda está em aberto, nunca desfaz decisão humana.

### 6.4 Sequência tratada como se fosse trava
Mesmo sendo soft no sistema, ignorar a ordem por completo gera sugestões que parecem
erradas mesmo sendo tecnicamente válidas (ex.: sugerir Costura antes de Funilaria acabar).
**Mitigação:** `order_index` entra como critério de ordenação forte (§4.1c), não é
ignorado só porque tem liberdade técnica para isso.

## 7. Critério de validação antes de confiar (pré-produção)

Rodar a heurística contra 3–5 esteiras já finalizadas (dado real, não hipotético) e
comparar a alocação sugerida com o que o gestor de fato decidiu na época. Não é
sobre acertar 100% — é sobre a sugestão fazer sentido operacional pra quem conhece
o chão de fábrica. Se o gestor olhar e disser "isso não bate", o problema é a regra,
não a UI.

## 8. Critério de aceite da v1

- [ ] Sugestão só aparece para atividades com `planned_minutes` de origem confiável
- [ ] Nenhuma alocação confirmada é sobrescrita sem ação explícita do gestor
- [ ] Toda sugestão exibe o motivo em uma frase
- [ ] Atividades que não couberam na semana aparecem com motivo, não somem
- [ ] Validado contra pelo menos 3 esteiras históricas antes de ir ao ar

## 9. Adendo — sequência priorizada de colaboradores (peso por equipe)

Extensão ao modelo original: dentro de um setor, colaboradores não são intercambiáveis
com peso igual. Cada atividade carrega uma **sequência ordenada de colaboradores
preferenciais** (posição 1 = mais indicado), não um responsável único nem um pool plano.

**Origem única, editável em 3 pontos — nunca cópia paralela:**

```
Matriz (atividade)  →  Esteira (herda ao criar, editável)  →  Planejamento semanal (editável antes de sugerir)
```

A sequência é sempre a mesma referência — revisar num ponto reflete nos demais a partir
dali. Não existe "override temporário só daquela semana" desacoplado do dado principal;
simplicidade > flexibilidade não pedida.

Um colaborador pode ter posições diferentes em sequências de setores diferentes
(ex.: 1º em Funilaria, 3º em Montagem) — o peso é por par (atividade/setor, colaborador),
não um atributo global da pessoa.

**Impacto no algoritmo (§4):** o passo 2b/2c passa a considerar, entre os candidatos com
capacidade suficiente, o de **melhor posição na sequência primeiro**, e só usa capacidade
livre como desempate entre colaboradores de mesma posição (raro) ou quando o 1º da
sequência não tem capacidade na semana — nesse caso desce pra 2º, 3º etc., e o motivo
exibido (§5) deve dizer isso explicitamente (ex.: *"Sula — Quarta: 1ª opção (Marli) sem
capacidade esta semana, Sula é a 2ª do setor de Costura."*).

## 10. Determinismo e o que fazer com rejeição (v1)

A heurística é **determinística por princípio**, não só por consequência do algoritmo
guloso: mesma entrada (backlog + alocações confirmadas + sequências) sempre produz a
mesma sugestão. Isso é o que torna a sugestão auditável ("por que sugeriu isso?" tem
resposta reproduzível) e o critério de validação do §7 sequer faz sentido sem essa
garantia. Se algum dia a ideia de "ver uma alternativa" aparecer, a resposta certa é
**estratégias nomeadas e determinísticas** (ex.: "priorizar prazo" vs. "equilibrar
carga do time"), nunca aleatoriedade — aleatoriedade dá uma resposta diferente sem
motivo; estratégia nomeada dá com motivo.

**Rejeição não tem memória — nem de sessão, nem persistente.** Se o gestor rejeita uma
sugestão e roda `gerarSugestoes()` de novo sem mudar nada, ela pode se repetir; isso
continua sendo determinístico, só que inconveniente. A correção esperada **não é** o
algoritmo aprender uma exclusão — é o gestor **revisar a sequência do setor**, que é o
dado real por trás da decisão. Rejeitar é sinal de que a sequência armazenada não reflete
a realidade daquele momento; o ajuste é ali, não numa lista de exclusão paralela e efêmera.

Se isso se mostrar insuficiente na prática (rejeição por uma exceção pontual, sem
querer mexer na sequência-padrão do setor), é sinal de que falta um terceiro nível de
override mais local que o da esteira — hipótese de v2, fora de escopo aqui.


