      *****************************************************************
      * COPYBOOK.: SGCTRDAT                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: DADOS DO CONTRATO (VISAO CANONICA)                  *
      * USO .....: WORKING DE PROGRAMAS DE CARGA, ENCARGOS, RISCO E    *
      *            RENEGOCIACAO                                        *
      *****************************************************************
       01  SGCTRDAT.
           05  SG-CTR-ID                 PIC 9(12).
           05  SG-CTR-NUMERO             PIC X(15).
           05  SG-CTR-CLI-ID             PIC 9(10).
           05  SG-CTR-TIPO-CTR           PIC X(02).
               88  SG-CTR-CR                      VALUE 'CR'.
               88  SG-CTR-CD                      VALUE 'CD'.
               88  SG-CTR-FI                      VALUE 'FI'.
               88  SG-CTR-CO                      VALUE 'CO'.
               88  SG-CTR-EM                      VALUE 'EM'.
               88  SG-CTR-TIPO-VALIDO             VALUES
                   'CR' 'CD' 'FI' 'CO' 'EM'.
      *---- FINANCEIRO ------------------------------------------------*
           05  SG-CTR-VLR-TOTAL          PIC S9(13)V99 COMP-3.
           05  SG-CTR-VLR-SALDO          PIC S9(13)V99 COMP-3.
           05  SG-CTR-VLR-PAGO           PIC S9(13)V99 COMP-3.
           05  SG-CTR-VLR-ENC-ACUM       PIC S9(13)V99 COMP-3.
           05  SG-CTR-QT-PARCELAS        PIC 9(03).
           05  SG-CTR-QT-PAR-PAGAS       PIC 9(03).
           05  SG-CTR-QT-PAR-VENC        PIC 9(03).
           05  SG-CTR-TAXA-JUROS         PIC S9(03)V99 COMP-3.
           05  SG-CTR-PCT-MULTA          PIC S9(03)V99 COMP-3.
      *---- DATAS -----------------------------------------------------*
           05  SG-CTR-DT-INICIO          PIC 9(08).
           05  SG-CTR-DT-FIM             PIC 9(08).
           05  SG-CTR-DT-CARGA           PIC 9(08).
           05  SG-CTR-DT-ULT-PAG         PIC 9(08).
           05  SG-CTR-DT-ULT-CALC        PIC 9(08).
      *---- SITUACAO --------------------------------------------------*
           05  SG-CTR-SITUACAO           PIC X(02).
               88  SG-CTR-SIT-ATIVO               VALUE 'AT'.
               88  SG-CTR-SIT-QUITADO             VALUE 'QT'.
               88  SG-CTR-SIT-CANCELADO           VALUE 'CN'.
               88  SG-CTR-SIT-RENEGOCIADO         VALUE 'RN'.
               88  SG-CTR-SIT-EM-COBR             VALUE 'CB'.
               88  SG-CTR-SIT-PROTESTO            VALUE 'PT'.
      *---- INADIMPLENCIA E RISCO -------------------------------------*
           05  SG-CTR-FAIXA-INAD         PIC X(08).
               88  SG-CTR-INAD-EM-DIA             VALUE 'EM DIA  '.
               88  SG-CTR-INAD-LEVE               VALUE 'LEVE    '.
               88  SG-CTR-INAD-MOD                VALUE 'MODERADA'.
               88  SG-CTR-INAD-GRAVE              VALUE 'GRAVE   '.
               88  SG-CTR-INAD-CRIT               VALUE 'CRITICA '.
           05  SG-CTR-DIAS-MAX-ATRASO    PIC 9(05).
           05  SG-CTR-CLASSE-RISCO       PIC X(01).
               88  SG-CTR-RISCO-A                 VALUE 'A'.
               88  SG-CTR-RISCO-B                 VALUE 'B'.
               88  SG-CTR-RISCO-C                 VALUE 'C'.
               88  SG-CTR-RISCO-D                 VALUE 'D'.
               88  SG-CTR-RISCO-E                 VALUE 'E'.
      *---- BLOQUEIOS -------------------------------------------------*
           05  SG-CTR-IND-BLOQ           PIC X(01).
               88  SG-CTR-BLOQUEADO               VALUE 'S'.
               88  SG-CTR-DESBLOQ                 VALUE 'N'.
           05  SG-CTR-MOTIVO-BLOQ        PIC X(30).
      *---- AUDIT -----------------------------------------------------*
           05  SG-CTR-USUARIO-ALT        PIC X(08).
           05  SG-CTR-DT-ATUALIZACAO     PIC 9(08).
           05  SG-CTR-FILLER             PIC X(20).
