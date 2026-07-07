# AI Operating Layer — SGP+ Web

Esta pasta contém a camada neutra de instruções operacionais de IA do SGP+ Web.

Ela não pertence ao Claude, Codex, Cursor ou qualquer ferramenta específica.

## Conceitos

- **Agents** definem papéis.
- **Skills** definem capacidades por domínio.
- **Playbooks** definem fluxos de trabalho.
- **Templates** definem formatos de saída.

## Regra principal

Somente o agente implementador pode alterar código, e apenas com escopo fechado.

Agentes de análise, contexto, especificação e teste não devem alterar arquivos.

## Regra anti-zoológico

Todo Markdown nasce culpado até provar utilidade.

Um arquivo só deve existir se tiver:

- objetivo claro;
- quando usar;
- quando não usar;
- entrada esperada;
- saída esperada;
- relação com demanda real do SGP+.

Se não for usado por 60 dias e ninguém souber explicar sua função, deve ser arquivado ou removido.

## Política de uso

Para cada demanda relevante:

1. Ler contexto.
2. Analisar impacto.
3. Escrever especificação curta.
4. Implementar com escopo fechado.
5. Revisar testes e regressão.
6. Aprovar humanamente.

A IA acelera o processo, mas não substitui arquitetura, critério, teste ou rastreabilidade.
