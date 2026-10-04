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

## Gerar o manual do usuário em HTML

`docs/manual/manual-usuario.html` é o manual integral em HTML, **derivado** de `MANUAL_USUARIO_SGP.md`. Não edite o HTML à mão: altere a fonte e regenere.

| Comando | O que faz |
|---|---|
| `npm run manual:usuario:html` | gera `docs/manual/manual-usuario.html` e valida a estrutura |
| `npm run manual:usuario:html:check` | só valida; falha se o HTML estiver desatualizado em relação à fonte ou inválido |

Gerador: `scripts/generate-manual-usuario-html.mjs`, com a biblioteca `marked` (devDependency; requer `npm install`). Ele nunca escreve na fonte, produz o mesmo HTML para a mesma fonte (sem data de geração) e gera um arquivo único, sem dependência de rede. Se a validação falhar (capítulos 1 a 21, IDs únicos, links internos do índice, marcador de capítulo pendente, acentuação corrompida, revisão ausente), o HTML não é gravado.

### Abrir o manual: fora e dentro do SGP+

O mesmo arquivo atende os dois usos. Não existe segunda cópia no repositório.

- **Fora do SGP+:** abra `docs/manual/manual-usuario.html` direto no navegador. O seletor **Claro / Escuro** fica no topo e a escolha é guardada no próprio navegador (`sgp.manual.tema`). Sem escolha guardada, vale o tema do sistema operacional. Não há CDN nem requisição de rede.
- **Dentro do SGP+:** menu **? Ajuda** da barra superior, na mesma aba, em `/manual/manual-usuario.html`. **Como usar esta tela** abre na seção da tela atual; **Manual do usuário** abre no início. O botão Voltar do navegador (ou **Voltar ao SGP+**) retorna à tela anterior.

Parâmetros de URL (todos opcionais; nenhum carrega dados de sessão ou de usuário):

| Parâmetro | Efeito |
|---|---|
| `tema=claro` ou `tema=escuro` | define o tema inicial e tem prioridade sobre a preferência guardada. O SGP+ envia o tema atual (Light Executive = claro; os demais = escuro) |
| `integrado=1` | indica abertura pelo SGP+ e mostra **Voltar ao SGP+** |
| `#cap-5`, `#sec-3-6`… | âncora de capítulo ou seção, como em qualquer link |

**Publicação:** o plugin `vite-plugin-manual-usuario.ts` serve o HTML gerado em `/manual/manual-usuario.html` no `npm run dev` e o inclui, byte a byte, em `dist/manual/` no `npm run build`. Rode `npm run manual:usuario:html` antes do build quando a fonte mudar. O build usa o arquivo que estiver em `docs/manual/`.

**Mapa tela → seção:** fica em um único arquivo, `src/lib/help/manual-help.ts`. O teste `manual-help.test.ts` falha se alguma âncora mapeada deixar de existir no HTML gerado. Ao renomear um título do manual, rode o teste e ajuste o mapa. Os títulos numerados (por exemplo `16.7`) mantêm o ID; os demais derivam do texto do título.

**PDF:** ainda não tem fluxo oficial.

## Outros caminhos relacionados

- `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` — guias específicos por público, derivados de versões anteriores e escritos à mão. **Não** substituem o manual integral e não são gerados pelo comando acima. São o alvo das avaliações de cobertura da matriz técnica.
- `docs/ai/reports/` — auditorias e fotografias históricas, entre elas `auditoria-cobertura-funcional-manual-2026-10-02/`, base da revisão de 2026-10-03.
