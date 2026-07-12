--*********************************************************************
--* SIGEC - Sistema de Gestao de Cobranca (Laboratorio COBOL/DB2)      *
--* Arquivo : 00_CREATE_SCHEMA.sql                                     *
--* Objetivo: Criar schema SIGEC, tablespace e storage group base.     *
--* Autor   : Camada DB2 - Laboratorio                                 *
--* Notas   : Executar UMA vez, antes de qualquer outro DDL.           *
--*           Ajustar STOGROUP / BUFFERPOOL conforme site do DB2.      *
--*********************************************************************

-- Storage group logico (comente se o site nao usar STOGROUP explicito)
-- CREATE STOGROUP SGSIGEC VOLUMES ('*') VCAT SYSDA;

-- Schema logico do SIGEC.
CREATE SCHEMA SIGEC;

-- Tablespace segregada para o SIGEC (LUW / z/OS).
-- Em DB2 z/OS, ajustar sintaxe conforme site. Em LUW o formato abaixo funciona.
-- CREATE TABLESPACE TSSIGEC MANAGED BY AUTOMATIC STORAGE;

COMMENT ON SCHEMA SIGEC IS
  'Schema do laboratorio SIGEC - Sistema de Gestao de Cobranca (COBOL/DB2).';

-- SET CURRENT SCHEMA para as demais DDLs.
SET CURRENT SCHEMA = SIGEC;

COMMIT;
