      *****************************************************************
      * COPYBOOK.: SGLFERIA                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLFERIA - CALENDARIO DE FERIADOS                   *
      * ORGANIZ .: SEQUENCIAL (ORDENADO POR DATA)                      *
      * RECFM ...: FB     LRECL: 80      BLKSIZE: 27920                *
      * PROG ....: SGCB0180 (LEITURA - VALIDACAO DE DIA UTIL)          *
      *----------------------------------------------------------------*
      * ARQUIVO ANUAL COM FERIADOS NACIONAIS, ESTADUAIS E MUNICIPAIS.  *
      * DIA NAO UTIL EM QUALQUER ESCOPO CANCELA JANELA BATCH.          *
      *****************************************************************
       01  REG-SGLFERIA.
           05  FERIA-DT-FERIADO          PIC 9(08).
           05  FERIA-DT-FERIADO-R REDEFINES FERIA-DT-FERIADO.
               10  FERIA-DT-AAAA         PIC 9(04).
               10  FERIA-DT-MM           PIC 9(02).
               10  FERIA-DT-DD           PIC 9(02).
           05  FERIA-TIPO                PIC X(03).
               88  FERIA-TIPO-NACIONAL            VALUE 'NAC'.
               88  FERIA-TIPO-ESTADUAL            VALUE 'EST'.
               88  FERIA-TIPO-MUNICIPAL           VALUE 'MUN'.
               88  FERIA-TIPO-BANCARIO            VALUE 'BAN'.
               88  FERIA-TIPO-EMPRESA             VALUE 'EMP'.
           05  FERIA-UF                  PIC X(02).
           05  FERIA-CD-MUNICIPIO        PIC X(07).
           05  FERIA-DESCRICAO           PIC X(40).
           05  FERIA-IND-PARCIAL         PIC X(01).
               88  FERIA-DIA-INTEIRO              VALUE 'N'.
               88  FERIA-MEIO-EXPEDIENTE          VALUE 'S'.
           05  FERIA-CD-FONTE            PIC X(10).
           05  FERIA-FILLER              PIC X(07).
