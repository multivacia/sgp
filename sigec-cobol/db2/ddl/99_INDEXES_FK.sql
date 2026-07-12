--*********************************************************************
--* 99_INDEXES_FK.sql                                                  *
--* Indices complementares e FKs cruzadas que nao pertencem a          *
--* nenhuma DDL de tabela em particular.                               *
--*                                                                    *
--* Observacao: as FKs principais ja foram declaradas dentro das DDLs  *
--* de cada tabela (SG_HIST_CLIENTE, SG_CONTRATO, SG_PARCELA,          *
--* SG_PAGAMENTO, SG_HIST_FINANCEIRO, SG_RENEGOCIACAO,                 *
--* SG_OPCAO_RENEGOCIACAO, SG_EVENTO_COBRANCA e SG_HIST_CONTRATO).     *
--* Este arquivo agrega apenas indices analiticos / de leitura.        *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

--------------------------------------------------------------------
-- Indices analiticos / de suporte a batch e dashboards
--------------------------------------------------------------------

-- Consulta rapida por documento (evita scan em UK composta em telas)
CREATE INDEX SIGEC.IX_SG_CLI_DOCUMENTO
  ON SIGEC.SG_CLIENTE (NR_DOCUMENTO);

-- Suporte a jobs de rebaixamento de status por vencimento
CREATE INDEX SIGEC.IX_SG_PAR_CTR_VENC
  ON SIGEC.SG_PARCELA (ID_CONTRATO, DT_VENCIMENTO);

-- Aging por contrato (batch de classificacao de inadimplencia)
CREATE INDEX SIGEC.IX_SG_PAR_AGING
  ON SIGEC.SG_PARCELA (ST_PARCELA, DT_VENCIMENTO);

-- Consultas por classificacao de inadimplencia (dashboards)
CREATE INDEX SIGEC.IX_SG_CTR_CLINAD
  ON SIGEC.SG_CONTRATO (CLASSIFICACAO_INAD, DIAS_ATRASO_MAX DESC);

-- Renegociacoes ativas do dia
CREATE INDEX SIGEC.IX_SG_REN_ATIVAS
  ON SIGEC.SG_RENEGOCIACAO (ST_RENEGOCIACAO, DT_APROVACAO);

-- Pagamentos por canal (relatorios operacionais)
CREATE INDEX SIGEC.IX_SG_PGT_CANAL
  ON SIGEC.SG_PAGAMENTO (CD_CANAL, DT_PAGAMENTO);

-- Historico financeiro por tipo de evento
CREATE INDEX SIGEC.IX_SG_HFI_TPEVT
  ON SIGEC.SG_HIST_FINANCEIRO (TP_EVENTO, DT_EVENTO DESC);

-- Log de processamento por status (monitoramento de esteira batch)
CREATE INDEX SIGEC.IX_SG_HPR_STATUS
  ON SIGEC.SG_HIST_PROCESSAMENTO (ST_EXECUCAO, DH_INICIO DESC);

COMMIT;
