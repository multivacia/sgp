      *****************************************************************
      * COPYBOOK.: SGDATAS                                             *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: AREA DE COMUNICACAO DE UTILITARIO DE DATAS SGCB0180 *
      * USO .....: LINKAGE-SECTION DE SGCB0180 E WORKING DOS CLIENTES  *
      *----------------------------------------------------------------*
      * FUNCOES SUPORTADAS (SG-DT-FUNCAO):                             *
      *   'VAL' - VALIDAR DATA AAAAMMDD                                *
      *   'DIF' - DIFERENCA EM DIAS ENTRE DUAS DATAS                   *
      *   'ADD' - ADICIONAR N DIAS UTEIS OU CORRIDOS                   *
      *   'DSM' - DIA DA SEMANA (1=DOM ... 7=SAB)                      *
      *   'DUT' - VERIFICA SE E DIA UTIL                               *
      *****************************************************************
       01  SGDATAS.
           05  SG-DT-FUNCAO              PIC X(03).
               88  SG-DT-VALIDAR                  VALUE 'VAL'.
               88  SG-DT-DIFERENCA                VALUE 'DIF'.
               88  SG-DT-ADD-DIAS                 VALUE 'ADD'.
               88  SG-DT-DIA-SEMANA               VALUE 'DSM'.
               88  SG-DT-DIA-UTIL                 VALUE 'DUT'.
      *
           05  SG-DT-ENTRADA-1           PIC 9(08).
           05  SG-DT-ENT-1-R    REDEFINES SG-DT-ENTRADA-1.
               10  SG-DT-ENT-1-AAAA      PIC 9(04).
               10  SG-DT-ENT-1-MM        PIC 9(02).
               10  SG-DT-ENT-1-DD        PIC 9(02).
      *
           05  SG-DT-ENTRADA-2           PIC 9(08).
           05  SG-DT-ENT-2-R    REDEFINES SG-DT-ENTRADA-2.
               10  SG-DT-ENT-2-AAAA      PIC 9(04).
               10  SG-DT-ENT-2-MM        PIC 9(02).
               10  SG-DT-ENT-2-DD        PIC 9(02).
      *
           05  SG-DT-QTD-DIAS            PIC S9(05) COMP-3.
           05  SG-DT-IND-UTEIS           PIC X(01).
               88  SG-DT-CONSIDERA-UTEIS          VALUE 'S'.
               88  SG-DT-CONSIDERA-CORRIDOS       VALUE 'N'.
      *
           05  SG-DT-SAIDA               PIC 9(08).
           05  SG-DT-SAIDA-R    REDEFINES SG-DT-SAIDA.
               10  SG-DT-SAI-AAAA        PIC 9(04).
               10  SG-DT-SAI-MM          PIC 9(02).
               10  SG-DT-SAI-DD          PIC 9(02).
      *
           05  SG-DT-DIF-DIAS            PIC S9(07) COMP-3.
           05  SG-DT-DIA-SEM-N           PIC 9(01).
               88  SG-DT-DOMINGO                  VALUE 1.
               88  SG-DT-SEGUNDA                  VALUE 2.
               88  SG-DT-TERCA                    VALUE 3.
               88  SG-DT-QUARTA                   VALUE 4.
               88  SG-DT-QUINTA                   VALUE 5.
               88  SG-DT-SEXTA                    VALUE 6.
               88  SG-DT-SABADO                   VALUE 7.
           05  SG-DT-DIA-SEM-NM          PIC X(10).
      *
           05  SG-DT-IND-VALIDO          PIC X(01).
               88  SG-DT-VALIDA                   VALUE 'S'.
               88  SG-DT-INVALIDA                 VALUE 'N'.
           05  SG-DT-IND-FIM-SEM         PIC X(01).
               88  SG-DT-E-FIM-SEM                VALUE 'S'.
               88  SG-DT-NAO-FIM-SEM              VALUE 'N'.
           05  SG-DT-IND-FERIADO         PIC X(01).
               88  SG-DT-E-FERIADO                VALUE 'S'.
               88  SG-DT-NAO-E-FERIADO            VALUE 'N'.
      *
           05  SG-DT-RETURN-CODE         PIC 9(02).
           05  SG-DT-MENSAGEM            PIC X(80).
