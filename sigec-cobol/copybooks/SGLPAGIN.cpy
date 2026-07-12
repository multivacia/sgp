      *****************************************************************
      * COPYBOOK.: SGLPAGIN                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPAGIN - PAGAMENTOS RECEBIDOS DO ADQUIRENTE/PSP   *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 120     BLKSIZE: 27960                *
      * PROG ....: SGCB0040 (LEITURA E VALIDACAO)                      *
      *----------------------------------------------------------------*
      * ESTRUTURA:                                                     *
      *   HEADER  (TIPO 'H')                                           *
      *   DETAIL  (TIPO 'D')                                           *
      *   TRAILER (TIPO 'T')                                           *
      *****************************************************************
       01  REG-SGLPAGIN.
           05  PAGIN-TIPO-REG            PIC X(01).
               88  PAGIN-E-HEADER                 VALUE 'H'.
               88  PAGIN-E-DETAIL                 VALUE 'D'.
               88  PAGIN-E-TRAILER                VALUE 'T'.
           05  PAGIN-CORPO               PIC X(119).
      *
      *---------------------------------------------------------------*
      *  HEADER - LRECL 120                                           *
      *---------------------------------------------------------------*
       01  REG-SGLPAGIN-HDR.
           05  PAGIN-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  PAGIN-HDR-DT-GERACAO      PIC 9(08).
           05  PAGIN-HDR-HR-GERACAO      PIC 9(06).
           05  PAGIN-HDR-ORIGEM          PIC X(08).
           05  PAGIN-HDR-QTD-DECLARADA   PIC 9(09).
           05  PAGIN-HDR-SOMA-DECLARADA  PIC 9(15)V99.
           05  PAGIN-HDR-VERSAO-LAYOUT   PIC X(04).
           05  PAGIN-HDR-FILLER          PIC X(67).
      *
      *---------------------------------------------------------------*
      *  DETAIL - LRECL 120                                           *
      *---------------------------------------------------------------*
       01  REG-SGLPAGIN-DET.
           05  PAGIN-DET-TIPO            PIC X(01) VALUE 'D'.
           05  PAGIN-DET-ID-CONTRATO     PIC 9(12).
           05  PAGIN-DET-NR-PARCELA      PIC 9(03).
           05  PAGIN-DET-VALOR           PIC 9(13)V99.
           05  PAGIN-DET-DATA-PAGTO      PIC 9(08).
           05  PAGIN-DET-CANAL           PIC X(03).
               88  PAGIN-CANAL-BOL                VALUE 'BOL'.
               88  PAGIN-CANAL-DEB                VALUE 'DEB'.
               88  PAGIN-CANAL-PIX                VALUE 'PIX'.
               88  PAGIN-CANAL-TED                VALUE 'TED'.
               88  PAGIN-CANAL-DOC                VALUE 'DOC'.
               88  PAGIN-CANAL-CAR                VALUE 'CAR'.
           05  PAGIN-DET-NR-DOC-PAGTO    PIC X(20).
           05  PAGIN-DET-CD-BANCO        PIC 9(03).
           05  PAGIN-DET-CD-AGENCIA      PIC 9(05).
           05  PAGIN-DET-CD-AUTORIZAC    PIC X(20).
           05  PAGIN-DET-FILLER          PIC X(28).
      *
      *---------------------------------------------------------------*
      *  TRAILER - LRECL 120                                          *
      *---------------------------------------------------------------*
       01  REG-SGLPAGIN-TRL.
           05  PAGIN-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  PAGIN-TRL-QTD-REGS        PIC 9(09).
           05  PAGIN-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  PAGIN-TRL-DT-GERACAO      PIC 9(08).
           05  PAGIN-TRL-FILLER          PIC X(85).
