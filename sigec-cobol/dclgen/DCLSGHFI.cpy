      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_HIST_FINANCEIRO)                          *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGHFI))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_HIST_FINANCEIRO TABLE
           ( ID_HIST_FIN         BIGINT NOT NULL,
             ID_CONTRATO         VARCHAR(15) NOT NULL,
             NR_PARCELA          SMALLINT,
             ID_PAGAMENTO        BIGINT,
             DT_EVENTO           TIMESTAMP NOT NULL,
             TP_EVENTO           CHAR(3) NOT NULL,
             VR_EVENTO           DECIMAL(15,2) NOT NULL,
             VR_SALDO_ANT        DECIMAL(15,2),
             VR_SALDO_NOV        DECIMAL(15,2),
             DS_EVENTO           VARCHAR(240),
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_HIST_FINANCEIRO            *
      ******************************************************************
       01  DCLSG-HIST-FINANCEIRO.
           10 SGHFI-ID-HIST-FIN           PIC S9(18) COMP-3.
           10 SGHFI-ID-CONTRATO.
              49 SGHFI-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGHFI-ID-CTR-TXT         PIC X(15).
           10 SGHFI-NR-PARCELA            PIC S9(4) USAGE COMP.
           10 SGHFI-ID-PAGAMENTO          PIC S9(18) COMP-3.
           10 SGHFI-DT-EVENTO             PIC X(26).
           10 SGHFI-TP-EVENTO             PIC X(3).
           10 SGHFI-VR-EVENTO             PIC S9(13)V99 COMP-3.
           10 SGHFI-VR-SALDO-ANT          PIC S9(13)V99 COMP-3.
           10 SGHFI-VR-SALDO-NOV          PIC S9(13)V99 COMP-3.
           10 SGHFI-DS-EVENTO.
              49 SGHFI-DS-EVT-LEN         PIC S9(4) USAGE COMP.
              49 SGHFI-DS-EVT-TXT         PIC X(240).
           10 SGHFI-DH-INCLUSAO           PIC X(26).
           10 SGHFI-DH-ALTERACAO          PIC X(26).
           10 SGHFI-USUARIO-INCLUSAO.
              49 SGHFI-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGHFI-USR-INC-TXT        PIC X(30).
           10 SGHFI-USUARIO-ALTERACAO.
              49 SGHFI-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGHFI-USR-ALT-TXT        PIC X(30).
           10 SGHFI-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-HIST-FINANCEIRO-IND.
           10 SGHFI-IND-ID-HIST-FIN       PIC S9(4) USAGE COMP.
           10 SGHFI-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGHFI-IND-NR-PARCELA        PIC S9(4) USAGE COMP.
           10 SGHFI-IND-ID-PAGAMENTO      PIC S9(4) USAGE COMP.
           10 SGHFI-IND-DT-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHFI-IND-TP-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHFI-IND-VR-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHFI-IND-VR-SALDO-ANT      PIC S9(4) USAGE COMP.
           10 SGHFI-IND-VR-SALDO-NOV      PIC S9(4) USAGE COMP.
           10 SGHFI-IND-DS-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHFI-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGHFI-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGHFI-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGHFI-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGHFI-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 15       *
      ******************************************************************
