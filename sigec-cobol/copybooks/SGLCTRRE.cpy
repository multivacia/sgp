      *****************************************************************
      * COPYBOOK.: SGLCTRRE                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLCTRRE - CONTRATOS REJEITADOS EM SGCB0020         *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 260     BLKSIZE: 26000                *
      * PROG ....: SGCB0020 (SAIDA) - SGCB0190 (LEITURA REL. ERROS)    *
      *----------------------------------------------------------------*
      * MESMO DETALHE DE SGLCTRIN + CHAVE DE MOTIVO + TEXTO EM         *
      * PORTUGUES PARA CADA REJEICAO.                                  *
      *****************************************************************
       01  REG-SGLCTRRE.
           05  CTRRE-TIPO-REG            PIC X(01).
               88  CTRRE-E-HEADER                 VALUE 'H'.
               88  CTRRE-E-DETAIL                 VALUE 'D'.
               88  CTRRE-E-TRAILER                VALUE 'T'.
           05  CTRRE-CORPO               PIC X(259).
      *
      *---------------------------------------------------------------*
      *  HEADER - LRECL 260                                           *
      *---------------------------------------------------------------*
       01  REG-SGLCTRRE-HDR.
           05  CTRRE-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  CTRRE-HDR-DT-PROC         PIC 9(08).
           05  CTRRE-HDR-HR-PROC         PIC 9(06).
           05  CTRRE-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0020'.
           05  CTRRE-HDR-QTD-REJEIT      PIC 9(09).
           05  CTRRE-HDR-FILLER          PIC X(228).
      *
      *---------------------------------------------------------------*
      *  DETAIL - LRECL 260                                           *
      *---------------------------------------------------------------*
       01  REG-SGLCTRRE-DET.
           05  CTRRE-DET-TIPO            PIC X(01) VALUE 'D'.
           05  CTRRE-DET-SEQ             PIC 9(09).
           05  CTRRE-DET-NR-CONTRATO     PIC X(15).
           05  CTRRE-DET-TIPO-DOC        PIC X(03).
           05  CTRRE-DET-DOCUMENTO       PIC X(14).
           05  CTRRE-DET-NOME            PIC X(60).
           05  CTRRE-DET-TIPO-CLIENTE    PIC X(02).
           05  CTRRE-DET-TIPO-CONTRATO   PIC X(02).
           05  CTRRE-DET-VALOR-TOTAL     PIC 9(13)V99.
           05  CTRRE-DET-QTD-PARCELAS    PIC 9(03).
           05  CTRRE-DET-DATA-INICIO     PIC 9(08).
      *---- MOTIVO DA REJEICAO ---------------------------------------*
           05  CTRRE-DET-CD-MOTIVO       PIC X(20).
           05  CTRRE-DET-MOTIVO          PIC X(40).
           05  CTRRE-DET-CAMPO-ORIG      PIC X(20).
           05  CTRRE-DET-VALOR-ORIG      PIC X(30).
           05  CTRRE-DET-DT-REJEICAO     PIC 9(08).
           05  CTRRE-DET-FILLER          PIC X(04).
      *
      *---------------------------------------------------------------*
      *  TRAILER - LRECL 260                                          *
      *---------------------------------------------------------------*
       01  REG-SGLCTRRE-TRL.
           05  CTRRE-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  CTRRE-TRL-QTD-REGS        PIC 9(09).
           05  CTRRE-TRL-SOMA-REJEIT     PIC 9(15)V99.
           05  CTRRE-TRL-DT-PROC         PIC 9(08).
           05  CTRRE-TRL-FILLER          PIC X(225).
