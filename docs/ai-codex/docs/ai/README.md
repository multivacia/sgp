# IA Operacional — SGP+ Web

Documentação neutra dos agentes, playbooks, skills e templates usados no SGP+ Web.

## Estrutura

```text
docs/ai/
  agents/       documentação dos papéis
  playbooks/    fluxos de trabalho
  skills/       conhecimento operacional por domínio
  templates/    modelos de relatórios/specs
```

## Regra principal

Somente o papel de implementação altera código.

Contexto, impacto, spec e revisão devem trabalhar com leitura, análise e validação.

## Anti-zoológico

Não criar agente novo para cada problema.
Antes de criar qualquer novo papel, pergunte:

1. Esse papel tem responsabilidade diferente dos atuais?
2. Ele reduz risco real?
3. Ele será reutilizado em mais de uma entrega?
4. Ele tem saída verificável?

Se a resposta for não, use um agente existente ou uma skill.
