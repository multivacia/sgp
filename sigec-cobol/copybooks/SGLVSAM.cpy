      *****************************************************************
      * COPYBOOK.: SGLVSAM                                             *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGVCOBRA - FILA DE COBRANCA (VSAM KSDS)             *
      * ORGANIZ .: VSAM KSDS                                           *
      * CHAVE ...: SGVC-CHAVE (23 BYTES, POSICOES 1-23)                *
      *            COMPOSTA POR CLIENTE(10) + CONTRATO(12) + PAD(1)    *
      * LRECL ...: 250                                                 *
      * DEFINICAO IDCAMS EXEMPLO:                                      *
      *   DEFINE CLUSTER (NAME(SGP.SIGEC.SGVCOBRA)                     *
      *          INDEXED KEYS(23 0)                                    *
      *          RECORDSIZE(250 250) SHR(2 3)                          *
      *          CISZ(4096) FSPC(20 10))                               *
      * PROG ....: SGCB0100 (WRITE), SGCB0160 (READ), SGCB0090 (UPDATE)*
      *****************************************************************
       01  REG-SGVCOBRA.
      *---- CHAVE COMPOSTA (23 BYTES) --------------------------------*
           05  SGVC-CHAVE.
               10  SGVC-ID-CLIENTE       PIC 9(10).
               10  SGVC-ID-CONTRATO      PIC 9(12).
               10  SGVC-PAD              PIC X(01).
      *---- IDENTIFICACAO --------------------------------------------*
           05  SGVC-NR-CONTRATO          PIC X(15).
           05  SGVC-TIPO-DOC             PIC X(03).
           05  SGVC-DOCUMENTO            PIC X(14).
           05  SGVC-NOME                 PIC X(60).
      *---- POSICAO DA COBRANCA --------------------------------------*
           05  SGVC-DT-INCLUSAO          PIC 9(08).
           05  SGVC-DT-ULT-ACAO          PIC 9(08).
           05  SGVC-DT-PROX-ACAO         PIC 9(08).
           05  SGVC-DIAS-EM-COBR         PIC 9(05).
           05  SGVC-FAIXA-INAD           PIC X(08).
           05  SGVC-CLASSE-RISCO         PIC X(01).
           05  SGVC-PRIORIDADE           PIC 9(02).
           05  SGVC-STATUS               PIC X(10).
               88  SGVC-ST-NA-FILA                VALUE 'NA-FILA   '.
               88  SGVC-ST-EM-CONTATO             VALUE 'EM-CONTATO'.
               88  SGVC-ST-PROMESSA               VALUE 'PROMESSA  '.
               88  SGVC-ST-QUEBRADA               VALUE 'QUEBRADA  '.
               88  SGVC-ST-ACORDO                 VALUE 'ACORDO    '.
               88  SGVC-ST-QUITADO                VALUE 'QUITADO   '.
               88  SGVC-ST-PROTESTO               VALUE 'PROTESTO  '.
      *---- VALORES --------------------------------------------------*
           05  SGVC-VLR-SALDO            PIC S9(13)V99 COMP-3.
           05  SGVC-VLR-JUROS-ACUM       PIC S9(13)V99 COMP-3.
           05  SGVC-VLR-MULTA-ACUM       PIC S9(13)V99 COMP-3.
           05  SGVC-VLR-DIVIDA-TOT       PIC S9(13)V99 COMP-3.
           05  SGVC-VLR-PROMESSA         PIC S9(13)V99 COMP-3.
      *---- ACOES ----------------------------------------------------*
           05  SGVC-QT-CONTATOS          PIC 9(03).
           05  SGVC-QT-PROMESSAS         PIC 9(03).
           05  SGVC-QT-QUEBRAS           PIC 9(03).
           05  SGVC-CANAL-ULT-CONT       PIC X(03).
           05  SGVC-CD-OPERADOR          PIC X(08).
      *---- AUDITORIA ------------------------------------------------*
           05  SGVC-USUARIO-INCL         PIC X(08).
           05  SGVC-USUARIO-ALT          PIC X(08).
           05  SGVC-TS-ATUALIZACAO       PIC X(26).
           05  SGVC-FILLER               PIC X(20).
