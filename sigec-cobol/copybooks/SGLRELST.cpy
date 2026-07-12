      *****************************************************************
      * COPYBOOK.: SGLRELST                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLRELST - RELATORIO SINTETICO (AGREGADO) DO DIA    *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FBA    LRECL: 133     BLKSIZE: 27930                *
      * PROG ....: SGCB0190 (SAIDA)                                    *
      *----------------------------------------------------------------*
      * AGREGA EVENTOS POR DIMENSAO (CANAL, TIPO CLIENTE, TIPO CTR,    *
      * FAIXA INADIMPLENCIA, CLASSE RISCO).                            *
      *****************************************************************
       01  REG-SGLRELST.
           05  RELST-CTL                 PIC X(01).
           05  RELST-TIPO-LINHA          PIC X(02).
               88  RELST-LT-CAB                   VALUE 'CB'.
               88  RELST-LT-SEC                   VALUE 'SE'.
               88  RELST-LT-DET                   VALUE 'DT'.
               88  RELST-LT-SUB                   VALUE 'SB'.
               88  RELST-LT-TOT                   VALUE 'TT'.
           05  RELST-DT-REF-EDIT         PIC X(10).
           05  RELST-DIMENSAO            PIC X(20).
               88  RELST-DIM-CANAL                VALUE
                   'CANAL PAGAMENTO     '.
               88  RELST-DIM-TIPO-CLI             VALUE
                   'TIPO CLIENTE        '.
               88  RELST-DIM-TIPO-CTR             VALUE
                   'TIPO CONTRATO       '.
               88  RELST-DIM-FAIXA                VALUE
                   'FAIXA INADIMPLENCIA '.
               88  RELST-DIM-RISCO                VALUE
                   'CLASSE RISCO        '.
           05  RELST-CATEGORIA           PIC X(15).
           05  RELST-QT-CONTRATOS-EDIT   PIC X(11).
           05  RELST-QT-CLIENTES-EDIT    PIC X(11).
           05  RELST-QT-PAGTOS-EDIT      PIC X(11).
           05  RELST-VLR-CARTEIRA-EDIT   PIC X(20).
           05  RELST-VLR-PAGO-EDIT       PIC X(20).
           05  RELST-VLR-ENC-EDIT        PIC X(18).
           05  RELST-FILLER              PIC X(01).
      *
      *---------------------------------------------------------------*
      *  ACUMULADORES INTERNOS - AREA WORKING DO PROGRAMA             *
      *---------------------------------------------------------------*
       01  WS-RELST-ACUM.
           05  WS-RELST-ACUM-QT-CTR      PIC 9(11) VALUE ZERO.
           05  WS-RELST-ACUM-QT-CLI      PIC 9(11) VALUE ZERO.
           05  WS-RELST-ACUM-QT-PAG      PIC 9(11) VALUE ZERO.
           05  WS-RELST-ACUM-VL-CART     PIC S9(17)V99 COMP-3
                                                    VALUE ZERO.
           05  WS-RELST-ACUM-VL-PAGO     PIC S9(17)V99 COMP-3
                                                    VALUE ZERO.
           05  WS-RELST-ACUM-VL-ENC      PIC S9(15)V99 COMP-3
                                                    VALUE ZERO.
