      *****************************************************************
      * COPYBOOK.: SGLPROP                                             *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPROP - PROPOSTAS DE RENEGOCIACAO GERADAS         *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 260     BLKSIZE: 26000                *
      * PROG ....: SGCB0130 (SAIDA), SGCB0160 (LEITURA)                *
      *----------------------------------------------------------------*
      * ATE 3 OPCOES POR CONTRATO ELEGIVEL. VER REGRAS_NEGOCIO SEC.7.  *
      *****************************************************************
       01  REG-SGLPROP.
           05  PROP-TIPO-REG             PIC X(01).
               88  PROP-E-HEADER                  VALUE 'H'.
               88  PROP-E-DETAIL                  VALUE 'D'.
               88  PROP-E-TRAILER                 VALUE 'T'.
           05  PROP-CORPO                PIC X(259).
      *
       01  REG-SGLPROP-HDR.
           05  PROP-HDR-TIPO             PIC X(01) VALUE 'H'.
           05  PROP-HDR-DT-REF           PIC 9(08).
           05  PROP-HDR-PROG-ORIGEM      PIC X(08) VALUE 'SGCB0130'.
           05  PROP-HDR-QTD-PROPOSTAS    PIC 9(09).
           05  PROP-HDR-QTD-CONTRATOS    PIC 9(09).
           05  PROP-HDR-FILLER           PIC X(225).
      *
       01  REG-SGLPROP-DET.
           05  PROP-DET-TIPO             PIC X(01) VALUE 'D'.
           05  PROP-DET-ID-PROPOSTA      PIC 9(12).
           05  PROP-DET-DT-GERACAO       PIC 9(08).
           05  PROP-DET-ID-CONTRATO      PIC 9(12).
           05  PROP-DET-NR-CONTRATO      PIC X(15).
           05  PROP-DET-ID-CLIENTE       PIC 9(10).
           05  PROP-DET-DOCUMENTO        PIC X(14).
           05  PROP-DET-NOME             PIC X(60).
           05  PROP-DET-NR-OPCAO         PIC 9(01).
               88  PROP-OPCAO-1                   VALUE 1.
               88  PROP-OPCAO-2                   VALUE 2.
               88  PROP-OPCAO-3                   VALUE 3.
           05  PROP-DET-VLR-SALDO-ORIG   PIC S9(13)V99 COMP-3.
           05  PROP-DET-VLR-DESCONTO     PIC S9(13)V99 COMP-3.
           05  PROP-DET-PCT-DESCONTO     PIC S9(03)V99 COMP-3.
           05  PROP-DET-VLR-BASE-REN     PIC S9(13)V99 COMP-3.
           05  PROP-DET-PCT-ENTRADA      PIC S9(03)V99 COMP-3.
           05  PROP-DET-VLR-ENTRADA      PIC S9(13)V99 COMP-3.
           05  PROP-DET-QT-PARC-NOVAS    PIC 9(03).
           05  PROP-DET-TAXA-JUROS-REN   PIC S9(03)V99 COMP-3.
           05  PROP-DET-VLR-PARCELA      PIC S9(13)V99 COMP-3.
           05  PROP-DET-VLR-TOTAL-REN    PIC S9(13)V99 COMP-3.
           05  PROP-DET-DT-VALIDADE      PIC 9(08).
           05  PROP-DET-FAIXA-ORIG       PIC X(08).
           05  PROP-DET-RISCO-ORIG       PIC X(01).
           05  PROP-DET-STATUS           PIC X(10).
               88  PROP-ST-GERADA                 VALUE 'GERADA    '.
               88  PROP-ST-ENVIADA                VALUE 'ENVIADA   '.
               88  PROP-ST-ACEITA                 VALUE 'ACEITA    '.
               88  PROP-ST-RECUSADA               VALUE 'RECUSADA  '.
               88  PROP-ST-EXPIRADA               VALUE 'EXPIRADA  '.
           05  PROP-DET-FILLER           PIC X(19).
      *
       01  REG-SGLPROP-TRL.
           05  PROP-TRL-TIPO             PIC X(01) VALUE 'T'.
           05  PROP-TRL-QTD-REGS         PIC 9(09).
           05  PROP-TRL-QTD-CONTRATOS    PIC 9(09).
           05  PROP-TRL-SOMA-DESCONTO    PIC 9(15)V99.
           05  PROP-TRL-SOMA-BASE-REN    PIC 9(15)V99.
           05  PROP-TRL-DT-REF           PIC 9(08).
           05  PROP-TRL-FILLER           PIC X(184).
