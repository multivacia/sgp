--*********************************************************************
--* 99_DROP_ALL.sql                                                    *
--* Remove todas as tabelas e o schema SIGEC.                          *
--*                                                                    *
--* Ordem: filhas -> pais para evitar violacao de FK durante o DROP.   *
--*                                                                    *
--* !!! DESTRUTIVO !!!                                                 *
--* Nao execute em producao ou homologacao sem plano aprovado.         *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

DROP TABLE SIGEC.SG_HIST_FINANCEIRO;
DROP TABLE SIGEC.SG_EVENTO_COBRANCA;
DROP TABLE SIGEC.SG_OPCAO_RENEGOCIACAO;
DROP TABLE SIGEC.SG_RENEGOCIACAO;
DROP TABLE SIGEC.SG_PAGAMENTO;
DROP TABLE SIGEC.SG_PARCELA;
DROP TABLE SIGEC.SG_HIST_CONTRATO;
DROP TABLE SIGEC.SG_HIST_CLIENTE;
DROP TABLE SIGEC.SG_CONTRATO;
DROP TABLE SIGEC.SG_CLIENTE;
DROP TABLE SIGEC.SG_HIST_PROCESSAMENTO;
DROP TABLE SIGEC.SG_PARAMETRO;

-- DROP do schema (falhara se ainda houver objetos)
DROP SCHEMA SIGEC RESTRICT;

COMMIT;
