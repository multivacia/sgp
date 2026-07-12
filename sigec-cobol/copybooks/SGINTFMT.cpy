      *****************************************************************
      * COPYBOOK.: SGINTFMT                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: AREA DE COMUNICACAO DA FORMATACAO DE INTERFACE      *
      *            EXECUTADA POR SGCB0200                              *
      * USO .....: LINKAGE-SECTION DE SGCB0200 E WORKING DE SGCB0160   *
      *----------------------------------------------------------------*
      * SGCB0200 FORMATA UM REGISTRO NO LAYOUT ALVO. O CHAMADOR ENVIA  *
      * O TIPO DE INTERFACE (CB, CT, RG), O TIPO DE REGISTRO (H, D, T) *
      * E OS CAMPOS EM UMA AREA GENERICA. RECEBE A LINHA FORMATADA.    *
      *****************************************************************
       01  SGINTFMT.
      *---- ENTRADA ---------------------------------------------------*
           05  SG-IF-TIPO-INTERFACE      PIC X(02).
               88  SG-IF-INT-COBRANCA             VALUE 'CB'.
               88  SG-IF-INT-CONTABIL             VALUE 'CT'.
               88  SG-IF-INT-RENEG                VALUE 'RG'.
      *
           05  SG-IF-TIPO-REGISTRO       PIC X(01).
               88  SG-IF-REG-HEADER               VALUE 'H'.
               88  SG-IF-REG-DETAIL               VALUE 'D'.
               88  SG-IF-REG-TRAILER              VALUE 'T'.
      *
           05  SG-IF-DT-REFERENCIA       PIC 9(08).
           05  SG-IF-SEQ-REGISTRO        PIC 9(09).
      *
      *---- CAMPOS GENERICOS (PREENCHIMENTO CONFORME LAYOUT) ---------*
           05  SG-IF-CAMPOS.
               10  SG-IF-CTR-NUMERO      PIC X(15).
               10  SG-IF-CLI-DOCUMENTO   PIC X(14).
               10  SG-IF-CLI-NOME        PIC X(60).
               10  SG-IF-VLR-1           PIC S9(13)V99 COMP-3.
               10  SG-IF-VLR-2           PIC S9(13)V99 COMP-3.
               10  SG-IF-VLR-3           PIC S9(13)V99 COMP-3.
               10  SG-IF-QTD-1           PIC 9(09).
               10  SG-IF-QTD-2           PIC 9(09).
               10  SG-IF-DT-1            PIC 9(08).
               10  SG-IF-DT-2            PIC 9(08).
               10  SG-IF-TEXTO-1         PIC X(40).
               10  SG-IF-TEXTO-2         PIC X(40).
               10  SG-IF-CODIGO-1        PIC X(10).
               10  SG-IF-CODIGO-2        PIC X(10).
      *
      *---- SAIDA -----------------------------------------------------*
           05  SG-IF-LINHA-FORMATADA     PIC X(300).
           05  SG-IF-LRECL-SAIDA         PIC 9(04).
           05  SG-IF-IND-TRUNCADO        PIC X(01).
               88  SG-IF-HOUVE-TRUNC              VALUE 'S'.
               88  SG-IF-SEM-TRUNC                VALUE 'N'.
      *
           05  SG-IF-RETURN-CODE         PIC 9(02).
           05  SG-IF-MENSAGEM            PIC X(80).
