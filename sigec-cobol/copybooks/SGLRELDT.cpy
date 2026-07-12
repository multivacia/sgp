      *****************************************************************
      * COPYBOOK.: SGLRELDT                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLRELDT - RELATORIO DETALHADO DE EVENTOS DO DIA    *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FBA    LRECL: 133     BLKSIZE: 27930                *
      * PROG ....: SGCB0190 (SAIDA)                                    *
      *----------------------------------------------------------------*
      * PRIMEIRA POSICAO USADA PARA CONTROLE DE CARRO (FBA).           *
      * UM REGISTRO POR EVENTO OPERACIONAL (CTR CARREGADO, PAG APLIC,  *
      * ENCARGO CALC, INADIMPLENCIA DETECT, PROPOSTA GERADA, REJEIC.). *
      *****************************************************************
       01  REG-SGLRELDT.
           05  RELDT-CTL                 PIC X(01).
               88  RELDT-CTL-NORMAL               VALUE ' '.
               88  RELDT-CTL-SALTA-1              VALUE '0'.
               88  RELDT-CTL-SALTA-2              VALUE '-'.
               88  RELDT-CTL-NOVA-PAGINA          VALUE '1'.
           05  RELDT-TIPO-LINHA          PIC X(02).
               88  RELDT-LT-CAB                   VALUE 'CB'.
               88  RELDT-LT-DET                   VALUE 'DT'.
               88  RELDT-LT-SUB                   VALUE 'SB'.
               88  RELDT-LT-TOT                   VALUE 'TT'.
           05  RELDT-DATA-EDIT           PIC X(10).
           05  RELDT-HORA-EDIT           PIC X(08).
           05  RELDT-EVENTO              PIC X(20).
           05  RELDT-CD-EVENTO           PIC X(10).
           05  RELDT-ID-CONTRATO         PIC X(12).
           05  RELDT-NR-CONTRATO         PIC X(15).
           05  RELDT-DOCUMENTO           PIC X(14).
           05  RELDT-CANAL               PIC X(03).
           05  RELDT-VALOR-EDIT          PIC X(18).
           05  RELDT-QUANT-EDIT          PIC X(09).
           05  RELDT-STATUS              PIC X(10).
           05  RELDT-FILLER              PIC X(01).
