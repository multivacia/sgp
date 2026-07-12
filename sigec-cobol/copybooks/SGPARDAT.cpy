      *****************************************************************
      * COPYBOOK.: SGPARDAT                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: DADOS DE PARCELA (VISAO CANONICA)                   *
      * USO .....: WORKING DE PROGRAMAS DE APLICACAO DE PAGAMENTO,     *
      *            CALCULO DE ENCARGOS E DETECCAO DE INADIMPLENCIA     *
      *****************************************************************
       01  SGPARDAT.
           05  SG-PAR-ID                 PIC 9(14).
           05  SG-PAR-CTR-ID             PIC 9(12).
           05  SG-PAR-NUMERO             PIC 9(03).
           05  SG-PAR-DT-VCTO            PIC 9(08).
           05  SG-PAR-DT-VCTO-ORIG       PIC 9(08).
      *---- FINANCEIRO ------------------------------------------------*
           05  SG-PAR-VLR-ORIGINAL       PIC S9(13)V99 COMP-3.
           05  SG-PAR-VLR-PAGO           PIC S9(13)V99 COMP-3.
           05  SG-PAR-VLR-SALDO          PIC S9(13)V99 COMP-3.
           05  SG-PAR-VLR-JUROS          PIC S9(13)V99 COMP-3.
           05  SG-PAR-VLR-MULTA          PIC S9(13)V99 COMP-3.
           05  SG-PAR-VLR-ATUALIZADO     PIC S9(13)V99 COMP-3.
           05  SG-PAR-VLR-DESCONTO       PIC S9(13)V99 COMP-3.
      *---- ATRASO ----------------------------------------------------*
           05  SG-PAR-DIAS-ATRASO        PIC S9(05) COMP-3.
           05  SG-PAR-DT-ULT-CALC        PIC 9(08).
           05  SG-PAR-DT-ULT-PAG         PIC 9(08).
           05  SG-PAR-QT-PAGTOS          PIC 9(03).
      *---- SITUACAO --------------------------------------------------*
           05  SG-PAR-SITUACAO           PIC X(10).
               88  SG-PAR-ABERTA                  VALUE 'ABERTA    '.
               88  SG-PAR-PARCIAL                 VALUE 'PARCIAL   '.
               88  SG-PAR-LIQUIDADA               VALUE 'LIQUIDADA '.
               88  SG-PAR-CANCELADA               VALUE 'CANCELADA '.
               88  SG-PAR-PROTESTO                VALUE 'PROTESTO  '.
               88  SG-PAR-EM-ANDAMENTO            VALUES
                   'ABERTA    ' 'PARCIAL   '.
      *---- INDICADORES -----------------------------------------------*
           05  SG-PAR-IND-PARCIAL        PIC X(01).
               88  SG-PAR-E-PARCIAL               VALUE 'S'.
               88  SG-PAR-NAO-PARCIAL             VALUE 'N'.
           05  SG-PAR-IND-RENEG          PIC X(01).
               88  SG-PAR-RENEGOCIADA             VALUE 'S'.
               88  SG-PAR-NAO-RENEG               VALUE 'N'.
           05  SG-PAR-CANAL-ULT-PAG      PIC X(03).
               88  SG-PAR-CANAL-BOL               VALUE 'BOL'.
               88  SG-PAR-CANAL-DEB               VALUE 'DEB'.
               88  SG-PAR-CANAL-PIX               VALUE 'PIX'.
               88  SG-PAR-CANAL-TED               VALUE 'TED'.
               88  SG-PAR-CANAL-DOC               VALUE 'DOC'.
               88  SG-PAR-CANAL-CAR               VALUE 'CAR'.
      *---- AUDIT -----------------------------------------------------*
           05  SG-PAR-USUARIO-ALT        PIC X(08).
           05  SG-PAR-DT-ATUALIZACAO     PIC 9(08).
           05  SG-PAR-FILLER             PIC X(20).
