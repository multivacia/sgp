      *****************************************************************
      * COPYBOOK.: SGLESTAT                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLESTAT - ESTATISTICAS DE VALIDACAO E PROCESSAMENTO*
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 150     BLKSIZE: 27000                *
      * PROG ....: TODOS OS SGCB* (APPEND), SGCB0190 (LEITURA)         *
      *----------------------------------------------------------------*
      * UMA LINHA POR CONTADOR/METRICA/EXECUCAO. FORMATO CHAVE-VALOR   *
      * COM DIMENSAO OPCIONAL.                                         *
      *****************************************************************
       01  REG-SGLESTAT.
           05  ESTAT-DT-REF              PIC 9(08).
           05  ESTAT-HR-COLETA           PIC 9(06).
           05  ESTAT-ID-EXECUCAO         PIC X(12).
           05  ESTAT-PROG-ORIGEM         PIC X(08).
           05  ESTAT-CD-METRICA          PIC X(30).
      *---- METRICAS TIPICAS ----------------------------------------*
      *      'CTR-LIDOS                     '                          *
      *      'CTR-VALIDOS                   '                          *
      *      'CTR-REJEITADOS                '                          *
      *      'CTR-CARREGADOS                '                          *
      *      'PAG-LIDOS                     '                          *
      *      'PAG-VALIDOS                   '                          *
      *      'PAG-APLICADOS                 '                          *
      *      'PAG-PENDENTES                 '                          *
      *      'ENC-CALCULADOS                '                          *
      *      'INAD-LEVE                     '                          *
      *      'INAD-MODERADA                 '                          *
      *      'INAD-GRAVE                    '                          *
      *      'INAD-CRITICA                  '                          *
      *      'PROP-GERADAS                  '                          *
      *      'RISCO-A                       '                          *
      *      'RISCO-B                       '                          *
      *      'RISCO-C                       '                          *
      *      'RISCO-D                       '                          *
      *      'RISCO-E                       '                          *
           05  ESTAT-DIMENSAO            PIC X(20).
           05  ESTAT-CATEGORIA           PIC X(15).
           05  ESTAT-VLR-INTEIRO         PIC S9(15) COMP-3.
           05  ESTAT-VLR-DECIMAL         PIC S9(15)V99 COMP-3.
           05  ESTAT-VLR-PCT             PIC S9(05)V99 COMP-3.
           05  ESTAT-UNIDADE             PIC X(05).
               88  ESTAT-UN-QTD                   VALUE 'QT   '.
               88  ESTAT-UN-VLR                   VALUE 'BRL  '.
               88  ESTAT-UN-PCT                   VALUE 'PCT  '.
               88  ESTAT-UN-SEG                   VALUE 'SEG  '.
               88  ESTAT-UN-MS                    VALUE 'MS   '.
           05  ESTAT-FILLER              PIC X(15).
