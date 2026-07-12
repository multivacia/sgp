      *****************************************************************
      * COPYBOOK.: SGLINTRG                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLINTRG - INTERFACE PARA SISTEMA DE RENEGOCIACAO   *
      *            SGRNG                                               *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 260     BLKSIZE: 26000                *
      * PROG ....: SGCB0160 (SAIDA)                                    *
      *****************************************************************
       01  REG-SGLINTRG.
           05  INTRG-TIPO-REG            PIC X(01).
               88  INTRG-E-HEADER                 VALUE 'H'.
               88  INTRG-E-DETAIL                 VALUE 'D'.
               88  INTRG-E-TRAILER                VALUE 'T'.
           05  INTRG-CORPO               PIC X(259).
      *
       01  REG-SGLINTRG-HDR.
           05  INTRG-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  INTRG-HDR-COD-INTERFACE   PIC X(06) VALUE 'INTRG '.
           05  INTRG-HDR-DT-REF          PIC 9(08).
           05  INTRG-HDR-HR-GERACAO      PIC 9(06).
           05  INTRG-HDR-ORIGEM          PIC X(08) VALUE 'SGCB0160'.
           05  INTRG-HDR-DESTINO         PIC X(08) VALUE 'SGRNG   '.
           05  INTRG-HDR-VERSAO          PIC X(04).
           05  INTRG-HDR-QTD-PROPOSTAS   PIC 9(09).
           05  INTRG-HDR-FILLER          PIC X(206).
      *
       01  REG-SGLINTRG-DET.
           05  INTRG-DET-TIPO            PIC X(01) VALUE 'D'.
           05  INTRG-DET-SEQ             PIC 9(09).
           05  INTRG-DET-ID-PROPOSTA     PIC 9(12).
           05  INTRG-DET-DT-GERACAO      PIC 9(08).
           05  INTRG-DET-DT-VALIDADE     PIC 9(08).
           05  INTRG-DET-ID-CONTRATO     PIC 9(12).
           05  INTRG-DET-NR-CONTRATO     PIC X(15).
           05  INTRG-DET-ID-CLIENTE      PIC 9(10).
           05  INTRG-DET-DOCUMENTO       PIC X(14).
           05  INTRG-DET-NOME            PIC X(60).
           05  INTRG-DET-NR-OPCAO        PIC 9(01).
           05  INTRG-DET-VLR-SALDO       PIC S9(13)V99 COMP-3.
           05  INTRG-DET-VLR-DESCONTO    PIC S9(13)V99 COMP-3.
           05  INTRG-DET-VLR-ENTRADA     PIC S9(13)V99 COMP-3.
           05  INTRG-DET-QT-PARCELAS     PIC 9(03).
           05  INTRG-DET-TAXA-JUROS      PIC S9(03)V99 COMP-3.
           05  INTRG-DET-VLR-PARCELA     PIC S9(13)V99 COMP-3.
           05  INTRG-DET-VLR-TOTAL       PIC S9(13)V99 COMP-3.
           05  INTRG-DET-FAIXA-ORIG      PIC X(08).
           05  INTRG-DET-RISCO-ORIG      PIC X(01).
           05  INTRG-DET-CANAL-COMUNIC   PIC X(03).
           05  INTRG-DET-URL-ACEITE      PIC X(50).
           05  INTRG-DET-FILLER          PIC X(20).
      *
       01  REG-SGLINTRG-TRL.
           05  INTRG-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  INTRG-TRL-QTD-REGS        PIC 9(09).
           05  INTRG-TRL-QTD-CONTRATOS   PIC 9(09).
           05  INTRG-TRL-SOMA-DESCONTO   PIC 9(15)V99.
           05  INTRG-TRL-SOMA-BASE       PIC 9(15)V99.
           05  INTRG-TRL-DT-REF          PIC 9(08).
           05  INTRG-TRL-FILLER          PIC X(184).
