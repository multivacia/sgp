      *****************************************************************
      * COPYBOOK.: SGLVARAR                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLVARAR - ARQUIVO DE LAYOUT VARIAVEL (VB)          *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: VB     LRECL MAXIMO: 400   BLKSIZE: 27998           *
      * PROG ....: NAO INTEGRADO AO FLUXO PADRAO (PONTO FORA COBERTURA)*
      *----------------------------------------------------------------*
      * ARQUIVO EXPERIMENTAL COM MULTIPLOS LAYOUTS DE REGISTRO NO      *
      * MESMO ARQUIVO, DIFERENCIADOS PELO CAMPO SGVA-TIPO. UTILIZA     *
      * REDEFINES PARA MAPEAR CADA TIPO SOBRE O CORPO GENERICO.        *
      *                                                                *
      * FD DEVE USAR:                                                  *
      *   FD  SGLVARAR                                                 *
      *       RECORDING MODE V                                         *
      *       RECORD IS VARYING IN SIZE FROM 50 TO 400 CHARACTERS      *
      *       DEPENDING ON WS-SGVA-TAMANHO.                            *
      *                                                                *
      * TIPOS SUPORTADOS:                                              *
      *   'C' - RESUMO DE CONTRATO                (LRECL ~150)         *
      *   'P' - RESUMO DE PAGAMENTO               (LRECL ~120)         *
      *   'E' - EVENTO OPERACIONAL                (LRECL ~200)         *
      *   'X' - REGISTRO EXTENDIDO COM PAYLOAD    (LRECL ~400)         *
      *****************************************************************
      *
      *---------------------------------------------------------------*
      *  CABECALHO COMUM (SEMPRE PRESENTE - 42 BYTES)                 *
      *---------------------------------------------------------------*
       01  REG-SGLVARAR.
           05  SGVA-CABECALHO.
               10  SGVA-TIPO             PIC X(01).
                   88  SGVA-TIPO-CTR              VALUE 'C'.
                   88  SGVA-TIPO-PAG              VALUE 'P'.
                   88  SGVA-TIPO-EVT              VALUE 'E'.
                   88  SGVA-TIPO-EXT              VALUE 'X'.
                   88  SGVA-TIPO-VALIDO           VALUES
                       'C' 'P' 'E' 'X'.
               10  SGVA-TAMANHO          PIC 9(04).
               10  SGVA-SEQ              PIC 9(09).
               10  SGVA-DT-EVENTO        PIC 9(08).
               10  SGVA-HR-EVENTO        PIC 9(06).
               10  SGVA-ID-EXECUCAO      PIC X(12).
               10  SGVA-ORIGEM           PIC X(02).
      *
      *---------------------------------------------------------------*
      *  CORPO GENERICO E REDEFINES POR TIPO                          *
      *  MAXIMO 358 BYTES DE CORPO (400 - 42 CABECALHO)               *
      *---------------------------------------------------------------*
           05  SGVA-CORPO                PIC X(358).
      *
      *---------------------------------------------------------------*
      *  LAYOUT 'C' - RESUMO DE CONTRATO                              *
      *---------------------------------------------------------------*
           05  SGVA-C-CONTRATO REDEFINES SGVA-CORPO.
               10  SGVA-C-ID-CONTRATO    PIC 9(12).
               10  SGVA-C-NR-CONTRATO    PIC X(15).
               10  SGVA-C-TIPO-CTR       PIC X(02).
               10  SGVA-C-DOCUMENTO      PIC X(14).
               10  SGVA-C-VLR-TOTAL      PIC S9(13)V99 COMP-3.
               10  SGVA-C-VLR-SALDO      PIC S9(13)V99 COMP-3.
               10  SGVA-C-QT-PARCELAS    PIC 9(03).
               10  SGVA-C-DT-INICIO      PIC 9(08).
               10  SGVA-C-DT-FIM         PIC 9(08).
               10  SGVA-C-SITUACAO       PIC X(02).
               10  SGVA-C-CLASSE-RISCO   PIC X(01).
               10  SGVA-C-FILLER         PIC X(285).
      *
      *---------------------------------------------------------------*
      *  LAYOUT 'P' - RESUMO DE PAGAMENTO                             *
      *---------------------------------------------------------------*
           05  SGVA-P-PAGAMENTO REDEFINES SGVA-CORPO.
               10  SGVA-P-ID-CONTRATO    PIC 9(12).
               10  SGVA-P-NR-PARCELA     PIC 9(03).
               10  SGVA-P-VALOR          PIC S9(13)V99 COMP-3.
               10  SGVA-P-DT-PAGTO       PIC 9(08).
               10  SGVA-P-CANAL          PIC X(03).
               10  SGVA-P-NR-DOC         PIC X(20).
               10  SGVA-P-SALDO-ANT      PIC S9(13)V99 COMP-3.
               10  SGVA-P-SALDO-NOVO     PIC S9(13)V99 COMP-3.
               10  SGVA-P-FL-PARCIAL     PIC X(01).
               10  SGVA-P-FILLER         PIC X(295).
      *
      *---------------------------------------------------------------*
      *  LAYOUT 'E' - EVENTO OPERACIONAL                              *
      *---------------------------------------------------------------*
           05  SGVA-E-EVENTO REDEFINES SGVA-CORPO.
               10  SGVA-E-CD-EVENTO      PIC X(20).
               10  SGVA-E-ID-CONTRATO    PIC 9(12).
               10  SGVA-E-ID-CLIENTE     PIC 9(10).
               10  SGVA-E-SEVERIDADE     PIC 9(02).
               10  SGVA-E-VLR-BASE       PIC S9(13)V99 COMP-3.
               10  SGVA-E-MENSAGEM       PIC X(80).
               10  SGVA-E-DIMENSAO-1     PIC X(20).
               10  SGVA-E-VALOR-1        PIC X(30).
               10  SGVA-E-DIMENSAO-2     PIC X(20).
               10  SGVA-E-VALOR-2        PIC X(30).
               10  SGVA-E-USUARIO        PIC X(08).
               10  SGVA-E-FILLER         PIC X(118).
      *
      *---------------------------------------------------------------*
      *  LAYOUT 'X' - REGISTRO EXTENDIDO COM PAYLOAD LIVRE            *
      *---------------------------------------------------------------*
           05  SGVA-X-EXTENDIDO REDEFINES SGVA-CORPO.
               10  SGVA-X-CD-CONTEXTO    PIC X(30).
               10  SGVA-X-VERSAO-PAYLOAD PIC X(04).
               10  SGVA-X-QT-CAMPOS      PIC 9(03).
               10  SGVA-X-PAYLOAD.
                   15  SGVA-X-CAMPO OCCURS 1 TO 30 TIMES
                                    DEPENDING ON SGVA-X-QT-CAMPOS.
                       20  SGVA-X-CD-CAMPO    PIC X(10).
                       20  SGVA-X-CD-TIPO     PIC X(01).
                       20  SGVA-X-VLR-CAMPO   PIC X(40).
      *
      *---------------------------------------------------------------*
      *  AREA WORKING PARA CONTROLE DE TAMANHO VARIAVEL               *
      *---------------------------------------------------------------*
       01  WS-SGVA-CTRL.
           05  WS-SGVA-TAMANHO           PIC 9(04) COMP.
           05  WS-SGVA-QTD-LIDOS         PIC 9(09) COMP-3.
           05  WS-SGVA-QTD-GRAVADOS      PIC 9(09) COMP-3.
           05  WS-SGVA-TAM-MIN           PIC 9(04) COMP VALUE 0050.
           05  WS-SGVA-TAM-MAX           PIC 9(04) COMP VALUE 0400.
