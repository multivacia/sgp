      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_PAGAMENTO)                                *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGPAG))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_PAGAMENTO TABLE
           ( ID_PAGAMENTO        BIGINT NOT NULL,
             ID_CONTRATO         VARCHAR(15) NOT NULL,
             NR_PARCELA          SMALLINT NOT NULL,
             VR_PAGO             DECIMAL(15,2) NOT NULL,
             DT_PAGAMENTO        DATE NOT NULL,
             CD_CANAL            CHAR(3) NOT NULL,
             NR_DOC_PAGTO        VARCHAR(30),
             ST_PAGAMENTO        CHAR(2) NOT NULL,
             VR_DIFERENCA        DECIMAL(15,2) NOT NULL,
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_PAGAMENTO                  *
      ******************************************************************
       01  DCLSG-PAGAMENTO.
           10 SGPAG-ID-PAGAMENTO          PIC S9(18) COMP-3.
           10 SGPAG-ID-CONTRATO.
              49 SGPAG-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGPAG-ID-CTR-TXT         PIC X(15).
           10 SGPAG-NR-PARCELA            PIC S9(4) USAGE COMP.
           10 SGPAG-VR-PAGO               PIC S9(13)V99 COMP-3.
           10 SGPAG-DT-PAGAMENTO          PIC X(10).
           10 SGPAG-CD-CANAL              PIC X(3).
           10 SGPAG-NR-DOC-PAGTO.
              49 SGPAG-NR-DOC-LEN         PIC S9(4) USAGE COMP.
              49 SGPAG-NR-DOC-TXT         PIC X(30).
           10 SGPAG-ST-PAGAMENTO          PIC X(2).
           10 SGPAG-VR-DIFERENCA          PIC S9(13)V99 COMP-3.
           10 SGPAG-DH-INCLUSAO           PIC X(26).
           10 SGPAG-DH-ALTERACAO          PIC X(26).
           10 SGPAG-USUARIO-INCLUSAO.
              49 SGPAG-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGPAG-USR-INC-TXT        PIC X(30).
           10 SGPAG-USUARIO-ALTERACAO.
              49 SGPAG-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGPAG-USR-ALT-TXT        PIC X(30).
           10 SGPAG-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-PAGAMENTO-IND.
           10 SGPAG-IND-ID-PAGAMENTO      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGPAG-IND-NR-PARCELA        PIC S9(4) USAGE COMP.
           10 SGPAG-IND-VR-PAGO           PIC S9(4) USAGE COMP.
           10 SGPAG-IND-DT-PAGAMENTO      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-CD-CANAL          PIC S9(4) USAGE COMP.
           10 SGPAG-IND-NR-DOC-PAGTO      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-ST-PAGAMENTO      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-VR-DIFERENCA      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGPAG-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGPAG-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGPAG-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 14       *
      ******************************************************************
