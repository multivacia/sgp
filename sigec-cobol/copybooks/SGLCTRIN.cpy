      *****************************************************************
      * COPYBOOK.: SGLCTRIN                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLCTRIN - CONTRATOS RECEBIDOS DO ORIGINADOR        *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 200     BLKSIZE: 27800                *
      * PROG ....: SGCB0020 (LEITURA E VALIDACAO)                      *
      *----------------------------------------------------------------*
      * ESTRUTURA:                                                     *
      *   HEADER  (TIPO 'H') - 1 REGISTRO NO INICIO DO ARQUIVO         *
      *   DETAIL  (TIPO 'D') - N REGISTROS DE CONTRATOS                *
      *   TRAILER (TIPO 'T') - 1 REGISTRO NO FIM COM QT+SOMA           *
      *****************************************************************
       01  REG-SGLCTRIN.
           05  CTRIN-TIPO-REG            PIC X(01).
               88  CTRIN-E-HEADER                 VALUE 'H'.
               88  CTRIN-E-DETAIL                 VALUE 'D'.
               88  CTRIN-E-TRAILER                VALUE 'T'.
           05  CTRIN-CORPO               PIC X(199).
      *
      *---------------------------------------------------------------*
      *  HEADER - LRECL 200                                           *
      *---------------------------------------------------------------*
       01  REG-SGLCTRIN-HDR.
           05  CTRIN-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  CTRIN-HDR-DT-GERACAO      PIC 9(08).
           05  CTRIN-HDR-HR-GERACAO      PIC 9(06).
           05  CTRIN-HDR-ORIGEM          PIC X(08).
           05  CTRIN-HDR-QTD-DECLARADA   PIC 9(09).
           05  CTRIN-HDR-VERSAO-LAYOUT   PIC X(04).
           05  CTRIN-HDR-FILLER          PIC X(164).
      *
      *---------------------------------------------------------------*
      *  DETAIL - LRECL 200                                           *
      *---------------------------------------------------------------*
       01  REG-SGLCTRIN-DET.
           05  CTRIN-DET-TIPO            PIC X(01) VALUE 'D'.
           05  CTRIN-DET-NR-CONTRATO     PIC X(15).
           05  CTRIN-DET-TIPO-DOC        PIC X(03).
           05  CTRIN-DET-DOCUMENTO       PIC X(14).
           05  CTRIN-DET-NOME            PIC X(60).
           05  CTRIN-DET-TIPO-CLIENTE    PIC X(02).
           05  CTRIN-DET-TIPO-CONTRATO   PIC X(02).
           05  CTRIN-DET-VALOR-TOTAL     PIC 9(13)V99.
           05  CTRIN-DET-QTD-PARCELAS    PIC 9(03).
           05  CTRIN-DET-DATA-INICIO     PIC 9(08).
           05  CTRIN-DET-TAXA-JUROS      PIC 9(03)V99.
           05  CTRIN-DET-PCT-MULTA       PIC 9(03)V99.
           05  CTRIN-DET-FILLER          PIC X(67).
      *
      *---------------------------------------------------------------*
      *  TRAILER - LRECL 200                                          *
      *---------------------------------------------------------------*
       01  REG-SGLCTRIN-TRL.
           05  CTRIN-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  CTRIN-TRL-QTD-REGS        PIC 9(09).
           05  CTRIN-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  CTRIN-TRL-DT-GERACAO      PIC 9(08).
           05  CTRIN-TRL-FILLER          PIC X(165).
