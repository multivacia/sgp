--*********************************************************************
--* SIGEC.SG_PARAMETRO                                                 *
--* Parametros de negocio do SIGEC (numeros, percentuais, flags).      *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

CREATE TABLE SIGEC.SG_PARAMETRO (
  CD_PARAMETRO      VARCHAR(30)  NOT NULL,
  VR_PARAMETRO      VARCHAR(100) NOT NULL,
  DS_PARAMETRO      VARCHAR(240) NOT NULL,
  TP_PARAMETRO      CHAR(1)      NOT NULL WITH DEFAULT 'S',
  DH_INCLUSAO       TIMESTAMP    NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  DH_ALTERACAO      TIMESTAMP,
  USUARIO_INCLUSAO  VARCHAR(30)  NOT NULL,
  USUARIO_ALTERACAO VARCHAR(30),
  SITUACAO_REG      CHAR(1)      NOT NULL WITH DEFAULT 'A',
  CONSTRAINT PK_SG_PARAMETRO PRIMARY KEY (CD_PARAMETRO),
  CONSTRAINT CK_SG_PRM_TPPRM CHECK (TP_PARAMETRO IN ('S','N','P','D','B')),
  CONSTRAINT CK_SG_PRM_SITREG CHECK (SITUACAO_REG IN ('A','I'))
);

COMMENT ON TABLE SIGEC.SG_PARAMETRO IS
  'Parametros de negocio do SIGEC (chave/valor).';

COMMENT ON COLUMN SIGEC.SG_PARAMETRO.CD_PARAMETRO IS 'Codigo do parametro (chave).';
COMMENT ON COLUMN SIGEC.SG_PARAMETRO.VR_PARAMETRO IS 'Valor armazenado como texto; interpretado pelo TP_PARAMETRO.';
COMMENT ON COLUMN SIGEC.SG_PARAMETRO.DS_PARAMETRO IS 'Descricao funcional do parametro.';
COMMENT ON COLUMN SIGEC.SG_PARAMETRO.TP_PARAMETRO IS 'Tipo semantico: S string, N numero, P percentual, D data, B booleano (S/N).';

COMMIT;
