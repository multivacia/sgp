      *****************************************************************
      * COPYBOOK.: SGLPARM                                             *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPARM - PARAMETROS COMPLEMENTARES DE EXECUCAO     *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 100     BLKSIZE: 27900                *
      * PROG ....: SGCB0010 (LEITURA NO INICIO DA JANELA)              *
      *----------------------------------------------------------------*
      * ARQUIVO CHAVE-VALOR. UMA LINHA POR PARAMETRO CONFIGURAVEL.     *
      * CARREGADO PELO DRIVER E POPULA A AREA SGPARMEX.                *
      *****************************************************************
       01  REG-SGLPARM.
           05  PARM-CHAVE                PIC X(30).
      *---- CHAVES CONHECIDAS ----------------------------------------*
      *      'LIMITE-COMMIT               '                            *
      *      'LIMITE-ERROS                '                            *
      *      'LIMITE-CTR-DIA              '                            *
      *      'LIMITE-PAG-DIA              '                            *
      *      'DIAS-INAD-LEVE              '                            *
      *      'DIAS-INAD-MOD               '                            *
      *      'DIAS-INAD-GRAVE             '                            *
      *      'DIAS-INAD-CRIT              '                            *
      *      'PCT-DESC-MOD                '                            *
      *      'PCT-DESC-GRAVE              '                            *
      *      'PCT-DESC-CRIT               '                            *
      *      'FL-INCLUI-CRITICA           '                            *
      *      'FL-ES-RISCO-LIVRE           '                            *
      *      'FL-SIMULA-DB2               '                            *
      *      'FL-GERA-INTERFACES          '                            *
      *      'FL-GERA-RELATORIOS          '                            *
           05  PARM-TIPO                 PIC X(01).
               88  PARM-TIPO-NUMERICO             VALUE 'N'.
               88  PARM-TIPO-FLAG                 VALUE 'F'.
               88  PARM-TIPO-TEXTO                VALUE 'T'.
               88  PARM-TIPO-DATA                 VALUE 'D'.
           05  PARM-VALOR                PIC X(30).
           05  PARM-DT-VIGENCIA-INI      PIC 9(08).
           05  PARM-DT-VIGENCIA-FIM      PIC 9(08).
           05  PARM-DESCRICAO            PIC X(15).
           05  PARM-USUARIO-ALT          PIC X(08).
      *
      *---------------------------------------------------------------*
      *  AREA WORKING DE CARREGAMENTO                                 *
      *---------------------------------------------------------------*
       01  WS-PARM-CARGA.
           05  WS-PARM-QTD-LIDAS         PIC 9(05) VALUE ZERO.
           05  WS-PARM-QTD-APLIC         PIC 9(05) VALUE ZERO.
           05  WS-PARM-QTD-IGNOR         PIC 9(05) VALUE ZERO.
           05  WS-PARM-FL-COMPLETO       PIC X(01) VALUE 'N'.
               88  WS-PARM-CARGA-OK               VALUE 'S'.
               88  WS-PARM-CARGA-INCOMPLETA       VALUE 'N'.
