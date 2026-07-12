       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0190.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0190                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: RELATORIOS OPERACIONAIS DA JANELA BATCH E GERACAO *
      *             DE INTERFACES PARA SISTEMAS EXTERNOS.             *
      *             LE ARQUIVOS INTERMEDIARIOS PRODUZIDOS POR         *
      *             SGCB0070/0100/0130/0160, CONSULTA DB2 PARA        *
      *             AGREGADOS ADICIONAIS E EMITE:                     *
      *               - SGLRELDT (RELATORIO DETALHADO)                *
      *               - SGLRELST (RELATORIO SINTETICO)                *
      *               - SGLINTCB (INTERFACE COBRANCA)                 *
      *               - SGLINTCT (INTERFACE CONTABIL)                 *
      *               - SGLERROS (COPIA CONSOLIDADA DE ERROS)         *
      *---------------------------------------------------------------*
      * FORMATACAO DAS LINHAS DE INTERFACE E DELEGADA A SGCB0200,     *
      * CHAMADO DE FORMA DINAMICA. O NOME DO PROGRAMA E RESOLVIDO EM  *
      * TEMPO DE EXECUCAO POR DOIS CAMINHOS:                          *
      *   (A) VIA VARIAVEL WS-PROG-FMT (VALOR 'SGCB0200')             *
      *   (B) VIA CONSTRUCAO STRING 'SGCB' + WS-SUF (default '0200')  *
      * A SEGUNDA FORMA E PONTO DE COBERTURA DE TESTE - PODE MONTAR   *
      * OUTRO SUFIXO EM MANUTENCAO FUTURA.                            *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (RELATORIO VAZIO OU INTERFACE VAZIA)             *
      *   08 - ERRO FUNCIONAL                                         *
      *   12 - ERRO TECNICO (FILE STATUS / CALL FALHOU)               *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
      *---- ENTRADAS -------------------------------------------------*
           SELECT SGLENCAR-FILE
                  ASSIGN TO SGLENCAR
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-ENCAR.
      *
           SELECT SGLINADI-FILE
                  ASSIGN TO SGLINADI
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-INADI.
      *
           SELECT SGLPROP-FILE
                  ASSIGN TO SGLPROP
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-PROP.
      *
           SELECT SGLERROS-IN-FILE
                  ASSIGN TO SGLERRIN
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-ERR-IN.
      *
      *---- ENTRADA OPCIONAL VB (LAYOUT VARIAVEL / MULTI-LAYOUT) ------*
           SELECT SGLVARAR-FILE
                  ASSIGN TO SGLVARAR
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-VARAR.
      *
      *---- SAIDAS ---------------------------------------------------*
           SELECT SGLRELDT-FILE
                  ASSIGN TO SGLRELDT
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-RELDT.
      *
           SELECT SGLRELST-FILE
                  ASSIGN TO SGLRELST
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-RELST.
      *
           SELECT SGLINTCB-FILE
                  ASSIGN TO SGLINTCB
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-INTCB.
      *
           SELECT SGLINTCT-FILE
                  ASSIGN TO SGLINTCT
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-INTCT.
      *
           SELECT SGLERROS-OUT-FILE
                  ASSIGN TO SGLERROT
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-ERR-OT.
      *
       DATA DIVISION.
       FILE SECTION.
      *---- ENTRADAS -------------------------------------------------*
       FD  SGLENCAR-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLENCAR.
      *
       FD  SGLINADI-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLINADI.
      *
       FD  SGLPROP-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPROP.
      *
       FD  SGLERROS-IN-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
       01  REG-ERR-IN.
           05  ERR-IN-BUFFER             PIC X(200).
      *
       FD  SGLVARAR-FILE
           RECORDING MODE IS V
           RECORD IS VARYING IN SIZE FROM 50 TO 400 CHARACTERS
               DEPENDING ON WS-SGVA-TAMANHO
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
       01  REG-VARAR-FD                  PIC X(400).
      *
      *---- SAIDAS ---------------------------------------------------*
       FD  SGLRELDT-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLRELDT.
      *
       FD  SGLRELST-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
      *    NOTA: SGLRELST COPYBOOK DEFINE REG + AREA DE WORKING;
      *    AQUI USAMOS APENAS O REG. A AREA WS-RELST-ACUM E DECLARADA
      *    NA WORKING-STORAGE (VIA COPY) PARA NAO CONFLITAR COM FD.
       01  REG-RELST-FD.
           05  RELST-FD-BUFFER           PIC X(133).
      *
       FD  SGLINTCB-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLINTCB.
      *
       FD  SGLINTCT-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLINTCT.
      *
       FD  SGLERROS-OUT-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
       01  REG-ERR-OUT.
           05  ERR-OUT-BUFFER            PIC X(200).
      *
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           COPY SGRETCOD.
           COPY SGERRMSG.
      *    AREA ACUMULADORES DO SINTETICO
           COPY SGLRELST.
      *    AREA DE COMUNICACAO PARA CALL DINAMICO
           COPY SGINTFMT.
           COPY SGCOMMAR.
           COPY SGLVARAR.
      *
       01  WS-FILE-STATUS.
           05  WS-FS-ENCAR               PIC X(02) VALUE '00'.
               88  FS-ENCAR-OK                    VALUE '00'.
               88  FS-ENCAR-EOF                   VALUE '10'.
               88  FS-ENCAR-INDISP                VALUES '35' '37'
                                                         '39' '93'.
           05  WS-FS-INADI               PIC X(02) VALUE '00'.
               88  FS-INADI-OK                    VALUE '00'.
               88  FS-INADI-EOF                   VALUE '10'.
               88  FS-INADI-INDISP                VALUES '35' '37'
                                                         '39' '93'.
           05  WS-FS-PROP                PIC X(02) VALUE '00'.
               88  FS-PROP-OK                     VALUE '00'.
               88  FS-PROP-EOF                    VALUE '10'.
               88  FS-PROP-INDISP                 VALUES '35' '37'
                                                         '39' '93'.
           05  WS-FS-ERR-IN              PIC X(02) VALUE '00'.
               88  FS-ERRIN-OK                    VALUE '00'.
               88  FS-ERRIN-EOF                   VALUE '10'.
               88  FS-ERRIN-INDISP                VALUES '35' '37'
                                                         '39' '93'.
           05  WS-FS-VARAR               PIC X(02) VALUE '00'.
               88  FS-VARAR-OK                    VALUE '00'.
               88  FS-VARAR-EOF                   VALUE '10'.
               88  FS-VARAR-INDISP                VALUES '35' '37'
                                                         '39' '93'.
           05  WS-FS-RELDT               PIC X(02) VALUE '00'.
               88  FS-RELDT-OK                    VALUE '00'.
           05  WS-FS-RELST               PIC X(02) VALUE '00'.
               88  FS-RELST-OK                    VALUE '00'.
           05  WS-FS-INTCB               PIC X(02) VALUE '00'.
               88  FS-INTCB-OK                    VALUE '00'.
           05  WS-FS-INTCT               PIC X(02) VALUE '00'.
               88  FS-INTCT-OK                    VALUE '00'.
           05  WS-FS-ERR-OT              PIC X(02) VALUE '00'.
               88  FS-ERROT-OK                    VALUE '00'.
      *
       01  WS-QT-VARAR-LIDOS             PIC 9(09) VALUE ZEROES.
       01  WS-FL-VARAR-ATIVO             PIC X(01) VALUE 'N'.
           88  WS-VARAR-DISPONIVEL                VALUE 'S'.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0190'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-DT-PROC                PIC 9(08)  VALUE ZEROES.
           05  WS-HR-PROC                PIC 9(06)  VALUE ZEROES.
           05  WS-DT-EDIT                PIC X(10)  VALUE SPACES.
           05  WS-HR-EDIT                PIC X(08)  VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * RESOLUCAO DINAMICA DO PROGRAMA DE FORMATACAO                  *
      *---------------------------------------------------------------*
       01  WS-FMT.
      *    (A) VARIAVEL DIRETA - LINHA BASE DE PRODUCAO
           05  WS-PROG-FMT               PIC X(08) VALUE 'SGCB0200'.
      *    (B) CONSTRUCAO POR CONCATENACAO - USADA PARA COBERTURA
      *        DE TESTE E EVENTUAL SWITCH DE VERSAO FUTURA
           05  WS-PROG-BUILD             PIC X(08) VALUE SPACES.
           05  WS-PREF                   PIC X(04) VALUE 'SGCB'.
           05  WS-SUF                    PIC X(04) VALUE '0200'.
           05  WS-FL-USA-BUILD           PIC X(01) VALUE 'N'.
               88  WS-USAR-BUILD                  VALUE 'S'.
               88  WS-USAR-DIRETO                 VALUE 'N'.
      *
       01  WS-CONTADORES.
           05  WS-QT-ENC-LIDOS           PIC 9(09) VALUE ZEROES.
           05  WS-QT-INA-LIDOS           PIC 9(09) VALUE ZEROES.
           05  WS-QT-PROP-LIDOS          PIC 9(09) VALUE ZEROES.
           05  WS-QT-ERR-LIDOS           PIC 9(09) VALUE ZEROES.
           05  WS-QT-RELDT-GRAV          PIC 9(09) VALUE ZEROES.
           05  WS-QT-RELST-GRAV          PIC 9(09) VALUE ZEROES.
           05  WS-QT-INTCB-GRAV          PIC 9(09) VALUE ZEROES.
           05  WS-QT-INTCT-GRAV          PIC 9(09) VALUE ZEROES.
           05  WS-QT-ERR-GRAV            PIC 9(09) VALUE ZEROES.
           05  WS-SEQ-INTCB              PIC 9(09) VALUE ZEROES.
           05  WS-SEQ-INTCT              PIC 9(09) VALUE ZEROES.
           05  WS-SOMA-DIVIDA            PIC S9(17)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-DEBITO            PIC S9(17)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-CREDITO           PIC S9(17)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-QT-CRITICAS            PIC 9(09) VALUE ZEROES.
      *
       01  WS-FLAGS.
           05  WS-FL-ABORT               PIC X(01) VALUE 'N'.
               88  WS-DEVE-ABORTAR                VALUE 'S'.
      *
      *---------------------------------------------------------------*
      * AGREGADORES DB2 (LIDOS EM 5000-CONSULTAS-CONSOLIDADAS)        *
      *---------------------------------------------------------------*
       01  WS-DB2-AGG.
           05  WS-DB2-QT-CTR-INAD        PIC S9(09) COMP.
           05  WS-DB2-QT-PAG-DIA         PIC S9(09) COMP.
           05  WS-DB2-SOMA-PAG-DIA       PIC S9(15)V99 COMP-3.
           05  WS-DB2-SOMA-CART          PIC S9(15)V99 COMP-3.
      *
       01  WS-EDIT.
           05  WS-VLR-EDIT-18            PIC ZZZZZZZZZZZZZ9.99.
           05  WS-VLR-EDIT-20            PIC ZZZZZZZZZZZZZZZ9.99.
           05  WS-QT-EDIT-11             PIC ZZZZZZZZZZ9.
      *
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-ABRIR-ARQUIVOS
           IF WS-DEVE-ABORTAR
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2100-GRAVAR-HEADERS
      *
           PERFORM 3000-PROC-ENCARGOS
           PERFORM 3100-PROC-INADIMPLENCIA
           PERFORM 3200-PROC-PROPOSTAS
           PERFORM 3300-PROC-ERROS
           PERFORM 3400-PROC-VARIAVEL
      *
           PERFORM 5000-CONSULTAS-CONSOLIDADAS
      *
           PERFORM 6000-EMITIR-SINTETICO
           PERFORM 7000-EMITIR-INTERFACES
      *
           PERFORM 8000-GRAVAR-TRAILERS
           PERFORM 8900-FECHAR-ARQUIVOS
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
      *---------------------------------------------------------------*
           MOVE SG-CT-RC-OK              TO WS-RC
           MOVE WS-PROG                  TO SGC-PROG-CHAMADO
           MOVE FUNCTION CURRENT-DATE (1:8)
                                          TO WS-DT-PROC
           MOVE FUNCTION CURRENT-DATE (9:6)
                                          TO WS-HR-PROC
           MOVE WS-DT-PROC               TO SGC-DT-PROCESSAMENTO
           MOVE WS-HR-PROC               TO SGC-HORA-EXEC
           STRING WS-DT-PROC (1:4) '-'
                  WS-DT-PROC (5:2) '-'
                  WS-DT-PROC (7:2)
                  DELIMITED BY SIZE
                  INTO WS-DT-EDIT
           END-STRING
           STRING WS-HR-PROC (1:2) ':'
                  WS-HR-PROC (3:2) ':'
                  WS-HR-PROC (5:2)
                  DELIMITED BY SIZE
                  INTO WS-HR-EDIT
           END-STRING
           MOVE 'N'                      TO WS-FL-ABORT
           INITIALIZE WS-RELST-ACUM
           MOVE ZEROES                   TO WS-DB2-QT-CTR-INAD
                                            WS-DB2-QT-PAG-DIA
                                            WS-DB2-SOMA-PAG-DIA
                                            WS-DB2-SOMA-CART.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-ARQUIVOS SECTION.
      *---------------------------------------------------------------*
           OPEN INPUT SGLENCAR-FILE
           IF NOT FS-ENCAR-OK AND NOT FS-ENCAR-INDISP
              PERFORM 8700-ERRO-ABERTURA
                 THRU 8700-FIM
              GO TO 2000-FIM
           END-IF
      *
           OPEN INPUT SGLINADI-FILE
           IF NOT FS-INADI-OK AND NOT FS-INADI-INDISP
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
           OPEN INPUT SGLPROP-FILE
           IF NOT FS-PROP-OK AND NOT FS-PROP-INDISP
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
           OPEN INPUT SGLERROS-IN-FILE
           IF NOT FS-ERRIN-OK AND NOT FS-ERRIN-INDISP
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
      *    ARQUIVO VB OPCIONAL - SE AUSENTE, SEGUE SEM ELE
           OPEN INPUT SGLVARAR-FILE
           IF FS-VARAR-OK
              MOVE 'S'                   TO WS-FL-VARAR-ATIVO
           ELSE
              MOVE 'N'                   TO WS-FL-VARAR-ATIVO
              IF NOT FS-VARAR-INDISP
                 DISPLAY 'SGCB0190 AVISO SGLVARAR FS=' WS-FS-VARAR
              END-IF
           END-IF
      *
           OPEN OUTPUT SGLRELDT-FILE
           IF NOT FS-RELDT-OK
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLRELST-FILE
           IF NOT FS-RELST-OK
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLINTCB-FILE
           IF NOT FS-INTCB-OK
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLINTCT-FILE
           IF NOT FS-INTCT-OK
              PERFORM 8700-ERRO-ABERTURA
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLERROS-OUT-FILE
           IF NOT FS-ERROT-OK
              PERFORM 8700-ERRO-ABERTURA
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2100-GRAVAR-HEADERS SECTION.
      *---------------------------------------------------------------*
      *    RELATORIO DETALHADO - CABECALHO (RELDT-LT-CAB)
           MOVE SPACES                 TO REG-SGLRELDT
           MOVE '1'                    TO RELDT-CTL
           MOVE 'CB'                   TO RELDT-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELDT-DATA-EDIT
           MOVE WS-HR-EDIT             TO RELDT-HORA-EDIT
           MOVE 'RELATORIO DETALHE   ' TO RELDT-EVENTO
           MOVE 'SGCB0190  '           TO RELDT-CD-EVENTO
           WRITE REG-SGLRELDT
           IF NOT FS-RELDT-OK
              PERFORM 8710-ERRO-WRITE
           END-IF
           ADD 1 TO WS-QT-RELDT-GRAV
      *
      *    RELATORIO SINTETICO - HEADER
           MOVE SPACES                 TO REG-SGLRELST
                                          REG-RELST-FD
           MOVE '1'                    TO RELST-CTL
           MOVE 'CB'                   TO RELST-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELST-DT-REF-EDIT
           MOVE 'SGCB0190 SINTETICO  ' TO RELST-DIMENSAO
           MOVE REG-SGLRELST           TO REG-RELST-FD
           WRITE REG-RELST-FD
           IF FS-RELST-OK
              ADD 1 TO WS-QT-RELST-GRAV
           END-IF
      *
      *    INTERFACE COBRANCA - HEADER (VIA SGCB0200 DINAMICO)
           INITIALIZE SGINTFMT
           MOVE 'CB'                   TO SG-IF-TIPO-INTERFACE
           MOVE 'H'                    TO SG-IF-TIPO-REGISTRO
           MOVE WS-DT-PROC             TO SG-IF-DT-REFERENCIA
           MOVE 0                      TO SG-IF-SEQ-REGISTRO
           PERFORM 7900-CALL-FMT
      *
           MOVE SPACES                 TO REG-SGLINTCB
           MOVE 'H'                    TO INTCB-HDR-TIPO
           MOVE 'INTCB '               TO INTCB-HDR-COD-INTERFACE
           MOVE WS-DT-PROC             TO INTCB-HDR-DT-REF
           MOVE WS-HR-PROC             TO INTCB-HDR-HR-GERACAO
           MOVE 'SGCB0190'             TO INTCB-HDR-ORIGEM
           MOVE 'SGXCOB  '             TO INTCB-HDR-DESTINO
           MOVE 'V001'                 TO INTCB-HDR-VERSAO
           MOVE ZEROES                 TO INTCB-HDR-QTD-DECLARADA
           MOVE SGC-ID-EXECUCAO        TO INTCB-HDR-ID-EXECUCAO
           MOVE REG-SGLINTCB-HDR       TO REG-SGLINTCB
           WRITE REG-SGLINTCB
      *
      *    INTERFACE CONTABIL - HEADER
           INITIALIZE SGINTFMT
           MOVE 'CT'                   TO SG-IF-TIPO-INTERFACE
           MOVE 'H'                    TO SG-IF-TIPO-REGISTRO
           MOVE WS-DT-PROC             TO SG-IF-DT-REFERENCIA
           MOVE 0                      TO SG-IF-SEQ-REGISTRO
           PERFORM 7900-CALL-FMT
      *
           MOVE SPACES                 TO REG-SGLINTCT
           MOVE 'H'                    TO INTCT-HDR-TIPO
           MOVE 'INTCT '               TO INTCT-HDR-COD-INTERFACE
           MOVE WS-DT-PROC             TO INTCT-HDR-DT-REF
           MOVE WS-HR-PROC             TO INTCT-HDR-HR-GERACAO
           MOVE 'SGCB0190'             TO INTCT-HDR-ORIGEM
           MOVE 'CONTAB  '             TO INTCT-HDR-DESTINO
           MOVE 0001                   TO INTCT-HDR-EMPRESA
           MOVE ZEROES                 TO INTCT-HDR-QTD-LANC
           MOVE REG-SGLINTCT-HDR       TO REG-SGLINTCT
           WRITE REG-SGLINTCT.
       2100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PROCESSAMENTO DO ARQUIVO DE ENCARGOS - APENAS SE DISPONIVEL   *
      * GRAVA UMA LINHA POR ENCARGO NO RELATORIO DETALHADO E EMITE    *
      * LANCAMENTO CONTABIL (SGLINTCT) COM CD_EVENTO='ENCARGO'.       *
      *---------------------------------------------------------------*
       3000-PROC-ENCARGOS SECTION.
           IF FS-ENCAR-INDISP GO TO 3000-FIM END-IF
      *
           PERFORM UNTIL FS-ENCAR-EOF OR WS-DEVE-ABORTAR
              READ SGLENCAR-FILE
                 AT END EXIT PERFORM
                 NOT AT END
                    IF ENCAR-E-DETAIL
                       ADD 1 TO WS-QT-ENC-LIDOS
                       PERFORM 3010-RELDT-ENCARGO
                       PERFORM 3020-CONTAB-ENCARGO
                       ADD 1                       TO
                                     WS-RELST-ACUM-QT-PAG
                       ADD ENCAR-DET-VLR-JUROS     TO
                                     WS-RELST-ACUM-VL-ENC
                    END-IF
              END-READ
           END-PERFORM.
       3000-FIM. EXIT.
      *
       3010-RELDT-ENCARGO SECTION.
           MOVE SPACES                 TO REG-SGLRELDT
           MOVE ' '                    TO RELDT-CTL
           MOVE 'DT'                   TO RELDT-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELDT-DATA-EDIT
           MOVE WS-HR-EDIT             TO RELDT-HORA-EDIT
           MOVE 'ENCARGO CALCULADO   ' TO RELDT-EVENTO
           MOVE 'ENC       '           TO RELDT-CD-EVENTO
           MOVE ENCAR-DET-ID-CONTRATO  TO RELDT-ID-CONTRATO
           MOVE ENCAR-DET-NR-CONTRATO  TO RELDT-NR-CONTRATO
           MOVE SPACES                 TO RELDT-DOCUMENTO
                                          RELDT-CANAL
           MOVE ENCAR-DET-VLR-ATUALIZADO
                                        TO WS-VLR-EDIT-18
           MOVE WS-VLR-EDIT-18         TO RELDT-VALOR-EDIT
           MOVE ENCAR-DET-DIAS-ATRASO  TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11 (1:9)    TO RELDT-QUANT-EDIT
           MOVE 'CALCULADO '           TO RELDT-STATUS
           WRITE REG-SGLRELDT
           IF FS-RELDT-OK
              ADD 1 TO WS-QT-RELDT-GRAV
           END-IF.
       3010-FIM. EXIT.
      *
       3020-CONTAB-ENCARGO SECTION.
           ADD 1 TO WS-SEQ-INTCT
           MOVE SPACES                 TO REG-SGLINTCT
           MOVE 'D'                    TO INTCT-DET-TIPO
           MOVE WS-SEQ-INTCT           TO INTCT-DET-SEQ
           MOVE WS-DT-PROC             TO INTCT-DET-DT-LANC
                                          INTCT-DET-DT-COMPETENCIA
           MOVE 'ENCARGO   '           TO INTCT-DET-CD-EVENTO
           MOVE '4.1.01.001'           TO INTCT-DET-CD-CONTA-DEB
           MOVE '3.1.02.010'           TO INTCT-DET-CD-CONTA-CRE
           MOVE 'CC-COBR   '           TO INTCT-DET-CD-CENTRO-CUS
           MOVE ENCAR-DET-ID-CONTRATO  TO INTCT-DET-ID-CONTRATO
           MOVE ENCAR-DET-NR-CONTRATO  TO INTCT-DET-NR-CONTRATO
           MOVE SPACES                 TO INTCT-DET-DOCUMENTO
           MOVE ENCAR-DET-VLR-JUROS    TO INTCT-DET-VLR-DEBITO
           MOVE ENCAR-DET-VLR-MULTA    TO INTCT-DET-VLR-CREDITO
           MOVE 'BRL'                  TO INTCT-DET-MOEDA
           STRING 'ENCARGO CTR '       DELIMITED BY SIZE
                  ENCAR-DET-NR-CONTRATO
                                        DELIMITED BY SIZE
                  ' DT='               DELIMITED BY SIZE
                  ENCAR-DET-DT-REF     DELIMITED BY SIZE
             INTO INTCT-DET-HISTORICO
           END-STRING
           MOVE 'LOTE-ENC01'           TO INTCT-DET-CD-LOTE
           MOVE REG-SGLINTCT-DET       TO REG-SGLINTCT
           WRITE REG-SGLINTCT
           IF FS-INTCT-OK
              ADD 1 TO WS-QT-INTCT-GRAV
              ADD ENCAR-DET-VLR-JUROS TO WS-SOMA-DEBITO
              ADD ENCAR-DET-VLR-MULTA TO WS-SOMA-CREDITO
           END-IF.
       3020-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PROCESSAMENTO DO ARQUIVO DE INADIMPLENCIA - GERA LINHA NO     *
      * DETALHADO E LINHA NA INTERFACE DE COBRANCA (VIA SGCB0200).    *
      *---------------------------------------------------------------*
       3100-PROC-INADIMPLENCIA SECTION.
           IF FS-INADI-INDISP GO TO 3100-FIM END-IF
      *
           PERFORM UNTIL FS-INADI-EOF OR WS-DEVE-ABORTAR
              READ SGLINADI-FILE
                 AT END EXIT PERFORM
                 NOT AT END
                    IF INADI-E-DETAIL
                       ADD 1 TO WS-QT-INA-LIDOS
                       PERFORM 3110-RELDT-INADIM
                       PERFORM 3120-INTCB-INADIM
                       IF INADI-FX-CRIT
                          ADD 1 TO WS-QT-CRITICAS
                       END-IF
                       ADD INADI-DET-VLR-SALDO
                                            TO WS-SOMA-DIVIDA
                    END-IF
              END-READ
           END-PERFORM.
       3100-FIM. EXIT.
      *
       3110-RELDT-INADIM SECTION.
           MOVE SPACES                 TO REG-SGLRELDT
           MOVE ' '                    TO RELDT-CTL
           MOVE 'DT'                   TO RELDT-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELDT-DATA-EDIT
           MOVE WS-HR-EDIT             TO RELDT-HORA-EDIT
           MOVE 'INADIMPLENCIA DETEC ' TO RELDT-EVENTO
           MOVE 'INA       '           TO RELDT-CD-EVENTO
           MOVE INADI-DET-ID-CONTRATO  TO RELDT-ID-CONTRATO
           MOVE INADI-DET-NR-CONTRATO  TO RELDT-NR-CONTRATO
           MOVE INADI-DET-DOCUMENTO    TO RELDT-DOCUMENTO
           MOVE SPACES                 TO RELDT-CANAL
           MOVE INADI-DET-VLR-SALDO    TO WS-VLR-EDIT-18
           MOVE WS-VLR-EDIT-18         TO RELDT-VALOR-EDIT
           MOVE INADI-DET-QT-PAR-VENC  TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11 (1:9)    TO RELDT-QUANT-EDIT
           MOVE INADI-DET-FAIXA (1:8) TO RELDT-STATUS (1:8)
           WRITE REG-SGLRELDT
           IF FS-RELDT-OK
              ADD 1 TO WS-QT-RELDT-GRAV
           END-IF.
       3110-FIM. EXIT.
      *
       3120-INTCB-INADIM SECTION.
           ADD 1 TO WS-SEQ-INTCB
      *    CHAMA SGCB0200 DINAMICAMENTE PARA FORMATAR (LINHA DE
      *    CONTROLE PARA AUDITORIA - RESULTADO E DESCARTADO AQUI,
      *    O REGISTRO GRAVADO USA O LAYOUT SGLINTCB DIRETO)
           INITIALIZE SGINTFMT
           MOVE 'CB'                   TO SG-IF-TIPO-INTERFACE
           MOVE 'D'                    TO SG-IF-TIPO-REGISTRO
           MOVE WS-DT-PROC             TO SG-IF-DT-REFERENCIA
           MOVE WS-SEQ-INTCB           TO SG-IF-SEQ-REGISTRO
           MOVE INADI-DET-NR-CONTRATO  TO SG-IF-CTR-NUMERO
           MOVE INADI-DET-DOCUMENTO    TO SG-IF-CLI-DOCUMENTO
           MOVE INADI-DET-NOME         TO SG-IF-CLI-NOME
           MOVE INADI-DET-VLR-SALDO    TO SG-IF-VLR-1
           MOVE ZEROES                 TO SG-IF-VLR-2
                                          SG-IF-VLR-3
                                          SG-IF-QTD-2
           MOVE INADI-DET-DIAS-ATRASO  TO SG-IF-QTD-1
           MOVE INADI-DET-DT-REF       TO SG-IF-DT-1
           MOVE ZEROES                 TO SG-IF-DT-2
           MOVE INADI-DET-FAIXA        TO SG-IF-TEXTO-1
           MOVE SPACES                 TO SG-IF-TEXTO-2
           MOVE 'INA       '           TO SG-IF-CODIGO-1
           MOVE INADI-DET-RISCO-ATUAL  TO SG-IF-CODIGO-2 (1:1)
           PERFORM 7900-CALL-FMT
      *
           MOVE SPACES                 TO REG-SGLINTCB
           MOVE 'D'                    TO INTCB-DET-TIPO
           MOVE WS-SEQ-INTCB           TO INTCB-DET-SEQ
           MOVE INADI-DET-DT-REF       TO INTCB-DET-DT-REF
           MOVE INADI-DET-ID-CLIENTE   TO INTCB-DET-ID-CLIENTE
           MOVE INADI-DET-DOCUMENTO    TO INTCB-DET-DOCUMENTO
           MOVE INADI-DET-NOME         TO INTCB-DET-NOME
           MOVE INADI-DET-NR-CONTRATO  TO INTCB-DET-NR-CONTRATO
           MOVE INADI-DET-VLR-SALDO    TO INTCB-DET-VLR-DIVIDA-TOT
           MOVE INADI-DET-DIAS-ATRASO  TO INTCB-DET-DIAS-ATRASO
           MOVE INADI-DET-FAIXA        TO INTCB-DET-FAIXA
           MOVE INADI-DET-RISCO-ATUAL  TO INTCB-DET-CLASSE-RISCO
           EVALUATE TRUE
              WHEN INADI-FX-CRIT MOVE 40 TO INTCB-DET-PRIORIDADE
              WHEN INADI-FX-GRAVE MOVE 30 TO INTCB-DET-PRIORIDADE
              WHEN INADI-FX-MOD  MOVE 20 TO INTCB-DET-PRIORIDADE
              WHEN OTHER         MOVE 10 TO INTCB-DET-PRIORIDADE
           END-EVALUATE
           MOVE 'AUT'                  TO INTCB-DET-CANAL-PREF
           MOVE 0                      TO INTCB-DET-DDD
           MOVE 0                      TO INTCB-DET-TELEFONE
                                          INTCB-DET-CELULAR
           MOVE SPACES                 TO INTCB-DET-EMAIL
           MOVE 'COBRANCA  '           TO INTCB-DET-CD-ACAO
           MOVE 'ORIGEM 0130'          TO INTCB-DET-OBS
           MOVE REG-SGLINTCB-DET       TO REG-SGLINTCB
           WRITE REG-SGLINTCB
           IF FS-INTCB-OK
              ADD 1 TO WS-QT-INTCB-GRAV
           END-IF.
       3120-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3200-PROC-PROPOSTAS SECTION.
      *---------------------------------------------------------------*
           IF FS-PROP-INDISP GO TO 3200-FIM END-IF
      *
           PERFORM UNTIL FS-PROP-EOF OR WS-DEVE-ABORTAR
              READ SGLPROP-FILE
                 AT END EXIT PERFORM
                 NOT AT END
                    IF PROP-E-DETAIL
                       ADD 1 TO WS-QT-PROP-LIDOS
                       PERFORM 3210-RELDT-PROP
                    END-IF
              END-READ
           END-PERFORM.
       3200-FIM. EXIT.
      *
       3210-RELDT-PROP SECTION.
           MOVE SPACES                 TO REG-SGLRELDT
           MOVE ' '                    TO RELDT-CTL
           MOVE 'DT'                   TO RELDT-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELDT-DATA-EDIT
           MOVE WS-HR-EDIT             TO RELDT-HORA-EDIT
           MOVE 'PROPOSTA RENEG      ' TO RELDT-EVENTO
           MOVE 'REN       '           TO RELDT-CD-EVENTO
           MOVE PROP-DET-ID-CONTRATO   TO RELDT-ID-CONTRATO
           MOVE PROP-DET-NR-CONTRATO   TO RELDT-NR-CONTRATO
           MOVE PROP-DET-DOCUMENTO     TO RELDT-DOCUMENTO
           MOVE SPACES                 TO RELDT-CANAL
           MOVE PROP-DET-VLR-BASE-REN  TO WS-VLR-EDIT-18
           MOVE WS-VLR-EDIT-18         TO RELDT-VALOR-EDIT
           MOVE PROP-DET-QT-PARC-NOVAS TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11 (1:9)    TO RELDT-QUANT-EDIT
           MOVE PROP-DET-STATUS        TO RELDT-STATUS
           WRITE REG-SGLRELDT
           IF FS-RELDT-OK
              ADD 1 TO WS-QT-RELDT-GRAV
           END-IF.
       3210-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * COPIA CONSOLIDADA DE ERROS DA JANELA                          *
      *---------------------------------------------------------------*
       3300-PROC-ERROS SECTION.
           IF FS-ERRIN-INDISP GO TO 3300-FIM END-IF
      *
           PERFORM UNTIL FS-ERRIN-EOF OR WS-DEVE-ABORTAR
              READ SGLERROS-IN-FILE INTO REG-ERR-IN
                 AT END EXIT PERFORM
                 NOT AT END
                    ADD 1 TO WS-QT-ERR-LIDOS
                    MOVE REG-ERR-IN     TO REG-ERR-OUT
                    WRITE REG-ERR-OUT
                    IF FS-ERROT-OK
                       ADD 1 TO WS-QT-ERR-GRAV
                    END-IF
              END-READ
           END-PERFORM.
       3300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3400-PROC-VARIAVEL SECTION.
      *---------------------------------------------------------------*
      * CONSOME ARQUIVO VB MULTI-LAYOUT (SGLVARAR). CADA REGISTRO    *
      * PODE TER TAMANHO E FORMATO DIFERENTES CONFORME SGVA-TIPO.    *
      *---------------------------------------------------------------*
           IF NOT WS-VARAR-DISPONIVEL
              GO TO 3400-FIM
           END-IF
      *
           PERFORM UNTIL FS-VARAR-EOF
              MOVE 150 TO WS-SGVA-TAMANHO
              READ SGLVARAR-FILE INTO REG-SGLVARAR
                 AT END
                    MOVE '10' TO WS-FS-VARAR
                 NOT AT END
                    ADD 1 TO WS-QT-VARAR-LIDOS
                    EVALUATE TRUE
                       WHEN SGVA-TIPO-CTR
                          ADD 1 TO WS-QT-RELDT-GRAV
                       WHEN SGVA-TIPO-PAG
                          ADD 1 TO WS-QT-INTCT-GRAV
                       WHEN SGVA-TIPO-EVT
                          ADD 1 TO WS-QT-ERR-GRAV
                       WHEN SGVA-TIPO-EXT
                          CONTINUE
                       WHEN OTHER
                          DISPLAY 'SGCB0190 TIPO VB IGNORADO='
                                  SGVA-TIPO
                    END-EVALUATE
              END-READ
           END-PERFORM
           DISPLAY 'SGCB0190 SGLVARAR LIDOS=' WS-QT-VARAR-LIDOS.
       3400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       5000-CONSULTAS-CONSOLIDADAS SECTION.
      *---------------------------------------------------------------*
           EXEC SQL
             SELECT COUNT(*)
               INTO :WS-DB2-QT-CTR-INAD
               FROM SIGEC.SG_CONTRATO
              WHERE CLASSIFICACAO_INAD IN ('L','M','G','C')
                AND SITUACAO_REG = 'A'
           END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF
      *
           EXEC SQL
             SELECT COALESCE(COUNT(*),0),
                    COALESCE(SUM(VR_PAGO),0)
               INTO :WS-DB2-QT-PAG-DIA,
                    :WS-DB2-SOMA-PAG-DIA
               FROM SIGEC.SG_PAGAMENTO
              WHERE DT_PAGAMENTO = CURRENT DATE
                AND SITUACAO_REG = 'A'
           END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF
      *
           EXEC SQL
             SELECT COALESCE(SUM(VR_SALDO),0)
               INTO :WS-DB2-SOMA-CART
               FROM SIGEC.SG_CONTRATO
              WHERE ST_CONTRATO IN ('AT','IN','CB')
                AND SITUACAO_REG = 'A'
           END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF
      *
      *    ACUMULA NO SINTETICO
           MOVE WS-DB2-QT-CTR-INAD     TO WS-RELST-ACUM-QT-CTR
           MOVE WS-DB2-QT-PAG-DIA      TO WS-RELST-ACUM-QT-PAG
           ADD  WS-DB2-SOMA-PAG-DIA    TO WS-RELST-ACUM-VL-PAGO
           ADD  WS-DB2-SOMA-CART       TO WS-RELST-ACUM-VL-CART.
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6000-EMITIR-SINTETICO SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLRELST
                                          REG-RELST-FD
           MOVE ' '                    TO RELST-CTL
           MOVE 'DT'                   TO RELST-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELST-DT-REF-EDIT
           MOVE 'CARTEIRA TOTAL      ' TO RELST-DIMENSAO
           MOVE 'TOTAL          '     TO RELST-CATEGORIA
           MOVE WS-RELST-ACUM-QT-CTR   TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11          TO RELST-QT-CONTRATOS-EDIT
           MOVE ZEROES                 TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11          TO RELST-QT-CLIENTES-EDIT
           MOVE WS-RELST-ACUM-QT-PAG   TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11          TO RELST-QT-PAGTOS-EDIT
           MOVE WS-RELST-ACUM-VL-CART  TO WS-VLR-EDIT-20
           MOVE WS-VLR-EDIT-20         TO RELST-VLR-CARTEIRA-EDIT
           MOVE WS-RELST-ACUM-VL-PAGO  TO WS-VLR-EDIT-20
           MOVE WS-VLR-EDIT-20         TO RELST-VLR-PAGO-EDIT
           MOVE WS-RELST-ACUM-VL-ENC   TO WS-VLR-EDIT-18
           MOVE WS-VLR-EDIT-18         TO RELST-VLR-ENC-EDIT
           MOVE REG-SGLRELST           TO REG-RELST-FD
           WRITE REG-RELST-FD
           IF FS-RELST-OK
              ADD 1 TO WS-QT-RELST-GRAV
           END-IF.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       7000-EMITIR-INTERFACES SECTION.
      *---------------------------------------------------------------*
      *    HOOK PARA PRE-EMITIR TRAILER VIA SGCB0200 (SIMULA CHAMADA
      *    DINAMICA DE TRAILER PARA AUDITORIA DO PIPELINE).
           INITIALIZE SGINTFMT
           MOVE 'CB'                   TO SG-IF-TIPO-INTERFACE
           MOVE 'T'                    TO SG-IF-TIPO-REGISTRO
           MOVE WS-DT-PROC             TO SG-IF-DT-REFERENCIA
           MOVE WS-SEQ-INTCB           TO SG-IF-SEQ-REGISTRO
           MOVE WS-QT-INTCB-GRAV       TO SG-IF-QTD-1
           MOVE WS-SOMA-DIVIDA         TO SG-IF-VLR-1
      *    ALTERNA PARA CONSTRUCAO DINAMICA POR STRING
           MOVE 'S'                    TO WS-FL-USA-BUILD
           PERFORM 7900-CALL-FMT
           MOVE 'N'                    TO WS-FL-USA-BUILD
      *
           INITIALIZE SGINTFMT
           MOVE 'CT'                   TO SG-IF-TIPO-INTERFACE
           MOVE 'T'                    TO SG-IF-TIPO-REGISTRO
           MOVE WS-DT-PROC             TO SG-IF-DT-REFERENCIA
           MOVE WS-SEQ-INTCT           TO SG-IF-SEQ-REGISTRO
           MOVE WS-QT-INTCT-GRAV       TO SG-IF-QTD-1
           MOVE WS-SOMA-DEBITO         TO SG-IF-VLR-1
           MOVE WS-SOMA-CREDITO        TO SG-IF-VLR-2
           PERFORM 7900-CALL-FMT.
       7000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * 7900-CALL-FMT                                                 *
      *   RESOLVE O NOME DO PROGRAMA DE FORMATACAO EM TEMPO DE        *
      *   EXECUCAO E EXECUTA A CHAMADA DINAMICA.                      *
      *   MODO (A): USA WS-PROG-FMT (VALOR 'SGCB0200').               *
      *   MODO (B): CONSTROI VIA STRING 'SGCB' + WS-SUF (default      *
      *            '0200') PARA COBRIR SWITCH DE VERSAO/AB TESTING.  *
      *   O RESULTADO E APENAS AUXILIAR: A GRAVACAO OFICIAL DOS       *
      *   REGISTROS DE INTERFACE USA OS LAYOUTS DE FD ACIMA.          *
      *---------------------------------------------------------------*
       7900-CALL-FMT SECTION.
           IF WS-USAR-BUILD
              MOVE SPACES              TO WS-PROG-BUILD
              STRING WS-PREF           DELIMITED BY SIZE
                     WS-SUF            DELIMITED BY SIZE
                INTO WS-PROG-BUILD
              END-STRING
              CALL WS-PROG-BUILD USING SGINTFMT
                 ON EXCEPTION
                    MOVE SG-CT-RC-ERR-TEC   TO WS-RC
                    STRING '12-CALL DIN. FALHOU: ' DELIMITED BY SIZE
                           WS-PROG-BUILD           DELIMITED BY SIZE
                      INTO SGC-MENSAGEM
              END-CALL
           ELSE
              CALL WS-PROG-FMT USING SGINTFMT
                 ON EXCEPTION
                    MOVE SG-CT-RC-ERR-TEC   TO WS-RC
                    STRING '12-CALL DIN. FALHOU: ' DELIMITED BY SIZE
                           WS-PROG-FMT             DELIMITED BY SIZE
                      INTO SGC-MENSAGEM
              END-CALL
           END-IF.
       7900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8000-GRAVAR-TRAILERS SECTION.
      *---------------------------------------------------------------*
      *    RELATORIO DETALHADO - TOTAL
           MOVE SPACES                 TO REG-SGLRELDT
           MOVE '-'                    TO RELDT-CTL
           MOVE 'TT'                   TO RELDT-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELDT-DATA-EDIT
           MOVE WS-HR-EDIT             TO RELDT-HORA-EDIT
           MOVE 'TOTAL RELATORIO     ' TO RELDT-EVENTO
           MOVE 'TOT       '           TO RELDT-CD-EVENTO
           MOVE WS-QT-RELDT-GRAV       TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11 (1:9)    TO RELDT-QUANT-EDIT
           WRITE REG-SGLRELDT
      *
      *    RELATORIO SINTETICO - TOTAL
           MOVE SPACES                 TO REG-SGLRELST
                                          REG-RELST-FD
           MOVE '-'                    TO RELST-CTL
           MOVE 'TT'                   TO RELST-TIPO-LINHA
           MOVE WS-DT-EDIT             TO RELST-DT-REF-EDIT
           MOVE 'TOTAL GERAL         ' TO RELST-DIMENSAO
           MOVE 'TOTAL          '     TO RELST-CATEGORIA
           MOVE WS-RELST-ACUM-QT-CTR   TO WS-QT-EDIT-11
           MOVE WS-QT-EDIT-11          TO RELST-QT-CONTRATOS-EDIT
           MOVE REG-SGLRELST           TO REG-RELST-FD
           WRITE REG-RELST-FD
      *
      *    INTERFACE COBRANCA - TRAILER
           MOVE SPACES                 TO REG-SGLINTCB
           MOVE 'T'                    TO INTCB-TRL-TIPO
           MOVE WS-QT-INTCB-GRAV       TO INTCB-TRL-QTD-REGS
           MOVE WS-QT-INTCB-GRAV       TO INTCB-TRL-QTD-CLIENTES
           MOVE WS-SOMA-DIVIDA         TO INTCB-TRL-SOMA-DIVIDA
           MOVE WS-QT-CRITICAS         TO INTCB-TRL-QT-CRITICA
           MOVE WS-DT-PROC             TO INTCB-TRL-DT-REF
           MOVE REG-SGLINTCB-TRL       TO REG-SGLINTCB
           WRITE REG-SGLINTCB
      *
      *    INTERFACE CONTABIL - TRAILER
           MOVE SPACES                 TO REG-SGLINTCT
           MOVE 'T'                    TO INTCT-TRL-TIPO
           MOVE WS-QT-INTCT-GRAV       TO INTCT-TRL-QTD-REGS
           MOVE WS-SOMA-DEBITO         TO INTCT-TRL-SOMA-DEBITO
           MOVE WS-SOMA-CREDITO        TO INTCT-TRL-SOMA-CREDITO
           MOVE WS-DT-PROC             TO INTCT-TRL-DT-REF
           MOVE REG-SGLINTCT-TRL       TO REG-SGLINTCT
           WRITE REG-SGLINTCT.
       8000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8700-ERRO-ABERTURA SECTION.
      *---------------------------------------------------------------*
           MOVE SG-CT-RC-ERR-TEC       TO WS-RC
           MOVE 'S'                    TO WS-FL-ABORT
           MOVE '12-FILE OPEN FALHOU EM SGCB0190'
                                        TO SGC-MENSAGEM.
       8700-FIM. EXIT.
      *
       8710-ERRO-WRITE SECTION.
           MOVE SG-CT-RC-ERR-TEC       TO WS-RC
           MOVE '12-FILE WRITE FALHOU EM SGCB0190'
                                        TO SGC-MENSAGEM.
       8710-FIM. EXIT.
      *
       8800-TRATAR-SQLCODE SECTION.
           MOVE SQLCODE                TO WS-SQLCODE-DISP
           MOVE SG-CT-RC-ERR-TEC       TO WS-RC
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0190'        DELIMITED BY SIZE
             INTO SGC-MENSAGEM.
       8800-FIM. EXIT.
      *
       8900-FECHAR-ARQUIVOS SECTION.
           CLOSE SGLENCAR-FILE
           CLOSE SGLINADI-FILE
           CLOSE SGLPROP-FILE
           CLOSE SGLERROS-IN-FILE
           IF WS-VARAR-DISPONIVEL
              CLOSE SGLVARAR-FILE
           END-IF
           CLOSE SGLRELDT-FILE
           CLOSE SGLRELST-FILE
           CLOSE SGLINTCB-FILE
           CLOSE SGLINTCT-FILE
           CLOSE SGLERROS-OUT-FILE.
       8900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
      *---------------------------------------------------------------*
           IF WS-QT-RELDT-GRAV = 0 AND WS-RC < 04
              MOVE SG-CT-RC-WARN       TO WS-RC
              MOVE MS-REL-VAZIO        TO SGC-MENSAGEM (1:20)
              MOVE 'NENHUM EVENTO GRAVADO NO RELATORIO'
                                       TO SGC-MENSAGEM (21:60)
           END-IF
           MOVE WS-QT-ENC-LIDOS        TO SGC-QT-REGS-LIDOS
           MOVE WS-QT-RELDT-GRAV       TO SGC-QT-REGS-GRAV
           MOVE WS-QT-ERR-LIDOS        TO SGC-QT-REGS-REJ
           MOVE WS-RC                  TO SGC-RETURN-CODE
           IF SGC-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0190 CONCLUIDO'
                                       TO SGC-MENSAGEM
           END-IF
           MOVE WS-RC                  TO RETURN-CODE.
       9000-FIM. EXIT.
