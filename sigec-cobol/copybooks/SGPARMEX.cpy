      *****************************************************************
      * COPYBOOK.: SGPARMEX                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: PARAMETROS DE EXECUCAO RECEBIDOS VIA PARM DO JCL    *
      *            E/OU CARREGADOS DE SGLPARM PELO DRIVER SGCB0010     *
      * USO .....: WORKING-STORAGE DO PROGRAMA CHAMADOR                *
      *----------------------------------------------------------------*
      * OS DEFAULTS E FAIXAS PERMITIDAS ESTAO EM                       *
      * docs/REGRAS_NEGOCIO.md SECAO 9.                                *
      *****************************************************************
       01  SGPARMEX.
      *---- DATA E JANELA -------------------------------------------- *
           05  SG-PX-DT-PROCESSAMENTO    PIC 9(08).
           05  SG-PX-DT-REPROC           PIC 9(08).
           05  SG-PX-JANELA              PIC X(03).
               88  SG-PX-JANELA-DIARIA            VALUE 'DIA'.
               88  SG-PX-JANELA-MENSAL            VALUE 'MES'.
               88  SG-PX-JANELA-EXTRA             VALUE 'EXT'.
      *---- FLAGS DE COMPORTAMENTO ------------------------------------*
           05  SG-PX-FL-INCLUI-CRITICA   PIC X(01).
               88  SG-PX-INCLUI-CRITICA           VALUE 'S'.
               88  SG-PX-NAO-INC-CRITICA          VALUE 'N'.
           05  SG-PX-FL-ES-RISCO-LIVRE   PIC X(01).
               88  SG-PX-ES-RISCO-LIVRE           VALUE 'S'.
               88  SG-PX-ES-RISCO-FIXO            VALUE 'N'.
           05  SG-PX-FL-SIMULA-DB2       PIC X(01).
               88  SG-PX-SIMULA-DB2               VALUE 'S'.
               88  SG-PX-REAL-DB2                 VALUE 'N'.
           05  SG-PX-FL-GERA-INTERFACES  PIC X(01).
               88  SG-PX-GERA-INTERFACES          VALUE 'S'.
               88  SG-PX-NAO-GERA-INTERFACES      VALUE 'N'.
           05  SG-PX-FL-GERA-RELATORIOS  PIC X(01).
               88  SG-PX-GERA-RELATORIOS          VALUE 'S'.
               88  SG-PX-NAO-GERA-RELAT           VALUE 'N'.
      *---- LIMITES DE COMMIT E LOTES ---------------------------------*
           05  SG-PX-LIMITE-COMMIT       PIC 9(05) VALUE 01000.
           05  SG-PX-LIMITE-ERROS        PIC 9(05) VALUE 00500.
           05  SG-PX-LIMITE-CTR-DIA      PIC 9(07) VALUE 0100000.
           05  SG-PX-LIMITE-PAG-DIA      PIC 9(07) VALUE 0500000.
      *---- FAIXAS DE INADIMPLENCIA (DIAS) ----------------------------*
           05  SG-PX-DIAS-INAD-LEVE      PIC 9(03) VALUE 005.
           05  SG-PX-DIAS-INAD-MOD       PIC 9(03) VALUE 030.
           05  SG-PX-DIAS-INAD-GRAVE     PIC 9(03) VALUE 060.
           05  SG-PX-DIAS-INAD-CRIT      PIC 9(03) VALUE 090.
      *---- DESCONTOS PADRAO EM RENEGOCIACAO --------------------------*
           05  SG-PX-PCT-DESC-MOD        PIC 9(03) VALUE 020.
           05  SG-PX-PCT-DESC-GRAVE      PIC 9(03) VALUE 030.
           05  SG-PX-PCT-DESC-CRIT       PIC 9(03) VALUE 050.
      *---- IDENTIFICACAO DA EXECUCAO ---------------------------------*
           05  SG-PX-ID-EXECUCAO         PIC X(12).
           05  SG-PX-USUARIO             PIC X(08).
           05  SG-PX-AMBIENTE            PIC X(03).
           05  SG-PX-FILLER              PIC X(20).
