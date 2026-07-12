      *****************************************************************
      * COPYBOOK.: SGLPAGRE                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPAGRE - PAGAMENTOS REJEITADOS EM SGCB0040        *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 200     BLKSIZE: 27800                *
      * PROG ....: SGCB0040 (SAIDA) - SGCB0190 (LEITURA REL. ERROS)    *
      *****************************************************************
       01  REG-SGLPAGRE.
           05  PAGRE-TIPO-REG            PIC X(01).
               88  PAGRE-E-HEADER                 VALUE 'H'.
               88  PAGRE-E-DETAIL                 VALUE 'D'.
               88  PAGRE-E-TRAILER                VALUE 'T'.
           05  PAGRE-CORPO               PIC X(199).
      *
       01  REG-SGLPAGRE-HDR.
           05  PAGRE-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  PAGRE-HDR-DT-PROC         PIC 9(08).
           05  PAGRE-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0040'.
           05  PAGRE-HDR-QTD-REJEIT      PIC 9(09).
           05  PAGRE-HDR-FILLER          PIC X(174).
      *
       01  REG-SGLPAGRE-DET.
           05  PAGRE-DET-TIPO            PIC X(01) VALUE 'D'.
           05  PAGRE-DET-SEQ             PIC 9(09).
           05  PAGRE-DET-ID-CONTRATO     PIC 9(12).
           05  PAGRE-DET-NR-PARCELA      PIC 9(03).
           05  PAGRE-DET-VALOR           PIC 9(13)V99.
           05  PAGRE-DET-DATA-PAGTO      PIC 9(08).
           05  PAGRE-DET-CANAL           PIC X(03).
           05  PAGRE-DET-NR-DOC-PAGTO    PIC X(20).
           05  PAGRE-DET-CD-MOTIVO       PIC X(20).
           05  PAGRE-DET-MOTIVO          PIC X(40).
           05  PAGRE-DET-CAMPO-ORIG      PIC X(20).
           05  PAGRE-DET-VALOR-ORIG      PIC X(30).
           05  PAGRE-DET-DT-REJEICAO     PIC 9(08).
           05  PAGRE-DET-FILLER          PIC X(11).
      *
       01  REG-SGLPAGRE-TRL.
           05  PAGRE-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  PAGRE-TRL-QTD-REGS        PIC 9(09).
           05  PAGRE-TRL-SOMA-REJEIT     PIC 9(15)V99.
           05  PAGRE-TRL-DT-PROC         PIC 9(08).
           05  PAGRE-TRL-FILLER          PIC X(165).
