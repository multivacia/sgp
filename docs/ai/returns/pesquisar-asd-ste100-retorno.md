# Retorno — pesquisar-asd-ste100

## Metadados

- TASK_ID: `pesquisar-asd-ste100`
- Data/hora: `2026-10-10 UTC`
- Objetivo: pesquisar o padrão ASD-STE100 (Simplified Technical English) e avaliar a relevância para o SGP+.
- Status final: `CONCLUIDO` (somente pesquisa; nenhum código alterado)

## Git

- Branch: `ccr-50b0b39e-sss9zr`
- SHA inicial: `c611d10feacf329bdc217fe391ebf47a90a6ea7a`
- SHA final: o commit que adiciona este arquivo (ver `git log`)
- Commit/push: sim, para a branch designada. PR: não aberto.

## Resultado da pesquisa

### O que é

- O ASD-STE100 é o padrão de **Simplified Technical English (STE)**. É uma língua controlada para documentação técnica em inglês.
- É mantido pelo STEMG (Simplified Technical English Maintenance Group) da ASD (AeroSpace, Security and Defence Industries Association of Europe).
- Foi criado na aviação comercial (AECMA Simplified English, Issue 1, 1980). Depois foi adotado pela defesa (veículos terrestres e navais) e por outros setores.
- O objetivo é um texto claro e sem ambiguidade para leitores que não têm o inglês como primeira língua. Também reduz o custo de tradução.
- É um requisito da especificação S1000D (publicações técnicas modulares em XML).

### Versão atual

- **Issue 9, de 15 de janeiro de 2025.** É a versão vigente; não foi encontrado um Issue de 2026.
- Com o Issue 9, o documento deixou de ser uma "especificação" e passou a ser um **padrão internacional**.
- O Issue 9 não criou regras novas. Mudou a redação de 31 das 53 regras, alinhou a terminologia à ISO 1087-1:2019 e revisou mais de 600 termos do dicionário.
- Ciclo usual: um Issue novo a cada ~3 anos. Por isso, o próximo é esperado por volta de 2028 (sem data oficial).
- Acesso: gratuito. A cópia oficial é solicitada em asd-ste100.org.

### Estrutura

1. **Regras de escrita:** 53 regras em 9 seções (palavras, nomes técnicos, verbos, frases, procedimentos, descrições, avisos/cuidados, pontuação, estilo).
2. **Dicionário controlado:** cerca de 900 palavras aprovadas. Cada palavra tem **um significado e uma classe gramatical**. O dicionário mostra também palavras não aprovadas e o termo aprovado que as substitui.
3. Além das palavras aprovadas, o redator pode usar **nomes técnicos** (*technical names*) e **verbos técnicos** (*technical verbs*) do domínio, desde que se encaixem nas categorias que o padrão define.

### Regras principais (resumo de fontes secundárias; conferir no texto oficial)

- Use somente palavras aprovadas, nomes técnicos ou verbos técnicos (regra 1.1).
- Uma palavra = um significado. Use o mesmo termo sempre para a mesma coisa.
- Não use grupos de mais de 3 substantivos (regra 2.1). Escreva um nome longo uma vez e depois use uma forma curta (regra 2.2).
- Use somente formas verbais permitidas: infinitivo, imperativo, presente simples, passado simples, particípio passado como adjetivo e futuro.
- Use a voz ativa em procedimentos (regra 3.6).
- Frase de procedimento: no máximo **20 palavras**. Frase descritiva: no máximo **25 palavras**.
- Separe o texto **procedural** (instruções) do texto **descritivo** (explicações).
- Um tópico por frase; uma instrução por frase (exceto ações simultâneas).
- Escreva a condição antes da ação ("Se X, faça Y").
- Avisos (*warnings*) e cuidados (*cautions*) começam com uma instrução clara e curta e depois dizem o risco.

### Ferramentas

- Há verificadores comerciais: HyperSTE, Congree, Acrolinx, Talisen STEM, entre outros. Muitos se integram a editores XML (Arbortext, XMetaL).
- HyperSTE pode ser configurado para documentação farmacêutica/médica, o que mostra uso fora da aviação.

## Relevância para o SGP+

- **Limitação direta:** o STE vale somente para o **inglês**. A UI e a documentação do SGP+ são em português. Por isso, não é possível declarar conformidade com o ASD-STE100.
- **Aplicação indireta (recomendação, não decisão):** os princípios combinam com a "UX Bravo" e com a regra de não mostrar jargão técnico (`STEP`) ao usuário final:
  - um termo por conceito (ex.: sempre "Atividade", nunca alternar com "Step"/"Etapa");
  - mensagens de kiosk/produção curtas, no imperativo, uma ação por frase;
  - condição antes da ação ("Se a esteira estiver pausada, toque em Retomar");
  - separar instrução de explicação em telas e tickets;
  - glossário controlado PT-BR para rótulos, status e justificativas padronizadas.
- Se houver documentação técnica em inglês (manuais, exportações, clientes estrangeiros), o STE pode ser aplicado de forma direta.

## Arquivos

- Criado: `docs/ai/returns/pesquisar-asd-ste100-retorno.md`
- Alterados/removidos: nenhum.

## Migrations

- Nenhuma.

## Validação

- Pesquisa feita com WebSearch. WebFetch para asd-ste100.org e wikipedia.org falhou (`ENOTFOUND`, restrição de rede do ambiente).
- Build/lint/testes: não aplicável (nenhum código alterado).

## Pendências / riscos

- Os números de regras e limites vêm de fontes secundárias. Conferir no texto oficial do Issue 9 antes de usar como norma.
- Se quiser adotar um "guia de escrita controlada PT-BR" inspirado no STE, é preciso decisão humana. Um arquivo novo deve passar pelo critério anti-zoológico do `AGENTS.md`.

## Próximo passo recomendado

- Decidir se o SGP+ deve ter um glossário/guia de microcopy PT-BR baseado nos princípios do STE.

## Fontes

- https://www.asd-europe.org/news-media/news-events/news/simplified-technical-english-asd-ste100-issue-9
- https://www.tcworld.info/e-magazine/column/asd-ste100-issue-9-setting-a-standard-for-technical-documentation
- https://asd-ste100.org/about_STE.html
- https://www.asd-europe.org/standards-specifications/simplified-technical-english/faq-simplified-technical-english-ste/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
- https://skybrary.aero/articles/simplified-technical-english-ste
- https://simplified-english.co.uk/rules-ste8.html
- https://www.congree.com/en/ste-simplified-technical-english
- https://www.acrolinx.com/blog/a-guide-to-simplified-technical-english-improving-your-technical-documentation/

## Estado final

- `git status`: limpo após o commit.
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
