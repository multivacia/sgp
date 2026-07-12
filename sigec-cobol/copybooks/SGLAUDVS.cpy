      *****************************************************************
      * COPYBOOK.: SGLAUDVS                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLAUDVS - AUDITORIA VSAM DE DECISOES OPERACIONAIS  *
      * ORGANIZ .: VSAM KSDS                                           *
      * CHAVE ...: AUDVS-CHAVE (36 BYTES, POSICOES 1-36)               *
      * LRECL ...: 300                                                 *
      * PROG ....: SGCB0100 (WRITE), SGCB0140 (WRITE), SGCB0190 (READ) *
      *----------------------------------------------------------------*
      * REGISTRA CADA DECISAO AUTOMATICA COM RASTREABILIDADE COMPLETA. *
      * CHAVE COMPOSTA POR: DT-REF(8) + ID-CONTRATO(12) + SEQ(6)       *
      *                   + PROG-ORIGEM(8) + PAD(2)                    *
      *****************************************************************
       01  REG-SGLAUDVS.
      *---- CHAVE COMPOSTA (36 BYTES) --------------------------------*
           05  AUDVS-CHAVE.
               10  AUDVS-CH-DT-REF       PIC 9(08).
               10  AUDVS-CH-ID-CONTRATO  PIC 9(12).
               10  AUDVS-CH-SEQ          PIC 9(06).
               10  AUDVS-CH-PROG-ORIGEM  PIC X(08).
               10  AUDVS-CH-PAD          PIC X(02).
      *---- CORPO DO REGISTRO ----------------------------------------*
           05  AUDVS-DADOS.
               10  AUDVS-DT-EVENTO       PIC 9(08).
               10  AUDVS-HR-EVENTO       PIC 9(06).
               10  AUDVS-USUARIO         PIC X(08).
               10  AUDVS-ID-EXECUCAO     PIC X(12).
               10  AUDVS-TIPO-EVENTO     PIC X(20).
                   88  AUDVS-EV-INAD-DETECTADA
                                              VALUE
                       'INAD-DETECTADA      '.
                   88  AUDVS-EV-RISCO-ALTERADO
                                              VALUE
                       'RISCO-ALTERADO      '.
                   88  AUDVS-EV-PROP-GERADA
                                              VALUE
                       'PROPOSTA-GERADA     '.
                   88  AUDVS-EV-CTR-BLOQUEADO
                                              VALUE
                       'CONTRATO-BLOQUEADO  '.
                   88  AUDVS-EV-PROTESTO
                                              VALUE
                       'PROTESTO            '.
               10  AUDVS-VALOR-ANTERIOR  PIC X(30).
               10  AUDVS-VALOR-NOVO      PIC X(30).
               10  AUDVS-CAMPO-ALTERADO  PIC X(30).
               10  AUDVS-JUSTIFICATIVA   PIC X(80).
               10  AUDVS-CD-REGRA        PIC X(10).
               10  AUDVS-VLR-BASE        PIC S9(13)V99 COMP-3.
               10  AUDVS-IND-REVERSIVEL  PIC X(01).
                   88  AUDVS-REVERSIVEL           VALUE 'S'.
                   88  AUDVS-NAO-REVERSIVEL       VALUE 'N'.
               10  AUDVS-FILLER          PIC X(50).
