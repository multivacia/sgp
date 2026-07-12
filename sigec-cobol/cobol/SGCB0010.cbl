       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0010.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0010                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: DRIVER/ORQUESTRADOR DA JANELA BATCH DIARIA.       *
      *             DISPARA, NA ORDEM CORRETA, OS PROCESSADORES       *
      *             AUTONOMOS DO FLUXO DIARIO E CONSOLIDA O RC        *
      *             FINAL DA JANELA.                                  *
      *                                                               *
      * FLUXO OBRIGATORIO:                                            *
      *   SGCB0010 -> 0020 -> 0030 -> 0040 -> 0070 -> 0100 ->         *
      *               -> 0130 -> 0160 -> 0190                         *
      *                                                               *
      * ENTRADAS ..:                                                  *
      *   PARM     .. STRING NO PARM DO JCL: 'YYYYMMDD[/JAN|MES|EXT]' *
      *   SYSIN    .. FALLBACK: PRIMEIRO REGISTRO = 'YYYYMMDD'        *
      *   ACCEPT   .. FALLBACK FINAL: DATA DE SISTEMA (YYYYMMDD)      *
      *   SGLPARM  .. PARAMETROS CHAVE-VALOR (DD PARM)                *
      *   SGLFERIA .. CALENDARIO DE FERIADOS (DD FERIA) - USADO NA    *
      *               VERIFICACAO DE DIA UTIL PELO PROPRIO DRIVER     *
      *   SGLBLOQ  .. BLOQUEIOS OPERACIONAIS (DD BLOQ)                *
      *                                                               *
      * SAIDAS ....:                                                  *
      *   SGLLOG   .. LOG RESUMIDO DA JANELA (DD LOGEXEC) FB LRECL 180*
      *   SYSPRINT .. DISPLAYS DE ACOMPANHAMENTO                      *
      *                                                               *
      * REGRAS DE ORQUESTRACAO (docs/CODIGOS_RETORNO.md secao 3):     *
      *   RC 00      .. STEP OK, PROSSEGUE                            *
      *   RC 04      .. WARNING, PROSSEGUE (RC-MAX = MAX(RC-MAX,04))  *
      *   RC 08      .. ERRO FUNCIONAL. SE                            *
      *                 SG-PX-INCLUI-CRITICA = 'S' PROSSEGUE COM      *
      *                 WARNING ELEVADO; SENAO ABORTA A JANELA.       *
      *   RC 12+     .. ERRO TECNICO/CRITICO. ABORTA IMEDIATAMENTE.   *
      *   O RC FINAL DEVOLVIDO E O MAX ACUMULADO ENTRE OS STEPS.      *
      *                                                               *
      * FORMAS DE CALL PRESENTES NESTE DRIVER (PONTOS DE COBERTURA):  *
      *   1) ESTATICO ...... CALL 'SGCB0020', 'SGCB0030', 'SGCB0040', *
      *                      'SGCB0070', 'SGCB0100', 'SGCB0130',      *
      *                      'SGCB0160'                               *
      *   2) DINAMICO POR                                             *
      *      VARIAVEL ...... CALL WS-PROG-REL      (SGCB0190)         *
      *   3) DINAMICO POR                                             *
      *      MONTAGEM ...... CALL WS-PROG-REL-ALT  (STRING RUNTIME)   *
      *   4) EXTERNO OPCIONAL CALL WS-PROG-EXT-LOG (SGEXTLOG - RARO)  *
      *                                                               *
      * LEGADO PRESERVADO:                                            *
      *   9500-FINALIZAR-LEGADO usa ALTER controlado para desviar da  *
      *   finalizacao NORMAL para uma finalizacao ALTERNATIVA rara.   *
      *   9998-MODO-SIMULACAO-ANTIGO e um parrafo NUNCA EXECUTADO no  *
      *   fluxo principal - mantido para arqueologia e referencia ao  *
      *   programa historico SGCB0999 (nao ha CALL vivo dele).        *
      *                                                               *
      * CODIGOS DE RETORNO DESTE PROGRAMA (docs/CODIGOS_RETORNO.md):  *
      *   00 - 00-EXEC-OK             janela completa sem incidentes  *
      *   04 - 04-STEP-WARNING        pelo menos um step retornou 04  *
      *   08 - 08-BLOQUEIO-ATIVO      SGLBLOQ ativo para o dia        *
      *   08 - 08-DIA-NAO-UTIL        SGLFERIA marca a data           *
      *   12 - 12-STEP-ERR-TEC        step retornou 12; janela aborta *
      *   16 - 16-DRIVER-INCONS       inconsistencia estrutural       *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
      *---- PARAMETROS (CHAVE-VALOR) ---------------------------------*
           SELECT SGLPARM-FILE
                  ASSIGN TO PARMFL
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-PARM.
      *---- CALENDARIO DE FERIADOS -----------------------------------*
           SELECT SGLFERIA-FILE
                  ASSIGN TO FERIA
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-FERIA.
      *---- BLOQUEIOS OPERACIONAIS -----------------------------------*
           SELECT SGLBLOQ-FILE
                  ASSIGN TO BLOQ
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-BLOQ.
      *---- LOG DE EXECUCAO DA JANELA --------------------------------*
           SELECT SGLLOG-FILE
                  ASSIGN TO LOGEXEC
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-LOG.
      *
       DATA DIVISION.
       FILE SECTION.
      *---------------------------------------------------------------*
       FD  SGLPARM-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPARM.
      *
       FD  SGLFERIA-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLFERIA.
      *
       FD  SGLBLOQ-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLBLOQ.
      *
       FD  SGLLOG-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
       01  LOG-REG                       PIC X(180).
      *
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVOS                                            *
      *---------------------------------------------------------------*
       01  WS-FILE-STATUS.
           05  WS-FS-PARM                PIC X(02) VALUE '00'.
               88  FS-PARM-OK                     VALUE '00'.
               88  FS-PARM-EOF                    VALUE '10'.
               88  FS-PARM-INDISP                 VALUES '35' '37'.
           05  WS-FS-FERIA               PIC X(02) VALUE '00'.
               88  FS-FERIA-OK                    VALUE '00'.
               88  FS-FERIA-EOF                   VALUE '10'.
               88  FS-FERIA-INDISP                VALUES '35' '37'.
           05  WS-FS-BLOQ                PIC X(02) VALUE '00'.
               88  FS-BLOQ-OK                     VALUE '00'.
               88  FS-BLOQ-EOF                    VALUE '10'.
               88  FS-BLOQ-INDISP                 VALUES '35' '37'.
           05  WS-FS-LOG                 PIC X(02) VALUE '00'.
               88  FS-LOG-OK                      VALUE '00'.
      *
      *---------------------------------------------------------------*
      * CONTROLE GERAL DO DRIVER                                      *
      *---------------------------------------------------------------*
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0010'.
           05  WS-ID-EXEC                PIC X(12) VALUE 'SGCB0010    '.
           05  WS-DT-PROC-N              PIC 9(08) VALUE ZEROES.
           05  WS-DT-PROC-R REDEFINES WS-DT-PROC-N.
               10  WS-DT-PROC-AAAA       PIC 9(04).
               10  WS-DT-PROC-MM         PIC 9(02).
               10  WS-DT-PROC-DD         PIC 9(02).
           05  WS-HR-PROC-N              PIC 9(06) VALUE ZEROES.
           05  WS-CURR-DATE              PIC X(21) VALUE SPACES.
           05  WS-JANELA                 PIC X(03) VALUE 'DIA'.
      *
      *---------------------------------------------------------------*
      * FLAGS DE CONTROLE DO FLUXO                                    *
      *---------------------------------------------------------------*
       01  WS-FLAGS.
           05  WS-FL-ABORT               PIC X(01) VALUE 'N'.
               88  WS-DEVE-ABORTAR                VALUE 'S'.
               88  WS-NAO-ABORTAR                 VALUE 'N'.
           05  WS-FL-DIA-UTIL            PIC X(01) VALUE 'S'.
               88  WS-DIA-EH-UTIL                 VALUE 'S'.
               88  WS-DIA-NAO-UTIL                VALUE 'N'.
           05  WS-FL-BLOQ                PIC X(01) VALUE 'N'.
               88  WS-JANELA-BLOQUEADA            VALUE 'S'.
           05  WS-FL-EOF-PARM            PIC X(01) VALUE 'N'.
               88  WS-EOF-PARM                    VALUE 'S'.
           05  WS-FL-EOF-FERIA           PIC X(01) VALUE 'N'.
               88  WS-EOF-FERIA                   VALUE 'S'.
           05  WS-FL-EOF-BLOQ            PIC X(01) VALUE 'N'.
               88  WS-EOF-BLOQ                    VALUE 'S'.
           05  WS-FL-PARM-DE-JCL         PIC X(01) VALUE 'N'.
               88  WS-PARM-VEIO-JCL               VALUE 'S'.
           05  WS-FL-SYSIN-USADO         PIC X(01) VALUE 'N'.
               88  WS-SYSIN-FOI-USADO             VALUE 'S'.
           05  WS-FL-ORIGEM-DATA         PIC X(04) VALUE 'DATE'.
      *---- FLAG DE AMBIENTE ESPECIAL (ATIVA CALL SGEXTLOG) -----------*
           05  WS-FL-EXT-LOG             PIC X(01) VALUE 'N'.
               88  WS-EXT-LOG-ATIVO               VALUE 'S'.
      *---- FLAG PARA DESVIO ALTERNATIVO DA FINALIZACAO ---------------*
           05  WS-FL-FIM-ALTERNATIVO     PIC X(01) VALUE 'N'.
               88  WS-USAR-FIM-ALTERNATIVO        VALUE 'S'.
      *
      *---------------------------------------------------------------*
      * RETURN CODES POR STEP E ACUMULADOR MAXIMO                     *
      *---------------------------------------------------------------*
       01  WS-STEP-RCS.
           05  WS-RC-MAX                 PIC 9(02) VALUE ZEROES.
           05  WS-RC-STEP                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0020                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0030                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0040                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0070                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0100                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0130                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0160                PIC 9(02) VALUE ZEROES.
           05  WS-RC-0190                PIC 9(02) VALUE ZEROES.
      *
      *---------------------------------------------------------------*
      * RESOLUCAO DINAMICA DE NOMES DE PROGRAMA                       *
      *---------------------------------------------------------------*
       01  WS-DIN.
      *    (A) NOME EM VARIAVEL - LINHA DE PRODUCAO PARA SGCB0190
           05  WS-PROG-REL               PIC X(08) VALUE 'SGCB0190'.
      *    (B) NOME MONTADO EM RUNTIME - PONTO DE COBERTURA
           05  WS-PROG-REL-ALT           PIC X(08) VALUE SPACES.
           05  WS-PREF                   PIC X(04) VALUE 'SGCB'.
           05  WS-SUF                    PIC X(04) VALUE '0190'.
           05  WS-FL-USA-ALT             PIC X(01) VALUE 'N'.
               88  WS-USAR-MONTADO                VALUE 'S'.
               88  WS-USAR-VARIAVEL               VALUE 'N'.
      *    (C) PROGRAMA EXTERNO OPCIONAL (SO EM AMBIENTE ESPECIAL)
           05  WS-PROG-EXT-LOG           PIC X(08) VALUE 'SGEXTLOG'.
      *
      *---------------------------------------------------------------*
      * AREA DE PARM DE JCL / SYSIN                                   *
      *---------------------------------------------------------------*
       01  WS-PARM-ENTRADA.
           05  WS-PARM-STR               PIC X(50) VALUE SPACES.
           05  WS-PARM-DT                PIC X(08) VALUE SPACES.
           05  WS-PARM-SEP               PIC X(01) VALUE SPACES.
           05  WS-PARM-JAN               PIC X(03) VALUE SPACES.
      *
       01  WS-SYSIN-LINE                 PIC X(80) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * BUFFER DE LOG RESUMIDO                                        *
      *---------------------------------------------------------------*
       01  WS-LOG-REG                    PIC X(180) VALUE SPACES.
       01  WS-LOG-FMT.
           05  FILLER                    PIC X(02) VALUE '* '.
           05  WS-LOG-CATEG              PIC X(08) VALUE SPACES.
           05  FILLER                    PIC X(01) VALUE ' '.
           05  WS-LOG-STEP               PIC X(08) VALUE SPACES.
           05  FILLER                    PIC X(01) VALUE ' '.
           05  WS-LOG-RC                 PIC 9(02) VALUE ZEROES.
           05  FILLER                    PIC X(01) VALUE ' '.
           05  WS-LOG-DTHR               PIC X(14) VALUE SPACES.
           05  FILLER                    PIC X(01) VALUE ' '.
           05  WS-LOG-MSG                PIC X(80) VALUE SPACES.
           05  FILLER                    PIC X(62) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * COPYBOOKS DE APOIO                                            *
      *---------------------------------------------------------------*
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
      *---------------------------------------------------------------*
      * AREAS DE COMUNICACAO COMUNS                                   *
      *---------------------------------------------------------------*
           COPY SGCOMMAR.
           COPY SGPARMEX.
      *
      *---------------------------------------------------------------*
      * LINKAGE - PARM DO JCL                                         *
      *---------------------------------------------------------------*
       LINKAGE SECTION.
       01  PARM-JCL.
           05  PARM-LEN                  PIC S9(04) COMP.
           05  PARM-STR                  PIC X(50).
      *
       PROCEDURE DIVISION USING PARM-JCL.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 1100-OBTER-DATA-PROC
           PERFORM 1200-ABRIR-CTRL-ARQUIVOS
           PERFORM 1300-CARREGAR-PARAMETROS
           PERFORM 1400-VERIFICAR-DIA-UTIL
           PERFORM 1500-VERIFICAR-BLOQUEIOS
           PERFORM 1600-MONTAR-SGCOMMAR
           PERFORM 1900-LOG-INICIO
      *
           IF WS-DEVE-ABORTAR
              PERFORM 8000-FECHAR-CTRL-ARQUIVOS
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2000-ORQUESTRAR-FLUXO
      *
           PERFORM 7000-CHAMAR-EXTERNO-OPCIONAL
      *
           PERFORM 8000-FECHAR-CTRL-ARQUIVOS
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
      *---------------------------------------------------------------*
           MOVE SG-CT-RC-OK              TO WS-RC
           MOVE ZEROES                   TO WS-RC-MAX
                                            WS-RC-STEP
                                            WS-RC-0020
                                            WS-RC-0030
                                            WS-RC-0040
                                            WS-RC-0070
                                            WS-RC-0100
                                            WS-RC-0130
                                            WS-RC-0160
                                            WS-RC-0190
      *
           MOVE FUNCTION CURRENT-DATE    TO WS-CURR-DATE
           MOVE WS-CURR-DATE(9:6)        TO WS-HR-PROC-N
      *
           INITIALIZE SGCOMMAR
                      SGPARMEX
      *
           SET SG-PX-JANELA-DIARIA       TO TRUE
           SET SG-PX-NAO-INC-CRITICA     TO TRUE
           SET SG-PX-ES-RISCO-FIXO       TO TRUE
           SET SG-PX-REAL-DB2            TO TRUE
           SET SG-PX-GERA-INTERFACES     TO TRUE
           SET SG-PX-GERA-RELATORIOS     TO TRUE
      *
           DISPLAY '==============================================='
           DISPLAY 'SGCB0010 - DRIVER JANELA BATCH SIGEC'
           DISPLAY 'HORA INICIO EXEC .: ' WS-HR-PROC-N
           DISPLAY '==============================================='  .
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1100-OBTER-DATA-PROC SECTION.
      *---------------------------------------------------------------*
      * PRIORIDADE:                                                   *
      *   1) PARM DO JCL          PARM='YYYYMMDD[/JAN|MES|EXT]'       *
      *   2) SYSIN (PRIMEIRO REG) 'YYYYMMDD'                          *
      *   3) ACCEPT FROM DATE     YYYYMMDD (DATA DE SISTEMA)          *
      *---------------------------------------------------------------*
           IF PARM-LEN > 0
              MOVE PARM-STR              TO WS-PARM-STR
              PERFORM 1110-PARSE-PARM
              SET WS-PARM-VEIO-JCL       TO TRUE
              MOVE 'PARM'                TO WS-FL-ORIGEM-DATA
           END-IF
      *
           IF WS-DT-PROC-N = ZEROES
              PERFORM 1120-LER-SYSIN
           END-IF
      *
           IF WS-DT-PROC-N = ZEROES
              ACCEPT WS-DT-PROC-N        FROM DATE YYYYMMDD
              MOVE 'DATE'                TO WS-FL-ORIGEM-DATA
           END-IF
      *
           IF WS-DT-PROC-AAAA < 2000
           OR WS-DT-PROC-MM   < 01 OR WS-DT-PROC-MM > 12
           OR WS-DT-PROC-DD   < 01 OR WS-DT-PROC-DD > 31
              DISPLAY '16-DRIVER-INCONS DATA-PROC INVALIDA: '
                      WS-DT-PROC-N
              MOVE SG-CT-RC-CRITICO      TO WS-RC
              MOVE SG-CT-RC-CRITICO      TO WS-RC-MAX
              SET  WS-DEVE-ABORTAR       TO TRUE
           END-IF
      *
           DISPLAY 'DATA PROC .: ' WS-DT-PROC-N
                   '  JANELA .: ' SG-PX-JANELA
                   '  ORIGEM .: ' WS-FL-ORIGEM-DATA .
       1100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1110-PARSE-PARM SECTION.
      *---------------------------------------------------------------*
      * FORMATO ACEITO: 'YYYYMMDD' OU 'YYYYMMDD/JAN'                  *
      *---------------------------------------------------------------*
           MOVE WS-PARM-STR(01:08)       TO WS-PARM-DT
           MOVE WS-PARM-STR(09:01)       TO WS-PARM-SEP
           MOVE WS-PARM-STR(10:03)       TO WS-PARM-JAN
      *
           IF WS-PARM-DT NUMERIC
              MOVE WS-PARM-DT            TO WS-DT-PROC-N
           ELSE
              DISPLAY '16-DRIVER-INCONS PARM NAO NUMERICO: '
                      WS-PARM-STR(01:12)
           END-IF
      *
           IF WS-PARM-SEP = '/'
              EVALUATE WS-PARM-JAN
                 WHEN 'JAN' SET SG-PX-JANELA-DIARIA TO TRUE
                 WHEN 'DIA' SET SG-PX-JANELA-DIARIA TO TRUE
                 WHEN 'MES' SET SG-PX-JANELA-MENSAL TO TRUE
                 WHEN 'EXT' SET SG-PX-JANELA-EXTRA  TO TRUE
                 WHEN OTHER SET SG-PX-JANELA-DIARIA TO TRUE
              END-EVALUATE
           END-IF .
       1110-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1120-LER-SYSIN SECTION.
      *---------------------------------------------------------------*
      * TENTATIVA CONTROLADA DE LEITURA DE SYSIN COMO FALLBACK.       *
      * QUANDO SYSIN NAO EH SUPRIDO O ACCEPT PODE SIMPLESMENTE NAO    *
      * MOVER NADA - MANTEMOS A LINHA EM SPACES E DEIXAMOS PARA A     *
      * ETAPA SEGUINTE FALLBACKAR EM ACCEPT FROM DATE.                *
      *---------------------------------------------------------------*
           MOVE SPACES                   TO WS-SYSIN-LINE
           ACCEPT WS-SYSIN-LINE
           SET  WS-SYSIN-FOI-USADO       TO TRUE
      *
           IF WS-SYSIN-LINE(1:8) NUMERIC
              MOVE WS-SYSIN-LINE(1:8)    TO WS-DT-PROC-N
              MOVE 'SYSIN'               TO WS-FL-ORIGEM-DATA
           END-IF .
       1120-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1200-ABRIR-CTRL-ARQUIVOS SECTION.
      *---------------------------------------------------------------*
           OPEN INPUT  SGLPARM-FILE
           IF NOT FS-PARM-OK
              DISPLAY '12-STEP-ERR-TEC OPEN SGLPARM STATUS='
                      WS-FS-PARM
              MOVE SG-CT-RC-ERR-TEC      TO WS-RC-STEP
              PERFORM 6000-CONSOLIDAR-RC
              SET  WS-DEVE-ABORTAR       TO TRUE
              GO TO 1200-FIM
           END-IF
      *
           OPEN INPUT  SGLFERIA-FILE
           IF NOT FS-FERIA-OK
              DISPLAY '04-STEP-WARNING OPEN SGLFERIA STATUS='
                      WS-FS-FERIA
              MOVE SG-CT-RC-WARN         TO WS-RC-STEP
              PERFORM 6000-CONSOLIDAR-RC
           END-IF
      *
           OPEN INPUT  SGLBLOQ-FILE
           IF NOT FS-BLOQ-OK
              DISPLAY '04-STEP-WARNING OPEN SGLBLOQ STATUS='
                      WS-FS-BLOQ
              MOVE SG-CT-RC-WARN         TO WS-RC-STEP
              PERFORM 6000-CONSOLIDAR-RC
           END-IF
      *
           OPEN OUTPUT SGLLOG-FILE
           IF NOT FS-LOG-OK
              DISPLAY '04-STEP-WARNING OPEN SGLLOG STATUS='
                      WS-FS-LOG
           END-IF .
       1200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1300-CARREGAR-PARAMETROS SECTION.
      *---------------------------------------------------------------*
      * LE SGLPARM APLICANDO OS ITENS RECONHECIDOS SOBRE SGPARMEX.    *
      * ITENS DESCONHECIDOS OU FORA DE VIGENCIA SAO IGNORADOS COM     *
      * INCREMENTO DE CONTADOR - NAO AFETAM RC.                       *
      *---------------------------------------------------------------*
           MOVE 'N'                      TO WS-FL-EOF-PARM
           MOVE ZEROES                   TO WS-PARM-QTD-LIDAS
                                            WS-PARM-QTD-APLIC
                                            WS-PARM-QTD-IGNOR
      *
           PERFORM UNTIL WS-EOF-PARM
              READ SGLPARM-FILE
                 AT END
                    SET WS-EOF-PARM      TO TRUE
                 NOT AT END
                    ADD 1                TO WS-PARM-QTD-LIDAS
                    PERFORM 1310-APLICAR-PARM
              END-READ
           END-PERFORM
      *
           SET  WS-PARM-CARGA-OK         TO TRUE
      *
           DISPLAY 'SGLPARM LIDOS/APLIC/IGNOR .: '
                   WS-PARM-QTD-LIDAS ' / '
                   WS-PARM-QTD-APLIC ' / '
                   WS-PARM-QTD-IGNOR .
       1300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1310-APLICAR-PARM SECTION.
      *---------------------------------------------------------------*
           IF WS-DT-PROC-N < PARM-DT-VIGENCIA-INI
           OR WS-DT-PROC-N > PARM-DT-VIGENCIA-FIM
              ADD 1                      TO WS-PARM-QTD-IGNOR
              GO TO 1310-FIM
           END-IF
      *
           EVALUATE PARM-CHAVE
              WHEN 'LIMITE-COMMIT              '
                 IF PARM-VALOR(1:5) NUMERIC
                    MOVE PARM-VALOR(1:5) TO SG-PX-LIMITE-COMMIT
                    ADD  1               TO WS-PARM-QTD-APLIC
                 ELSE
                    ADD  1               TO WS-PARM-QTD-IGNOR
                 END-IF
              WHEN 'LIMITE-ERROS               '
                 IF PARM-VALOR(1:5) NUMERIC
                    MOVE PARM-VALOR(1:5) TO SG-PX-LIMITE-ERROS
                    ADD  1               TO WS-PARM-QTD-APLIC
                 ELSE
                    ADD  1               TO WS-PARM-QTD-IGNOR
                 END-IF
              WHEN 'FL-INCLUI-CRITICA          '
                 MOVE PARM-VALOR(1:1)    TO SG-PX-FL-INCLUI-CRITICA
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN 'FL-SIMULA-DB2              '
                 MOVE PARM-VALOR(1:1)    TO SG-PX-FL-SIMULA-DB2
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN 'FL-GERA-INTERFACES         '
                 MOVE PARM-VALOR(1:1)    TO SG-PX-FL-GERA-INTERFACES
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN 'FL-GERA-RELATORIOS         '
                 MOVE PARM-VALOR(1:1)    TO SG-PX-FL-GERA-RELATORIOS
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN 'FL-EXT-LOG                 '
                 MOVE PARM-VALOR(1:1)    TO WS-FL-EXT-LOG
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN 'FL-USA-BUILD               '
                 MOVE PARM-VALOR(1:1)    TO WS-FL-USA-ALT
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN 'FL-FIM-ALTERNATIVO         '
                 MOVE PARM-VALOR(1:1)    TO WS-FL-FIM-ALTERNATIVO
                 ADD  1                  TO WS-PARM-QTD-APLIC
              WHEN OTHER
                 ADD  1                  TO WS-PARM-QTD-IGNOR
           END-EVALUATE .
       1310-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1400-VERIFICAR-DIA-UTIL SECTION.
      *---------------------------------------------------------------*
      * VARRE SGLFERIA E, SE ENCONTRAR REGISTRO NACIONAL/BANCARIO      *
      * PARA A DATA DE PROCESSAMENTO, MARCA COMO NAO-UTIL.            *
      * A VALIDACAO CANONICA DE DIA UTIL VIVE EM SGCB0180 (SUBROTINA) *
      * MAS O DRIVER FAZ CHECAGEM DEFENSIVA PARA ABORTAR CEDO.        *
      *---------------------------------------------------------------*
           IF FS-FERIA-INDISP
              GO TO 1400-FIM
           END-IF
      *
           MOVE 'N'                      TO WS-FL-EOF-FERIA
           PERFORM UNTIL WS-EOF-FERIA
              READ SGLFERIA-FILE
                 AT END
                    SET WS-EOF-FERIA     TO TRUE
                 NOT AT END
                    IF FERIA-DT-FERIADO = WS-DT-PROC-N
                       IF FERIA-TIPO-NACIONAL
                       OR FERIA-TIPO-BANCARIO
                          SET WS-DIA-NAO-UTIL TO TRUE
                       END-IF
                    END-IF
              END-READ
           END-PERFORM
      *
           IF WS-DIA-NAO-UTIL
              DISPLAY '08-DIA-NAO-UTIL DATA=' WS-DT-PROC-N
              MOVE SG-CT-RC-ERR-FUNC     TO WS-RC-STEP
              PERFORM 6000-CONSOLIDAR-RC
              IF NOT SG-PX-INCLUI-CRITICA
                 SET  WS-DEVE-ABORTAR    TO TRUE
              END-IF
           END-IF .
       1400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1500-VERIFICAR-BLOQUEIOS SECTION.
      *---------------------------------------------------------------*
           IF FS-BLOQ-INDISP
              GO TO 1500-FIM
           END-IF
      *
           MOVE 'N'                      TO WS-FL-EOF-BLOQ
           PERFORM UNTIL WS-EOF-BLOQ
              READ SGLBLOQ-FILE
                 AT END
                    SET WS-EOF-BLOQ      TO TRUE
                 NOT AT END
                    PERFORM 1510-AVALIAR-BLOQUEIO
              END-READ
           END-PERFORM
      *
           IF WS-JANELA-BLOQUEADA
              DISPLAY '08-BLOQUEIO-ATIVO PARA DATA=' WS-DT-PROC-N
              MOVE SG-CT-RC-ERR-FUNC     TO WS-RC-STEP
              PERFORM 6000-CONSOLIDAR-RC
              SET  WS-DEVE-ABORTAR       TO TRUE
           END-IF .
       1500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1510-AVALIAR-BLOQUEIO SECTION.
      *---------------------------------------------------------------*
           IF BLOQ-ATIVO
              AND BLOQ-TIPO-JANELA
              AND WS-DT-PROC-N NOT < BLOQ-DT-INICIO
              AND WS-DT-PROC-N NOT > BLOQ-DT-FIM
              SET WS-JANELA-BLOQUEADA    TO TRUE
              DISPLAY '  BLOQ-ID=' BLOQ-ID
                      ' MOTIVO=' BLOQ-CD-MOTIVO
                      ' APROV=' BLOQ-APROVADOR
           END-IF .
       1510-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1600-MONTAR-SGCOMMAR SECTION.
      *---------------------------------------------------------------*
           MOVE WS-PROG                  TO SGC-PROG-CHAMADOR
           MOVE SPACES                   TO SGC-PROG-CHAMADO
           MOVE WS-DT-PROC-N             TO SGC-DT-PROCESSAMENTO
           MOVE WS-HR-PROC-N             TO SGC-HORA-EXEC
           MOVE ZEROES                   TO SGC-RETURN-CODE
           MOVE MS-EXEC-OK               TO SGC-MENSAGEM
           MOVE 'SIGECBAT'               TO SGC-USUARIO-EXEC
           MOVE 'PRD'                    TO SGC-AMBIENTE
           MOVE WS-ID-EXEC               TO SGC-ID-EXECUCAO
           MOVE ZEROES                   TO SGC-QT-REGS-LIDOS
                                            SGC-QT-REGS-GRAV
                                            SGC-QT-REGS-REJ .
       1600-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1900-LOG-INICIO SECTION.
      *---------------------------------------------------------------*
           MOVE 'INICIO  '               TO WS-LOG-CATEG
           MOVE WS-PROG                  TO WS-LOG-STEP
           MOVE ZEROES                   TO WS-LOG-RC
           MOVE WS-CURR-DATE(1:14)       TO WS-LOG-DTHR
           STRING 'DT-PROC=' DELIMITED BY SIZE
                  WS-DT-PROC-N           DELIMITED BY SIZE
                  ' JAN='                DELIMITED BY SIZE
                  SG-PX-JANELA           DELIMITED BY SIZE
                  ' ORIG='               DELIMITED BY SIZE
                  WS-FL-ORIGEM-DATA      DELIMITED BY SIZE
              INTO WS-LOG-MSG
           END-STRING
           PERFORM 6100-GRAVAR-LOG .
       1900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ORQUESTRAR-FLUXO SECTION.
      *---------------------------------------------------------------*
      * ORDEM CANONICA. CADA STEP DECIDE SE PODEMOS SEGUIR.           *
      * QUALQUER STEP QUE MARQUE WS-DEVE-ABORTAR INTERROMPE O RESTO.  *
      *---------------------------------------------------------------*
           PERFORM 2010-STEP-SGCB0020
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2020-STEP-SGCB0030
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2030-STEP-SGCB0040
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2040-STEP-SGCB0070
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2050-STEP-SGCB0100
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2060-STEP-SGCB0130
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2070-STEP-SGCB0160
           IF WS-DEVE-ABORTAR
              GO TO 2000-FIM
           END-IF
      *
           PERFORM 2080-STEP-DINAMICO-REL .
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2010-STEP-SGCB0020 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0020'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0020'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0020
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP020 '               TO WS-LOG-CATEG
           MOVE 'SGCB0020'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2010-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2020-STEP-SGCB0030 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0030'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0030'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0030
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP030 '               TO WS-LOG-CATEG
           MOVE 'SGCB0030'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2020-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2030-STEP-SGCB0040 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0040'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0040'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0040
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP040 '               TO WS-LOG-CATEG
           MOVE 'SGCB0040'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2030-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2040-STEP-SGCB0070 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0070'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0070'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0070
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP070 '               TO WS-LOG-CATEG
           MOVE 'SGCB0070'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2040-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2050-STEP-SGCB0100 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0100'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0100'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0100
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP100 '               TO WS-LOG-CATEG
           MOVE 'SGCB0100'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2050-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2060-STEP-SGCB0130 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0130'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0130'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0130
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP130 '               TO WS-LOG-CATEG
           MOVE 'SGCB0130'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2060-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2070-STEP-SGCB0160 SECTION.
      *---------------------------------------------------------------*
           MOVE 'SGCB0160'               TO SGC-PROG-CHAMADO
           CALL 'SGCB0160'
           MOVE RETURN-CODE              TO WS-RC-STEP
           MOVE WS-RC-STEP               TO WS-RC-0160
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP160 '               TO WS-LOG-CATEG
           MOVE 'SGCB0160'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2070-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2080-STEP-DINAMICO-REL SECTION.
      *---------------------------------------------------------------*
      * INVOCACAO DINAMICA DO STEP DE RELATORIOS (SGCB0190).          *
      * DOIS CAMINHOS EQUIVALENTES:                                   *
      *   (A) VARIAVEL WS-PROG-REL - LINHA DE PRODUCAO                *
      *   (B) MONTAGEM RUNTIME COM STRING - PONTO DE COBERTURA        *
      * A ROTA E DECIDIDA POR WS-FL-USA-ALT (LIDA DE SGLPARM).        *
      *---------------------------------------------------------------*
           IF WS-USAR-MONTADO
              MOVE SPACES                TO WS-PROG-REL-ALT
              STRING WS-PREF DELIMITED BY SIZE
                     WS-SUF  DELIMITED BY SIZE
                 INTO WS-PROG-REL-ALT
              END-STRING
              MOVE WS-PROG-REL-ALT       TO SGC-PROG-CHAMADO
              CALL WS-PROG-REL-ALT
                 ON EXCEPTION
                    DISPLAY '12-CALL-DIN-FALHOU NOME=' WS-PROG-REL-ALT
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC-STEP
                 NOT ON EXCEPTION
                    MOVE RETURN-CODE     TO WS-RC-STEP
              END-CALL
           ELSE
              MOVE WS-PROG-REL           TO SGC-PROG-CHAMADO
              CALL WS-PROG-REL
                 ON EXCEPTION
                    DISPLAY '12-CALL-DIN-FALHOU NOME=' WS-PROG-REL
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC-STEP
                 NOT ON EXCEPTION
                    MOVE RETURN-CODE     TO WS-RC-STEP
              END-CALL
           END-IF
      *
           MOVE WS-RC-STEP               TO WS-RC-0190
           PERFORM 6000-CONSOLIDAR-RC
           MOVE 'STEP190 '               TO WS-LOG-CATEG
           MOVE 'SGCB0190'               TO WS-LOG-STEP
           PERFORM 6200-LOG-STEP .
       2080-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6000-CONSOLIDAR-RC SECTION.
      *---------------------------------------------------------------*
      * REGRAS DE CONSOLIDACAO DO RC DA JANELA:                       *
      *   RC-MAX <- MAX(RC-MAX, RC-STEP)                              *
      *   RC=12+  -> WS-DEVE-ABORTAR (SEMPRE)                         *
      *   RC=08   -> WS-DEVE-ABORTAR SALVO SE SG-PX-INCLUI-CRITICA    *
      *---------------------------------------------------------------*
           IF WS-RC-STEP > WS-RC-MAX
              MOVE WS-RC-STEP            TO WS-RC-MAX
           END-IF
      *
           EVALUATE TRUE
              WHEN WS-RC-STEP >= 12
                 SET WS-DEVE-ABORTAR     TO TRUE
                 DISPLAY '12-STEP-ERR-TEC ABORTANDO JANELA RC='
                         WS-RC-STEP
              WHEN WS-RC-STEP = 08
                 IF SG-PX-INCLUI-CRITICA
                    DISPLAY '08-STEP-ERR-FUNC TOLERADO POR FLAG '
                            'FL-INCLUI-CRITICA=S'
                 ELSE
                    SET WS-DEVE-ABORTAR  TO TRUE
                    DISPLAY '08-STEP-ERR-FUNC ABORTA (SEM OVERRIDE)'
                 END-IF
              WHEN WS-RC-STEP = 04
                 DISPLAY '04-STEP-WARNING PROSSEGUINDO'
              WHEN OTHER
                 CONTINUE
           END-EVALUATE .
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6100-GRAVAR-LOG SECTION.
      *---------------------------------------------------------------*
           IF NOT FS-LOG-OK
              GO TO 6100-FIM
           END-IF
           MOVE WS-LOG-FMT               TO WS-LOG-REG
           WRITE LOG-REG                 FROM WS-LOG-REG
           IF NOT FS-LOG-OK
              DISPLAY '04-STEP-WARNING WRITE SGLLOG STATUS='
                      WS-FS-LOG
           END-IF .
       6100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6200-LOG-STEP SECTION.
      *---------------------------------------------------------------*
           MOVE WS-RC-STEP               TO WS-LOG-RC
           MOVE FUNCTION CURRENT-DATE(1:14)
                                         TO WS-LOG-DTHR
           STRING 'RC-MAX='  DELIMITED BY SIZE
                  WS-RC-MAX  DELIMITED BY SIZE
                  ' ABORT='  DELIMITED BY SIZE
                  WS-FL-ABORT DELIMITED BY SIZE
                  ' PROG='   DELIMITED BY SIZE
                  SGC-PROG-CHAMADO DELIMITED BY SIZE
              INTO WS-LOG-MSG
           END-STRING
           DISPLAY 'STEP ' SGC-PROG-CHAMADO
                   ' RC='  WS-RC-STEP
                   ' RCMAX=' WS-RC-MAX
                   ' ABORT=' WS-FL-ABORT
           PERFORM 6100-GRAVAR-LOG .
       6200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       7000-CHAMAR-EXTERNO-OPCIONAL SECTION.
      *---------------------------------------------------------------*
      * CHAMADA A PROGRAMA EXTERNO 'SGEXTLOG' (NAO FORNECIDO NESTE    *
      * LABORATORIO). SO ACONTECE QUANDO A FLAG FL-EXT-LOG='S' FOR    *
      * ATIVADA VIA SGLPARM. ESTA ROTA E PROPOSITADAMENTE UM PONTO    *
      * FORA DA COBERTURA COMUM - INSTALADA APENAS EM AMBIENTES QUE   *
      * POSSUEM O MODULO SGEXTLOG NO STEPLIB.                         *
      *---------------------------------------------------------------*
           IF NOT WS-EXT-LOG-ATIVO
              DISPLAY 'SGEXTLOG NAO ACIONADO (FL-EXT-LOG=N)'
              GO TO 7000-FIM
           END-IF
      *
           CALL WS-PROG-EXT-LOG USING SGCOMMAR
              ON EXCEPTION
                 DISPLAY '04-STEP-WARNING SGEXTLOG INDISPONIVEL '
                         'NO STEPLIB - SEGUINDO SEM LOG EXTERNO'
              NOT ON EXCEPTION
                 DISPLAY 'SGEXTLOG EXECUTADO RC=' RETURN-CODE
           END-CALL .
       7000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8000-FECHAR-CTRL-ARQUIVOS SECTION.
      *---------------------------------------------------------------*
           CLOSE SGLPARM-FILE
           CLOSE SGLFERIA-FILE
           CLOSE SGLBLOQ-FILE
           IF FS-LOG-OK
              CLOSE SGLLOG-FILE
           END-IF .
       8000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
      *---------------------------------------------------------------*
      * SE A OPERACAO PEDIU FINALIZACAO ALTERNATIVA (RARO), USAMOS    *
      * O DESVIO LEGADO 9500-FINALIZAR-LEGADO COM ALTER PARA REDIRIGIR*
      * O GO TO INTERNO. ESTE E O UNICO USO DE ALTER NO SISTEMA.      *
      *---------------------------------------------------------------*
           IF WS-USAR-FIM-ALTERNATIVO
              ALTER 9500-FINALIZAR-LEGADO
                 TO PROCEED TO 9520-FIM-ALTERNATIVO
           END-IF
           PERFORM 9500-FINALIZAR-LEGADO THRU 9599-FIM-FINALIZ
      *
           MOVE WS-RC-MAX                TO WS-RC
           MOVE WS-RC-MAX                TO SGC-RETURN-CODE
      *
           DISPLAY '==============================================='
           DISPLAY 'SGCB0010 - FIM DA JANELA'
           DISPLAY 'RC-MAX ....: ' WS-RC-MAX
           DISPLAY 'RC-0020 ...: ' WS-RC-0020
                   '  RC-0030 .: ' WS-RC-0030
                   '  RC-0040 .: ' WS-RC-0040
           DISPLAY 'RC-0070 ...: ' WS-RC-0070
                   '  RC-0100 .: ' WS-RC-0100
                   '  RC-0130 .: ' WS-RC-0130
           DISPLAY 'RC-0160 ...: ' WS-RC-0160
                   '  RC-0190 .: ' WS-RC-0190
           DISPLAY '==============================================='
      *
           MOVE WS-RC-MAX                TO RETURN-CODE .
       9000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * SECTION LEGADA COM ALTER CONTROLADO                           *
      *---------------------------------------------------------------*
      * MANTIDA POR COMPATIBILIDADE COM MECANICA DE FINALIZACAO       *
      * ALTERNATIVA USADA EM CONTINGENCIAS RARAS (EX.: FALHA NO SPOOL *
      * DE LOG). O ALTER FEITO EM 9000-FINALIZAR E O UNICO PONTO QUE  *
      * MUDA O DESTINO DO GO TO ABAIXO. NAO REMOVER SEM COORDENAR     *
      * COM OPERACOES. O PARAGRAFO 9500-FINALIZAR-LEGADO CONTEM       *
      * APENAS UM GO TO (PRE-REQUISITO PARA ALTER).                   *
      *---------------------------------------------------------------*
       9500-FIN-LEGADO SECTION.
       9500-FINALIZAR-LEGADO.
           GO TO 9510-FIM-NORMAL.
       9510-FIM-NORMAL.
           DISPLAY 'FINALIZACAO NORMAL - ROTA PADRAO'
           GO TO 9599-FIM-FINALIZ.
       9520-FIM-ALTERNATIVO.
           DISPLAY 'FINALIZACAO ALTERNATIVA - ROTA RARA ATIVA'
           DISPLAY '  MOTIVO: FL-FIM-ALTERNATIVO=S NO SGLPARM'
           GO TO 9599-FIM-FINALIZ.
       9599-FIM-FINALIZ.
           EXIT.
      *
      *---------------------------------------------------------------*
      * PARAGRAFO NUNCA EXECUTADO NO FLUXO PRINCIPAL                  *
      *---------------------------------------------------------------*
      * 9998-MODO-SIMULACAO-ANTIGO PRESERVA A INSTRUMENTACAO USADA    *
      * NO PILOTO DE 2019 QUANDO A JANELA RODAVA CONTRA O DESCONTINUO *
      * SGCB0999 (SIMULADOR). NENHUM CAMINHO ATUAL LEVA ATE AQUI -    *
      * PONTO DEIXADO PROPOSITALMENTE FORA DA COBERTURA PARA SERVIR   *
      * COMO ARQUEOLOGIA E FUTURA MIGRACAO.                           *
      *---------------------------------------------------------------*
       9998-MODO-SIMULACAO-ANTIGO SECTION.
           DISPLAY '>>> MODO SIMULACAO ANTIGO (NAO USAR EM PROD)'
           MOVE 'SGCB0999'               TO WS-PROG-REL-ALT
           MOVE WS-PROG-REL-ALT          TO SGC-PROG-CHAMADO
           CALL WS-PROG-REL-ALT USING SGCOMMAR
              ON EXCEPTION
                 DISPLAY '  SGCB0999 NAO DISPONIVEL'
           END-CALL
           DISPLAY '<<< FIM DA SIMULACAO ANTIGA' .
       9998-FIM. EXIT.
      *
       END PROGRAM SGCB0010.
