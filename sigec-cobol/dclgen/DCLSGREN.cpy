      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_RENEGOCIACAO)                             *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGREN))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_RENEGOCIACAO TABLE
           ( ID_RENEGOCIACAO     BIGINT NOT NULL,
             ID_CONTRATO         VARCHAR(15) NOT NULL,
             ST_RENEGOCIACAO     CHAR(2) NOT NULL,
             VR_ENTRADA          DECIMAL(15,2) NOT NULL,
             QT_OPCOES           SMALLINT NOT NULL,
             DT_PROPOSTA         DATE NOT NULL,
             DT_APROVACAO        DATE,
             DT_ENCERRAMENTO     DATE,
             CLASS_RISCO         CHAR(1),
             VR_SALDO_ORIGEM     DECIMAL(15,2) NOT NULL,
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_RENEGOCIACAO               *
      ******************************************************************
       01  DCLSG-RENEGOCIACAO.
           10 SGREN-ID-RENEGOCIACAO       PIC S9(18) COMP-3.
           10 SGREN-ID-CONTRATO.
              49 SGREN-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGREN-ID-CTR-TXT         PIC X(15).
           10 SGREN-ST-RENEGOCIACAO       PIC X(2).
           10 SGREN-VR-ENTRADA            PIC S9(13)V99 COMP-3.
           10 SGREN-QT-OPCOES             PIC S9(4) USAGE COMP.
           10 SGREN-DT-PROPOSTA           PIC X(10).
           10 SGREN-DT-APROVACAO          PIC X(10).
           10 SGREN-DT-ENCERRAMENTO       PIC X(10).
           10 SGREN-CLASS-RISCO           PIC X(1).
           10 SGREN-VR-SALDO-ORIGEM       PIC S9(13)V99 COMP-3.
           10 SGREN-DH-INCLUSAO           PIC X(26).
           10 SGREN-DH-ALTERACAO          PIC X(26).
           10 SGREN-USUARIO-INCLUSAO.
              49 SGREN-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGREN-USR-INC-TXT        PIC X(30).
           10 SGREN-USUARIO-ALTERACAO.
              49 SGREN-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGREN-USR-ALT-TXT        PIC X(30).
           10 SGREN-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-RENEGOCIACAO-IND.
           10 SGREN-IND-ID-RENEG          PIC S9(4) USAGE COMP.
           10 SGREN-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGREN-IND-ST-RENEG          PIC S9(4) USAGE COMP.
           10 SGREN-IND-VR-ENTRADA        PIC S9(4) USAGE COMP.
           10 SGREN-IND-QT-OPCOES         PIC S9(4) USAGE COMP.
           10 SGREN-IND-DT-PROPOSTA       PIC S9(4) USAGE COMP.
           10 SGREN-IND-DT-APROVACAO      PIC S9(4) USAGE COMP.
           10 SGREN-IND-DT-ENCERRAMENTO   PIC S9(4) USAGE COMP.
           10 SGREN-IND-CLASS-RISCO       PIC S9(4) USAGE COMP.
           10 SGREN-IND-VR-SALDO-ORIGEM   PIC S9(4) USAGE COMP.
           10 SGREN-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGREN-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGREN-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGREN-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGREN-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 15       *
      ******************************************************************
