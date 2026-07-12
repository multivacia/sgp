      *****************************************************************
      * COPYBOOK.: SGRISCOM                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: AREA DE COMUNICACAO DA CLASSIFICACAO DE RISCO       *
      *            (SGCB0140) E DETECCAO DE INADIMPLENCIA (SGCB0100)   *
      * USO .....: LINKAGE-SECTION DE SGCB0140 E WORKING DOS CHAMADORES*
      *----------------------------------------------------------------*
      * MATRIZ DE RISCO DESCRITA EM docs/REGRAS_NEGOCIO.md SECAO 6.    *
      *****************************************************************
       01  SGRISCOM.
      *---- ENTRADA ---------------------------------------------------*
           05  SG-RC-ENTRADA.
               10  SG-RC-CTR-ID          PIC 9(12).
               10  SG-RC-CLI-ID          PIC 9(10).
               10  SG-RC-TIPO-CLI        PIC X(02).
               10  SG-RC-DT-BASE         PIC 9(08).
               10  SG-RC-FAIXA-INAD-ATU  PIC X(08).
                   88  SG-RC-INAD-EM-DIA          VALUE 'EM DIA  '.
                   88  SG-RC-INAD-LEVE            VALUE 'LEVE    '.
                   88  SG-RC-INAD-MOD             VALUE 'MODERADA'.
                   88  SG-RC-INAD-GRAVE           VALUE 'GRAVE   '.
                   88  SG-RC-INAD-CRIT            VALUE 'CRITICA '.
               10  SG-RC-DIAS-MAX-ATRASO PIC 9(05).
               10  SG-RC-QT-DIAS-GRAVE-180
                                         PIC 9(03).
               10  SG-RC-VLR-SALDO       PIC S9(13)V99 COMP-3.
               10  SG-RC-VLR-ENC-ACUM    PIC S9(13)V99 COMP-3.
               10  SG-RC-RISCO-ANTERIOR  PIC X(01).
               10  SG-RC-DT-ULT-CLASS    PIC 9(08).
               10  SG-RC-FL-ES-LIVRE     PIC X(01).
                   88  SG-RC-ES-LIVRE-ATIVO       VALUE 'S'.
                   88  SG-RC-ES-LIVRE-INATIVO     VALUE 'N'.
      *---- SAIDA -----------------------------------------------------*
           05  SG-RC-SAIDA.
               10  SG-RC-CLASSE-RISCO    PIC X(01).
                   88  SG-RC-RISCO-A              VALUE 'A'.
                   88  SG-RC-RISCO-B              VALUE 'B'.
                   88  SG-RC-RISCO-C              VALUE 'C'.
                   88  SG-RC-RISCO-D              VALUE 'D'.
                   88  SG-RC-RISCO-E              VALUE 'E'.
               10  SG-RC-VARIACAO        PIC S9(02).
                   88  SG-RC-MANTEVE              VALUE 0.
                   88  SG-RC-MELHOROU             VALUE -1 -2.
                   88  SG-RC-PIOROU               VALUES 1 2 3 4.
               10  SG-RC-IND-PROVISAO    PIC X(01).
                   88  SG-RC-EXIGE-PROVISAO       VALUE 'S'.
                   88  SG-RC-SEM-PROVISAO         VALUE 'N'.
               10  SG-RC-PCT-PROVISAO    PIC S9(03)V99 COMP-3.
               10  SG-RC-JUSTIFICATIVA   PIC X(60).
      *
           05  SG-RC-RETURN-CODE         PIC 9(02).
           05  SG-RC-MENSAGEM            PIC X(80).
