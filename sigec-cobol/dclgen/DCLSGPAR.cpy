      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_PARCELA)                                  *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGPAR))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_PARCELA TABLE
           ( ID_CONTRATO         VARCHAR(15) NOT NULL,
             NR_PARCELA          SMALLINT NOT NULL,
             DT_VENCIMENTO       DATE NOT NULL,
             VR_PARCELA          DECIMAL(15,2) NOT NULL,
             VR_SALDO            DECIMAL(15,2) NOT NULL,
             VR_JUROS            DECIMAL(15,2) NOT NULL,
             VR_MULTA            DECIMAL(15,2) NOT NULL,
             ST_PARCELA          CHAR(2) NOT NULL,
             DT_ULTIMO_PAGTO     DATE,
             DIAS_ATRASO         SMALLINT NOT NULL,
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_PARCELA                    *
      ******************************************************************
       01  DCLSG-PARCELA.
           10 SGPAR-ID-CONTRATO.
              49 SGPAR-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGPAR-ID-CTR-TXT         PIC X(15).
           10 SGPAR-NR-PARCELA            PIC S9(4) USAGE COMP.
           10 SGPAR-DT-VENCIMENTO         PIC X(10).
           10 SGPAR-VR-PARCELA            PIC S9(13)V99 COMP-3.
           10 SGPAR-VR-SALDO              PIC S9(13)V99 COMP-3.
           10 SGPAR-VR-JUROS              PIC S9(13)V99 COMP-3.
           10 SGPAR-VR-MULTA              PIC S9(13)V99 COMP-3.
           10 SGPAR-ST-PARCELA            PIC X(2).
           10 SGPAR-DT-ULTIMO-PAGTO       PIC X(10).
           10 SGPAR-DIAS-ATRASO           PIC S9(4) USAGE COMP.
           10 SGPAR-DH-INCLUSAO           PIC X(26).
           10 SGPAR-DH-ALTERACAO          PIC X(26).
           10 SGPAR-USUARIO-INCLUSAO.
              49 SGPAR-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGPAR-USR-INC-TXT        PIC X(30).
           10 SGPAR-USUARIO-ALTERACAO.
              49 SGPAR-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGPAR-USR-ALT-TXT        PIC X(30).
           10 SGPAR-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-PARCELA-IND.
           10 SGPAR-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGPAR-IND-NR-PARCELA        PIC S9(4) USAGE COMP.
           10 SGPAR-IND-DT-VENCIMENTO     PIC S9(4) USAGE COMP.
           10 SGPAR-IND-VR-PARCELA        PIC S9(4) USAGE COMP.
           10 SGPAR-IND-VR-SALDO          PIC S9(4) USAGE COMP.
           10 SGPAR-IND-VR-JUROS          PIC S9(4) USAGE COMP.
           10 SGPAR-IND-VR-MULTA          PIC S9(4) USAGE COMP.
           10 SGPAR-IND-ST-PARCELA        PIC S9(4) USAGE COMP.
           10 SGPAR-IND-DT-ULT-PAGTO      PIC S9(4) USAGE COMP.
           10 SGPAR-IND-DIAS-ATRASO       PIC S9(4) USAGE COMP.
           10 SGPAR-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGPAR-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGPAR-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGPAR-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGPAR-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 15       *
      ******************************************************************
