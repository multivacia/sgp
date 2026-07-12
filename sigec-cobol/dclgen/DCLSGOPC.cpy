      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_OPCAO_RENEGOCIACAO)                       *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGOPC))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_OPCAO_RENEGOCIACAO TABLE
           ( ID_RENEGOCIACAO     BIGINT NOT NULL,
             NR_OPCAO            SMALLINT NOT NULL,
             QT_PARCELAS         SMALLINT NOT NULL,
             VR_PARCELA          DECIMAL(15,2) NOT NULL,
             VR_TOTAL            DECIMAL(15,2) NOT NULL,
             TX_APLICADA         DECIMAL(5,2) NOT NULL,
             IND_SELECIONADA     CHAR(1) NOT NULL,
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_OPCAO_RENEGOCIACAO         *
      ******************************************************************
       01  DCLSG-OPCAO-RENEG.
           10 SGOPC-ID-RENEGOCIACAO       PIC S9(18) COMP-3.
           10 SGOPC-NR-OPCAO              PIC S9(4) USAGE COMP.
           10 SGOPC-QT-PARCELAS           PIC S9(4) USAGE COMP.
           10 SGOPC-VR-PARCELA            PIC S9(13)V99 COMP-3.
           10 SGOPC-VR-TOTAL              PIC S9(13)V99 COMP-3.
           10 SGOPC-TX-APLICADA           PIC S9(3)V99 COMP-3.
           10 SGOPC-IND-SELECIONADA       PIC X(1).
           10 SGOPC-DH-INCLUSAO           PIC X(26).
           10 SGOPC-DH-ALTERACAO          PIC X(26).
           10 SGOPC-USUARIO-INCLUSAO.
              49 SGOPC-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGOPC-USR-INC-TXT        PIC X(30).
           10 SGOPC-USUARIO-ALTERACAO.
              49 SGOPC-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGOPC-USR-ALT-TXT        PIC X(30).
           10 SGOPC-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-OPCAO-RENEG-IND.
           10 SGOPC-IND-ID-RENEG          PIC S9(4) USAGE COMP.
           10 SGOPC-IND-NR-OPCAO          PIC S9(4) USAGE COMP.
           10 SGOPC-IND-QT-PARCELAS       PIC S9(4) USAGE COMP.
           10 SGOPC-IND-VR-PARCELA        PIC S9(4) USAGE COMP.
           10 SGOPC-IND-VR-TOTAL          PIC S9(4) USAGE COMP.
           10 SGOPC-IND-TX-APLICADA       PIC S9(4) USAGE COMP.
           10 SGOPC-IND-SELECIONADA       PIC S9(4) USAGE COMP.
           10 SGOPC-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGOPC-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGOPC-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGOPC-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGOPC-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 12       *
      ******************************************************************
