      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_EVENTO_COBRANCA)                          *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGEVC))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_EVENTO_COBRANCA TABLE
           ( ID_EVENTO           BIGINT NOT NULL,
             ID_CONTRATO         VARCHAR(15) NOT NULL,
             NR_PARCELA          SMALLINT,
             DT_EVENTO           TIMESTAMP NOT NULL,
             TP_EVENTO           CHAR(3) NOT NULL,
             CD_CANAL            CHAR(3),
             ST_EVENTO           CHAR(2) NOT NULL,
             DS_EVENTO           VARCHAR(240),
             DT_PROX_ACAO        DATE,
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_EVENTO_COBRANCA            *
      ******************************************************************
       01  DCLSG-EVENTO-COBRANCA.
           10 SGEVC-ID-EVENTO             PIC S9(18) COMP-3.
           10 SGEVC-ID-CONTRATO.
              49 SGEVC-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGEVC-ID-CTR-TXT         PIC X(15).
           10 SGEVC-NR-PARCELA            PIC S9(4) USAGE COMP.
           10 SGEVC-DT-EVENTO             PIC X(26).
           10 SGEVC-TP-EVENTO             PIC X(3).
           10 SGEVC-CD-CANAL              PIC X(3).
           10 SGEVC-ST-EVENTO             PIC X(2).
           10 SGEVC-DS-EVENTO.
              49 SGEVC-DS-EVT-LEN         PIC S9(4) USAGE COMP.
              49 SGEVC-DS-EVT-TXT         PIC X(240).
           10 SGEVC-DT-PROX-ACAO          PIC X(10).
           10 SGEVC-DH-INCLUSAO           PIC X(26).
           10 SGEVC-DH-ALTERACAO          PIC X(26).
           10 SGEVC-USUARIO-INCLUSAO.
              49 SGEVC-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGEVC-USR-INC-TXT        PIC X(30).
           10 SGEVC-USUARIO-ALTERACAO.
              49 SGEVC-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGEVC-USR-ALT-TXT        PIC X(30).
           10 SGEVC-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-EVENTO-COBRANCA-IND.
           10 SGEVC-IND-ID-EVENTO         PIC S9(4) USAGE COMP.
           10 SGEVC-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGEVC-IND-NR-PARCELA        PIC S9(4) USAGE COMP.
           10 SGEVC-IND-DT-EVENTO         PIC S9(4) USAGE COMP.
           10 SGEVC-IND-TP-EVENTO         PIC S9(4) USAGE COMP.
           10 SGEVC-IND-CD-CANAL          PIC S9(4) USAGE COMP.
           10 SGEVC-IND-ST-EVENTO         PIC S9(4) USAGE COMP.
           10 SGEVC-IND-DS-EVENTO         PIC S9(4) USAGE COMP.
           10 SGEVC-IND-DT-PROX-ACAO      PIC S9(4) USAGE COMP.
           10 SGEVC-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGEVC-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGEVC-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGEVC-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGEVC-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 14       *
      ******************************************************************
