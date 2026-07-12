      *****************************************************************
      * COPYBOOK.: SGERRMSG                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: MENSAGENS DE ERRO PADRONIZADAS                      *
      *----------------------------------------------------------------*
      * A CHAVE DE MENSAGEM SEGUE O PADRAO <RC>-<CATEGORIA> DEFINIDO   *
      * EM docs/CODIGOS_RETORNO.md. O TEXTO DE MENSAGEM E COMPLEMENTAR *
      * E APARECE EM SGLERROS E LOG DE EXECUCAO.                       *
      *****************************************************************
       01  WS-ERRMSG.
           05  WS-EMS-CHAVE              PIC X(20).
           05  WS-EMS-TEXTO              PIC X(80).
           05  WS-EMS-CTX-CHAVE-1        PIC X(20).
           05  WS-EMS-CTX-VALOR-1        PIC X(30).
           05  WS-EMS-CTX-CHAVE-2        PIC X(20).
           05  WS-EMS-CTX-VALOR-2        PIC X(30).
      *
      *---------------------------------------------------------------*
      *  CATALOGO DE MENSAGENS - CHAVES REUTILIZAVEIS                 *
      *---------------------------------------------------------------*
       01  WS-CT-MENSAGENS.
      *  --- SGCB0010 ---
           05  MS-EXEC-OK                PIC X(20) VALUE
               '00-EXEC-OK          '.
           05  MS-BLOQ-ATIVO             PIC X(20) VALUE
               '08-BLOQUEIO-ATIVO   '.
           05  MS-DIA-NAO-UTIL           PIC X(20) VALUE
               '08-DIA-NAO-UTIL     '.
           05  MS-STEP-WARN              PIC X(20) VALUE
               '04-STEP-WARNING     '.
           05  MS-STEP-ERR-TEC           PIC X(20) VALUE
               '12-STEP-ERR-TEC     '.
      *  --- SGCB0020 ---
           05  MS-CTR-VAL-OK             PIC X(20) VALUE
               '00-CTR-VAL-OK       '.
           05  MS-TRAILER-DIVERGE        PIC X(20) VALUE
               '04-TRAILER-DIVERGE  '.
           05  MS-DOC-INVALIDO           PIC X(20) VALUE
               '08-DOC-INVALIDO     '.
           05  MS-VLR-INCONSIST          PIC X(20) VALUE
               '08-VLR-INCONSIST    '.
           05  MS-TIPO-INVALIDO          PIC X(20) VALUE
               '08-TIPO-INVALIDO    '.
      *  --- SGCB0030 ---
           05  MS-CTR-CARGA-OK           PIC X(20) VALUE
               '00-CTR-CARGA-OK     '.
           05  MS-DB2-DUPL-IGN           PIC X(20) VALUE
               '04-DB2-DUPL-IGNOR   '.
           05  MS-DB2-SQLCODE            PIC X(20) VALUE
               '12-DB2-SQLCODE      '.
           05  MS-DB2-DOWN               PIC X(20) VALUE
               '16-DB2-DOWN         '.
      *  --- SGCB0040 / 0050 ---
           05  MS-PAG-VAL-OK             PIC X(20) VALUE
               '00-PAG-VAL-OK       '.
           05  MS-PAG-SEM-CTR            PIC X(20) VALUE
               '08-PAG-SEM-CTR      '.
           05  MS-PAG-SEM-PAR            PIC X(20) VALUE
               '08-PAG-SEM-PAR      '.
           05  MS-DT-FUTURA              PIC X(20) VALUE
               '08-DT-FUTURA        '.
           05  MS-CANAL-INVAL            PIC X(20) VALUE
               '08-CANAL-INVAL      '.
           05  MS-PAG-PENDENTE           PIC X(20) VALUE
               '04-PAG-PENDENTE     '.
      *  --- SGCB0070 / 0110 ---
           05  MS-ENC-CALC-OK            PIC X(20) VALUE
               '00-ENC-CALC-OK      '.
           05  MS-FIN-PRINC-ZERO         PIC X(20) VALUE
               '08-FIN-PRINC-ZERO   '.
           05  MS-FIN-TAXA-INVAL         PIC X(20) VALUE
               '08-FIN-TAXA-INVAL   '.
           05  MS-FIN-OVERFLOW           PIC X(20) VALUE
               '12-FIN-OVERFLOW     '.
      *  --- SGCB0100 / 0140 ---
           05  MS-INA-DET-OK             PIC X(20) VALUE
               '00-INA-DET-OK       '.
           05  MS-INA-VAZIO              PIC X(20) VALUE
               '04-INA-VAZIO        '.
           05  MS-RISCO-CLASS-OK         PIC X(20) VALUE
               '00-RISCO-CLASS-OK   '.
           05  MS-RISCO-DADOS            PIC X(20) VALUE
               '08-RISCO-DADOS      '.
      *  --- SGCB0130 ---
           05  MS-REN-GER-OK             PIC X(20) VALUE
               '00-REN-GER-OK       '.
           05  MS-REN-SEM-ELEG           PIC X(20) VALUE
               '04-REN-SEM-ELEG     '.
           05  MS-REN-DUP-ATIVA          PIC X(20) VALUE
               '08-REN-DUP-ATIVA    '.
      *  --- SGCB0160 / 0200 ---
           05  MS-INT-GER-OK             PIC X(20) VALUE
               '00-INT-GER-OK       '.
           05  MS-INT-FORMAT             PIC X(20) VALUE
               '08-INT-FORMAT       '.
           05  MS-FMT-CAMPO-INVAL        PIC X(20) VALUE
               '08-FMT-CAMPO-INVAL  '.
           05  MS-FMT-OVERFLOW           PIC X(20) VALUE
               '12-FMT-OVERFLOW     '.
      *  --- SGCB0170 ---
           05  MS-DOC-OK                 PIC X(20) VALUE
               '00-DOC-OK           '.
           05  MS-DOC-DV-ERR             PIC X(20) VALUE
               '08-DOC-DV-ERR       '.
           05  MS-DOC-LEN-INVAL          PIC X(20) VALUE
               '08-DOC-LEN-INVAL    '.
           05  MS-DOC-TIPO-INVAL         PIC X(20) VALUE
               '08-DOC-TIPO-INVAL   '.
      *  --- SGCB0180 ---
           05  MS-DT-OK                  PIC X(20) VALUE
               '00-DT-OK            '.
           05  MS-DT-INVAL               PIC X(20) VALUE
               '08-DT-INVAL         '.
           05  MS-DT-FORMATO             PIC X(20) VALUE
               '08-DT-FORMATO       '.
           05  MS-DT-FIM-SEM             PIC X(20) VALUE
               '04-DT-FIM-SEM       '.
           05  MS-DT-FERIADO             PIC X(20) VALUE
               '04-DT-FERIADO       '.
      *  --- SGCB0190 ---
           05  MS-REL-OK                 PIC X(20) VALUE
               '00-REL-OK           '.
           05  MS-REL-VAZIO              PIC X(20) VALUE
               '04-REL-VAZIO        '.
