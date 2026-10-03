# Fonte do manual do SGP+

Esta pasta contém **dois artefatos distintos**, com funções que não se misturam.

## `MANUAL_USUARIO_SGP.md` — manual do usuário

**Fonte canônica do manual destinado ao usuário final.**

- Escrito em linguagem de operação: onde entrar, o que fazer, o que esperar e o que fazer quando algo é bloqueado.
- Público: colaboradores, gestores e administradores que **usam** o SGP+.
- Não expõe nomes de arquivo, parâmetros internos, nomes de tabela ou códigos de estado como vocabulário de usuário. Quando um termo técnico ainda aparece na interface, o manual o traduz e o declara como legado.
- **HTML e PDF devem ser derivados deste arquivo.**
- Capítulos marcados com `> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]` contêm apenas os tópicos a cobrir e não devem ser publicados.

## `MANUAL_FUNCIONAL_SGP.md` — matriz técnica

**Fonte funcional auditável contra o código.**

- Preserva identificadores de regra (`CIC-*`, `ATI-*`, `APO-*`, …), situações persistidas, mensagens literais, evidências em arquivos, pontos pendentes de decisão (`VAL-*`) e a matriz de rastreabilidade técnica.
- Serve para reconferir comportamento contra o código e para fundamentar o manual do usuário.
- Não precisa ser agradável ao usuário final e **não deve ser convertido em tutorial passo a passo**.
- Suas avaliações de "Cobertura atual" referem-se aos HTML derivados já existentes (`docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`), **não** a ela mesma nem ao manual do usuário.

## Como os dois se relacionam

```text
código (fonte da verdade)
  → MANUAL_FUNCIONAL_SGP.md   (matriz técnica: regra, evidência, rastreabilidade)
      → MANUAL_USUARIO_SGP.md (manual do usuário: instrução operacional)
          → HTML / PDF
```

Mudança de comportamento, situação, permissão, validação, mensagem relevante ou efeito sistêmico deve:

1. atualizar a **matriz técnica**, com evidência no código;
2. avaliar se o **manual do usuário** precisa mudar;
3. somente então regerar HTML/PDF.

O caminho inverso não é válido: o manual do usuário não é fonte de verdade sobre comportamento.

## Outros caminhos relacionados

- `docs/manual/*.html` — guias já publicados, derivados de versões anteriores. Alvo das avaliações de cobertura da matriz técnica.
- `docs/ai/reports/` — auditorias e fotografias históricas, entre elas `auditoria-cobertura-funcional-manual-2026-10-02/`, base da revisão de 2026-10-03.
