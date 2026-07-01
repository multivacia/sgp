# Playbook: feature-development

## Objetivo

Guiar o desenvolvimento de uma nova funcionalidade no SGP+ Web com análise, especificação, implementação, testes e revisão.

## Fluxo

### 1. Contexto

Usar `sgp-context-reader` ou fazer leitura equivalente.

Objetivo:

- entender o estado atual;
- localizar arquivos relevantes;
- mapear frontend, backend, banco e permissões;
- não alterar código.

### 2. Impacto

Usar `sgp-impact-analyst`.

Objetivo:

- identificar riscos;
- validar regras;
- verificar regressão;
- recomendar seguir, ajustar ou bloquear.

### 3. Especificação

Usar `sgp-feature-spec-writer` ou gerar especificação equivalente.

Objetivo:

- transformar a demanda em escopo fechado;
- definir comportamento esperado;
- definir critérios de aceite;
- definir arquivos prováveis.

### 4. Implementação

Usar um único implementador.

Objetivo:

- alterar somente o necessário;
- respeitar a especificação;
- não fazer refatoração oportunista;
- registrar alterações feitas.

### 5. Testes

Usar `sgp-test-reviewer` ou revisão equivalente.

Objetivo:

- revisar testes existentes;
- sugerir ou criar testes necessários;
- listar validação manual;
- apontar riscos restantes.

### 6. Aprovação

A aprovação final é humana.

A IA pode recomendar, mas não aprovar sozinha.
