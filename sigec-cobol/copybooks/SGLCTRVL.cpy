      *****************************************************************
      * COPYBOOK.: SGLCTRVL                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLCTRVL - CONTRATOS VALIDOS APROVADOS EM SGCB0020  *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 220     BLKSIZE: 27060                *
      * PROG ....: SGCB0020 (SAIDA) - SGCB0030 (ENTRADA)               *
      *----------------------------------------------------------------*
      * MESMO CONTEUDO DE DETAIL DE SGLCTRIN COM FLAGS DE VALIDACAO,   *
      * TIMESTAMP DE APROVACAO E ORIGEM DA APROVACAO.                  *
      *****************************************************************
       01  REG-SGLCTRVL.
           05  CTRVL-TIPO-REG            PIC X(01).
               88  CTRVL-E-HEADER                 VALUE 'H'.
               88  CTRVL-E-DETAIL                 VALUE 'D'.
               88  CTRVL-E-TRAILER                VALUE 'T'.
           05  CTRVL-CORPO               PIC X(219).
      *
      *---------------------------------------------------------------*
      *  HEADER - LRECL 220                                           *
      *---------------------------------------------------------------*
       01  REG-SGLCTRVL-HDR.
           05  CTRVL-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  CTRVL-HDR-DT-PROC         PIC 9(08).
           05  CTRVL-HDR-HR-PROC         PIC 9(06).
           05  CTRVL-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0020'.
           05  CTRVL-HDR-QTD-VALIDOS     PIC 9(09).
           05  CTRVL-HDR-VERSAO-LAYOUT   PIC X(04).
           05  CTRVL-HDR-FILLER          PIC X(184).
      *
      *---------------------------------------------------------------*
      *  DETAIL - LRECL 220                                           *
      *---------------------------------------------------------------*
       01  REG-SGLCTRVL-DET.
           05  CTRVL-DET-TIPO            PIC X(01) VALUE 'D'.
           05  CTRVL-DET-NR-CONTRATO     PIC X(15).
           05  CTRVL-DET-TIPO-DOC        PIC X(03).
           05  CTRVL-DET-DOCUMENTO       PIC X(14).
           05  CTRVL-DET-NOME            PIC X(60).
           05  CTRVL-DET-TIPO-CLIENTE    PIC X(02).
           05  CTRVL-DET-TIPO-CONTRATO   PIC X(02).
           05  CTRVL-DET-VALOR-TOTAL     PIC 9(13)V99.
           05  CTRVL-DET-QTD-PARCELAS    PIC 9(03).
           05  CTRVL-DET-DATA-INICIO     PIC 9(08).
           05  CTRVL-DET-TAXA-JUROS      PIC 9(03)V99.
           05  CTRVL-DET-PCT-MULTA       PIC 9(03)V99.
      *---- FLAGS DE VALIDACAO ---------------------------------------*
           05  CTRVL-DET-FL-CLI-NOVO     PIC X(01).
               88  CTRVL-CLI-NOVO                 VALUE 'S'.
               88  CTRVL-CLI-EXISTE               VALUE 'N'.
           05  CTRVL-DET-FL-DOC-OK       PIC X(01).
           05  CTRVL-DET-FL-DT-OK        PIC X(01).
           05  CTRVL-DET-FL-TAXA-OK      PIC X(01).
           05  CTRVL-DET-DT-APROVACAO    PIC 9(08).
           05  CTRVL-DET-HR-APROVACAO    PIC 9(06).
           05  CTRVL-DET-CD-VALIDADOR    PIC X(08) VALUE 'SGCB0020'.
           05  CTRVL-DET-FILLER          PIC X(60).
      *
      *---------------------------------------------------------------*
      *  TRAILER - LRECL 220                                          *
      *---------------------------------------------------------------*
       01  REG-SGLCTRVL-TRL.
           05  CTRVL-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  CTRVL-TRL-QTD-REGS        PIC 9(09).
           05  CTRVL-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  CTRVL-TRL-DT-PROC         PIC 9(08).
           05  CTRVL-TRL-FILLER          PIC X(185).
