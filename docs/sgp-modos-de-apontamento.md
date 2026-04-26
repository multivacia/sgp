# SGP — Modos de apontamento

Documento de produto · alinhado ao [princípio operacional mandatório](./sgp-principio-operacional-mandatorio.md) e às [decisões práticas de UX](./sgp-decisoes-praticas-de-ux.md).

---

## Resumo

O SGP suporta **dois modos oficiais** de registrar tempo e progresso sobre uma **atividade**:

1. **Execução guiada** — o colaborador inicia, pausa e conclui no sistema, com timer (ou equivalente) acompanhando a sessão.
2. **Lançamento manual de horas** — o colaborador informa quanto tempo já trabalhou, sem depender de ter “iniciado” no sistema naquele momento.

Ambos são válidos no produto. Nenhum deles é atalho ou “gambiarra”: são respostas a situações reais do chão de fábrica.

---

## Por que existem dois modos?

- **Operação não é linear:** nem sempre dá para abrir o sistema antes de começar a mexer na peça, no veículo ou na linha. Exigir só o modo guiado gera **atrito** e dados mentirosos (tempo estimado no ar).
- **Confiança e ritmo:** o modo guiado reforça presença e foco quando o contexto permite. O manual respeita quem já trabalhou e só precisa **consolidar** o que fez.
- **Redução de atrito:** duas entradas oficiais evitam que o colaborador invente atalhos paralelos (papel, grupo de mensagem) para “não ter que mentir no sistema”.

---

## Quando cada modo faz sentido

| Situação | Modo típico |
|----------|----------------|
| Trabalho contínuo na frente do sistema, pausas claras | Execução guiada |
| Trabalho já feito ontem ou fora da mesa; precisa só registrar | Lançamento manual |
| Interrupções constantes (andar na oficina) | Muitas vezes manual ou sessões guiadas curtas |
| Política da empresa exige “timer” para certas ordens | Guiado quando obrigatório; manual onde a regra permitir |

O sistema deve deixar explícito **qual modo está ativo**, sem misturar tempos de forma confusa (por exemplo, avisar ao mudar de modo quando há sessão em andamento).

---

## Por que lançamento manual não é gambiarra

- É **reconhecimento explícito** de que a execução acontece no mundo físico primeiro e no digital depois.
- Evita que o SGP vire um **simulador de presença** em vez de um registro útil de esforço.
- Mantém adesão: quem prefere honestidade a “clicar iniciar antes de sujar as mãos” continua dentro do produto, não na planilha paralela.

---

## Conversa com o princípio mandatório do produto

O princípio mandatório exige que o colaborador **aponte com facilidade** e sem sentir fiscalização punitiva. Ter dois modos:

- **Aumenta a chance de dados reais** entrarem no sistema.
- **Respeita o ritmo** da oficina sem forçar um único desenho comportamental.
- Mantém o foco na **atividade** como unidade de trabalho — o que importa é o registro coerente no contexto da esteira e da tarefa, não a tecnologia do cronômetro em si.

---

## Evolução futura (não escopo deste doc)

APIs, regras de negócio (ex.: tolerância entre soma manual e guiado) e auditoria podem endurecer ou flexibilizar cada modo por cliente. A decisão de produto aqui é: **dois modos oficiais, complementares, com linguagem clara na interface.**
