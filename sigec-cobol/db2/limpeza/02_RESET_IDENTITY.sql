--*********************************************************************
--* 02_RESET_IDENTITY.sql                                              *
--* Reinicia os IDENTITY apos DELETE massivo.                          *
--*                                                                    *
--* Sintaxe DB2 LUW: ALTER TABLE ... ALTER COLUMN ... RESTART WITH 1.  *
--* Em DB2 z/OS use: ALTER TABLE ... ALTER COLUMN ... RESTART WITH 1.  *
--*                                                                    *
--* Nao afeta tabelas cuja PK e composta ou textual (SG_CONTRATO,      *
--* SG_PARCELA, SG_OPCAO_RENEGOCIACAO, SG_PARAMETRO).                  *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

ALTER TABLE SIGEC.SG_CLIENTE            ALTER COLUMN ID_CLIENTE       RESTART WITH 1;
ALTER TABLE SIGEC.SG_HIST_CLIENTE       ALTER COLUMN ID_HIST          RESTART WITH 1;
ALTER TABLE SIGEC.SG_HIST_CONTRATO      ALTER COLUMN ID_HIST          RESTART WITH 1;
ALTER TABLE SIGEC.SG_PAGAMENTO          ALTER COLUMN ID_PAGAMENTO     RESTART WITH 1;
ALTER TABLE SIGEC.SG_HIST_FINANCEIRO    ALTER COLUMN ID_HIST_FIN      RESTART WITH 1;
ALTER TABLE SIGEC.SG_RENEGOCIACAO       ALTER COLUMN ID_RENEGOCIACAO  RESTART WITH 1;
ALTER TABLE SIGEC.SG_HIST_PROCESSAMENTO ALTER COLUMN ID_PROCESSAMENTO RESTART WITH 1;
ALTER TABLE SIGEC.SG_EVENTO_COBRANCA    ALTER COLUMN ID_EVENTO        RESTART WITH 1;

COMMIT;
