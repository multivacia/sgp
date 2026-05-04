# R6 S6 - Checklist de Homologacao (OS Bravo por Documento)

## 1. Objetivo da homologacao

Validar ponta a ponta o fluxo de importacao de OS Bravo por documento, com revisao humana obrigatoria e criacao oficial controlada da esteira no SGP.

## 2. Ambiente usado

- Frontend local (`npm run dev`)
- Backend local (`npm run dev --prefix server`)
- Banco local com matrizes ativas
- Usuario com permissao `conveyors.create`

## 3. Pre-condicoes

- Sessao autenticada com permissao de criacao de esteira.
- Matriz operacional cadastrada com atividades reais (idealmente tapeçaria/revestimento).
- Backend e frontend em execucao.
- PDF Bravo para teste **somente local** (nao versionado no Git).
- Opcional: fixture sanitizada `server/src/tests/fixtures/bravo-os-sanitized.fixture.ts`.

## 4. Passo a passo de validacao

1. Acessar pagina de Nova Esteira por Documento.
2. Enviar PDF Bravo local (ou simular fluxo com fixture sanitizada em testes).
3. Confirmar que resultado volta em contrato `1.1.0`.
4. Validar painel de revisao:
   - resumo do documento;
   - grupos de matching;
   - pecas/insumos;
   - observacoes operacionais;
   - bloco de dados protegidos removidos.
5. Verificar aceite por item:
   - marcar todos os `REVIEW_SIMILAR`;
   - marcar todos os `CREATE_NEW`.
6. Confirmar que criacao fica bloqueada enquanto houver pendencia.
7. Confirmar criacao oficial apenas apos aceite e confirmacao final.

## 5. Resultado esperado

- Fluxo completo funciona sem endpoint novo e sem migration.
- Itens similares/novos exigem aceite explicito.
- Criacao oficial acontece apenas apos revisao.

## 6. Checklist LGPD

- [ ] CPF/CNPJ nao aparece em campos operacionais.
- [ ] Endereco nao aparece em campos operacionais.
- [ ] Telefone nao aparece em campos operacionais.
- [ ] E-mail nao aparece em campos operacionais.
- [ ] Nome de cliente nao aparece (ou aparece apenas mascarado quando aplicavel).
- [ ] Apenas categorias removidas sao exibidas no painel.

## 7. Checklist financeiro

- [ ] Precos/valores nao aparecem em serviceItems.
- [ ] Desconto nao aparece em serviceItems/notes.
- [ ] Total/subtotal nao aparecem em serviceItems/notes.
- [ ] Pagamento nao aparece em serviceItems/notes.

## 8. Checklist operacional

- [ ] Servicos extraidos em `serviceItems`.
- [ ] Pecas separadas em `partItems`.
- [ ] Matching com matriz preenchido quando houver candidato.
- [ ] Itens sem candidato confiavel marcados como `CREATE_NEW`.
- [ ] Itens ambiguos marcados como `REVIEW_SIMILAR`.
- [ ] PartItems nao entram no `matchingPlan`.

## 9. Checklist criacao oficial

- [ ] Criacao bloqueada com pendencias de aceite.
- [ ] Criacao liberada apos aceite de `REVIEW_SIMILAR` e `CREATE_NEW`.
- [ ] Confirmacao final exibida antes da criacao.
- [ ] Esteira criada com dados operacionais revisados.

## 10. Decisao de go-live

- [ ] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## 11. Observacoes e pendencias

- Qualidade do matching depende da maturidade da matriz cadastrada no ambiente.
- Sem deploy automatico: publicacao em PRD deve seguir aprovacao manual.
- PDF real de cliente nao deve ser versionado nem logado.

