       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0030.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0030                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: VALIDACAO DO ARQUIVO DE PAGAMENTOS SGLPAGIN       *
      *                                                               *
      * ARQUIVOS .:                                                   *
      *   ENTRADA  - SGLPAGIN (DD PAGIN)  FB LRECL 120                *
      *   SAIDA    - SGLPAGVL (DD PAGVL)  FB LRECL 150 - APROVADOS    *
      *              SGLPAGRE (DD PAGRE)  FB LRECL 200 - REJEITADOS   *
      *                                                               *
      * REGRAS DE VALIDACAO (docs/REGRAS_NEGOCIO.md):                 *
      *   - ID-CONTRATO      > 0                                      *
      *   - NR-PARCELA       ENTRE 001 E 360                          *
      *   - VALOR            > 0                                      *
      *   - DATA-PAGTO       AAAAMMDD VALIDO (SGCB0180)               *
      *   - DATA-PAGTO       NAO PODE SER FUTURA                      *
      *   - CANAL            IN (BOL, DEB, PIX, TED, DOC, CAR)        *
      *   - NR-DOC-PAGTO     OBRIGATORIO                              *
      *   - DUPLICATA        DETECTADA POR CHAVE COMPOSTA             *
      *                      CONTRATO + PARCELA + NR-DOC-PAGTO        *
      *                      USANDO TABELA INTERNA OCCURS 5000        *
      *                                                               *
      * FLUXO .....:                                                  *
      *   1000 - INICIALIZAR                                          *
      *   2000 - ABRIR E LER HEADER                                   *
      *   3000 - LOOP DETAIL                                          *
      *          3100 - VALIDAR                                       *
      *          3150 - PROCURAR DUPLICATA                            *
      *          3200 - GRAVAR VALIDO OU REJEITADO                    *
      *   4000 - VALIDAR TRAILER                                      *
      *   5000 - GRAVAR HEADER/TRAILER DE SAIDA                       *
      *   6000 - FECHAR ARQUIVOS                                      *
      *   9000 - FINALIZAR                                            *
      *                                                               *
      * SUBROTINAS: SGCB0180 USING SGDATAS (validacao de data).       *
      *                                                               *
      * CODIGOS DE RETORNO:                                           *
      *   00 - 00-PAG-VAL-OK                                          *
      *   04 - 04-TRAILER-DIVERGE / 04-PAG-DUP-IGN / rejeicao parcial *
      *   08 - 08-PAG-SEM-CTR / 08-DT-FUTURA / 08-CANAL-INVAL         *
      *   08 - 08-HEADER-INVAL (arquivo vazio ou sem header)          *
      *   12 - 12-IO-PAGIN (erro de I/O)                              *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLPAGIN-FILE
                  ASSIGN TO PAGIN
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-PAGIN-STATUS.
      *
           SELECT SGLPAGVL-FILE
                  ASSIGN TO PAGVL
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-PAGVL-STATUS.
      *
           SELECT SGLPAGRE-FILE
                  ASSIGN TO PAGRE
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-PAGRE-STATUS.
      *
       DATA DIVISION.
       FILE SECTION.
      *---------------------------------------------------------------*
       FD  SGLPAGIN-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPAGIN.
      *
       FD  SGLPAGVL-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPAGVL.
      *
       FD  SGLPAGRE-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPAGRE.
      *
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVOS                                            *
      *---------------------------------------------------------------*
       01  WS-STATUS.
           05  WS-PAGIN-STATUS       PIC X(02) VALUE '00'.
               88  WS-PAGIN-OK               VALUE '00'.
               88  WS-PAGIN-EOF              VALUE '10'.
           05  WS-PAGVL-STATUS       PIC X(02) VALUE '00'.
               88  WS-PAGVL-OK               VALUE '00'.
           05  WS-PAGRE-STATUS       PIC X(02) VALUE '00'.
               88  WS-PAGRE-OK               VALUE '00'.
      *
      *---------------------------------------------------------------*
      * FLAGS DE CONTROLE                                             *
      *---------------------------------------------------------------*
       01  WS-FLAGS.
           05  WS-FL-EOF             PIC X(01) VALUE 'N'.
               88  WS-EOF-PAGIN              VALUE 'S'.
           05  WS-FL-HEADER-OK       PIC X(01) VALUE 'N'.
               88  WS-HDR-OK                 VALUE 'S'.
           05  WS-FL-TRAILER-OK      PIC X(01) VALUE 'N'.
               88  WS-TRL-OK                 VALUE 'S'.
           05  WS-FL-DET-VALIDO      PIC X(01) VALUE 'S'.
               88  WS-DET-OK                 VALUE 'S'.
               88  WS-DET-NOK                VALUE 'N'.
           05  WS-FL-ARQ-VAZIO       PIC X(01) VALUE 'S'.
               88  WS-ARQ-VAZIO              VALUE 'S'.
               88  WS-ARQ-NAO-VAZIO          VALUE 'N'.
           05  WS-FL-DUPLICATA       PIC X(01) VALUE 'N'.
               88  WS-DUPLICADO              VALUE 'S'.
               88  WS-NAO-DUPLICADO          VALUE 'N'.
           05  WS-FL-TAB-CHEIA       PIC X(01) VALUE 'N'.
               88  WS-TAB-LOTADA             VALUE 'S'.
      *
      *---------------------------------------------------------------*
      * TABELA DE CHAVES JA VISTAS (DETECCAO DE DUPLICATAS)           *
      *---------------------------------------------------------------*
       01  WS-TAB-DUP.
           05  WS-TAB-QTD            PIC 9(05) VALUE ZERO.
           05  WS-TAB-LIMITE         PIC 9(05) VALUE 05000.
           05  WS-TAB-ITEM OCCURS 5000 TIMES.
               10  WS-TB-ID-CONTRATO PIC 9(12).
               10  WS-TB-NR-PARCELA  PIC 9(03).
               10  WS-TB-DOC-PAGTO   PIC X(20).
      *
      *---------------------------------------------------------------*
      * CONTADORES                                                    *
      *---------------------------------------------------------------*
       01  WS-CONTA.
           05  WS-QT-LIDOS           PIC 9(09) VALUE ZERO.
           05  WS-QT-VALIDOS         PIC 9(09) VALUE ZERO.
           05  WS-QT-REJEITADOS      PIC 9(09) VALUE ZERO.
           05  WS-QT-DUPL            PIC 9(09) VALUE ZERO.
           05  WS-SEQ-REJ            PIC 9(09) VALUE ZERO.
           05  WS-SOMA-LIDA          PIC 9(15)V99 VALUE ZERO.
           05  WS-SOMA-VALIDOS       PIC 9(15)V99 VALUE ZERO.
           05  WS-SOMA-REJEIT        PIC 9(15)V99 VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * DATA / HORA                                                   *
      *---------------------------------------------------------------*
       01  WS-DTHR.
           05  WS-CURR-DATE          PIC X(21) VALUE SPACES.
           05  WS-DATA-HOJE-N        PIC 9(08) VALUE ZERO.
           05  WS-HORA-HOJE-N        PIC 9(06) VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * MOTIVO DE REJEICAO                                            *
      *---------------------------------------------------------------*
       01  WS-REJ.
           05  WS-REJ-COD-MOTIVO     PIC X(20) VALUE SPACES.
           05  WS-REJ-MOTIVO         PIC X(40) VALUE SPACES.
           05  WS-REJ-CAMPO          PIC X(20) VALUE SPACES.
           05  WS-REJ-VALOR          PIC X(30) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * VARIAVEIS AUXILIARES E INDICES DE PESQUISA                    *
      *---------------------------------------------------------------*
       01  WS-AUX.
           05  WS-IDX                PIC 9(05) VALUE ZERO.
           05  WS-VLR-EDIT           PIC ZZZZZZZZZZZZZ9.99.
           05  WS-QTD-EDIT           PIC ZZZ9.
           05  WS-ID-EDIT            PIC Z(11)9.
      *
      *---------------------------------------------------------------*
       01  WS-CONST.
           05  WS-PROG               PIC X(08) VALUE 'SGCB0030'.
      *
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
      *---------------------------------------------------------------*
      * AREAS DE LINKAGE PARA CHAMADAS EXTERNAS                       *
      *---------------------------------------------------------------*
           COPY SGDATAS.
      *
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-ABRIR-E-LER-HEADER
           IF SG-RC-ROMPE-FLUXO
              PERFORM 6000-FECHAR-ARQUIVOS
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 3000-PROCESSAR-DETAIL
              UNTIL WS-EOF-PAGIN
      *
           PERFORM 4000-VALIDAR-TRAILER
           PERFORM 5000-GRAVAR-CABEC-SAIDA
           PERFORM 6000-FECHAR-ARQUIVOS
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE SG-CT-RC-OK           TO WS-RC
           MOVE 'N'                   TO WS-FL-EOF
           MOVE 'N'                   TO WS-FL-HEADER-OK
           MOVE 'N'                   TO WS-FL-TRAILER-OK
           MOVE 'S'                   TO WS-FL-ARQ-VAZIO
           MOVE 'N'                   TO WS-FL-TAB-CHEIA
           MOVE ZERO                  TO WS-TAB-QTD
                                         WS-QT-LIDOS
                                         WS-QT-VALIDOS
                                         WS-QT-REJEITADOS
                                         WS-QT-DUPL
                                         WS-SEQ-REJ
                                         WS-SOMA-LIDA
                                         WS-SOMA-VALIDOS
                                         WS-SOMA-REJEIT
      *
           MOVE FUNCTION CURRENT-DATE TO WS-CURR-DATE
           MOVE WS-CURR-DATE(1:8)     TO WS-DATA-HOJE-N
           MOVE WS-CURR-DATE(9:6)     TO WS-HORA-HOJE-N
      *
           DISPLAY '======================================='
           DISPLAY 'SGCB0030 - VALIDACAO PAGAMENTOS SGLPAGIN'
           DISPLAY '  DT-PROC = ' WS-DATA-HOJE-N
                   '  HR-PROC = ' WS-HORA-HOJE-N
           DISPLAY '======================================='.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-E-LER-HEADER SECTION.
           OPEN INPUT  SGLPAGIN-FILE
           IF NOT WS-PAGIN-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              DISPLAY '12-IO-PAGIN OPEN INPUT STATUS='
                      WS-PAGIN-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLPAGVL-FILE
           IF NOT WS-PAGVL-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              DISPLAY '12-IO-PAGVL OPEN OUTPUT STATUS='
                      WS-PAGVL-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLPAGRE-FILE
           IF NOT WS-PAGRE-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              DISPLAY '12-IO-PAGRE OPEN OUTPUT STATUS='
                      WS-PAGRE-STATUS
              GO TO 2000-FIM
           END-IF
      *
           READ SGLPAGIN-FILE
              AT END
                 MOVE 'S'                  TO WS-FL-EOF
                 MOVE SG-CT-RC-ERR-FUNC    TO WS-RC
                 DISPLAY '08-HEADER-INVAL ARQUIVO PAGIN VAZIO'
              NOT AT END
                 MOVE 'N'                  TO WS-FL-ARQ-VAZIO
                 IF PAGIN-E-HEADER
                    MOVE 'S'               TO WS-FL-HEADER-OK
                    DISPLAY 'PAGIN HEADER DT-GER='
                            PAGIN-HDR-DT-GERACAO
                            ' ORIGEM='
                            PAGIN-HDR-ORIGEM
                            ' QTD-DECL='
                            PAGIN-HDR-QTD-DECLARADA
                 ELSE
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    DISPLAY '08-HEADER-INVAL PRIMEIRO REG NAO E H'
                 END-IF
           END-READ.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * LOOP PRINCIPAL DE PROCESSAMENTO DE DETAIL                     *
      *---------------------------------------------------------------*
       3000-PROCESSAR-DETAIL SECTION.
           READ SGLPAGIN-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 GO TO 3000-FIM
              NOT AT END
                 CONTINUE
           END-READ
      *
           EVALUATE TRUE
              WHEN PAGIN-E-DETAIL
                 ADD 1                     TO WS-QT-LIDOS
                 ADD PAGIN-DET-VALOR       TO WS-SOMA-LIDA
                 PERFORM 3100-VALIDAR-DETAIL
                 IF WS-DET-OK
                    PERFORM 3150-VERIFICAR-DUPLICATA
                 END-IF
                 PERFORM 3200-GRAVAR-DETAIL
              WHEN PAGIN-E-TRAILER
                 MOVE 'S' TO WS-FL-TRAILER-OK
                 MOVE 'S' TO WS-FL-EOF
              WHEN PAGIN-E-HEADER
                 DISPLAY '04-HEADER-DUPLIC IGNORADO NA POSICAO '
                         WS-QT-LIDOS
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
              WHEN OTHER
                 DISPLAY '08-TIPO-INVAL REG TIPO='
                         PAGIN-TIPO-REG
                 IF WS-RC < SG-CT-RC-ERR-FUNC
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                 END-IF
           END-EVALUATE.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DO DETAIL                                           *
      *---------------------------------------------------------------*
       3100-VALIDAR-DETAIL SECTION.
           MOVE 'S'      TO WS-FL-DET-VALIDO
           MOVE SPACES   TO WS-REJ-COD-MOTIVO
                            WS-REJ-MOTIVO
                            WS-REJ-CAMPO
                            WS-REJ-VALOR
      *
      *---- 1. ID CONTRATO > 0 --------------------------------------*
           IF WS-DET-OK
              IF PAGIN-DET-ID-CONTRATO = 0
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-PAG-SEM-CTR     '  TO WS-REJ-COD-MOTIVO
                 MOVE 'ID CONTRATO INVALIDO (ZERO)'
                                             TO WS-REJ-MOTIVO
                 MOVE 'ID-CONTRATO'          TO WS-REJ-CAMPO
                 MOVE PAGIN-DET-ID-CONTRATO  TO WS-ID-EDIT
                 MOVE WS-ID-EDIT             TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 2. NR PARCELA 1..360 ------------------------------------*
           IF WS-DET-OK
              IF PAGIN-DET-NR-PARCELA < 1
                 OR PAGIN-DET-NR-PARCELA > 360
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-PAG-SEM-PAR     '  TO WS-REJ-COD-MOTIVO
                 MOVE 'NR PARCELA FORA DE 001..360'
                                             TO WS-REJ-MOTIVO
                 MOVE 'NR-PARCELA'           TO WS-REJ-CAMPO
                 MOVE PAGIN-DET-NR-PARCELA   TO WS-QTD-EDIT
                 MOVE WS-QTD-EDIT            TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 3. VALOR > 0 --------------------------------------------*
           IF WS-DET-OK
              IF PAGIN-DET-VALOR = 0
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    ' TO WS-REJ-COD-MOTIVO
                 MOVE 'VALOR DE PAGAMENTO DEVE SER > 0'
                                             TO WS-REJ-MOTIVO
                 MOVE 'VALOR'                TO WS-REJ-CAMPO
                 MOVE PAGIN-DET-VALOR        TO WS-VLR-EDIT
                 MOVE WS-VLR-EDIT            TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 4. CANAL DE PAGAMENTO -----------------------------------*
           IF WS-DET-OK
              EVALUATE PAGIN-DET-CANAL
                 WHEN 'BOL' CONTINUE
                 WHEN 'DEB' CONTINUE
                 WHEN 'PIX' CONTINUE
                 WHEN 'TED' CONTINUE
                 WHEN 'DOC' CONTINUE
                 WHEN 'CAR' CONTINUE
                 WHEN OTHER
                    MOVE 'N' TO WS-FL-DET-VALIDO
                    MOVE '08-CANAL-INVAL     '  TO WS-REJ-COD-MOTIVO
                    MOVE 'CANAL FORA DE BOL/DEB/PIX/TED/DOC/CAR'
                                                TO WS-REJ-MOTIVO
                    MOVE 'CANAL'                TO WS-REJ-CAMPO
                    MOVE PAGIN-DET-CANAL        TO WS-REJ-VALOR(1:3)
              END-EVALUATE
           END-IF
      *
      *---- 5. NR DOC PAGTO OBRIGATORIO -----------------------------*
           IF WS-DET-OK
              IF PAGIN-DET-NR-DOC-PAGTO = SPACES
                 OR PAGIN-DET-NR-DOC-PAGTO = LOW-VALUES
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    ' TO WS-REJ-COD-MOTIVO
                 MOVE 'NR DOC PAGAMENTO OBRIGATORIO'
                                             TO WS-REJ-MOTIVO
                 MOVE 'NR-DOC-PAGTO'         TO WS-REJ-CAMPO
              END-IF
           END-IF
      *
      *---- 6. DATA DE PAGAMENTO VALIDA E NAO FUTURA ----------------*
           IF WS-DET-OK
              PERFORM 3130-CHAMAR-SGCB0180-VAL
           END-IF
      *
           IF WS-DET-OK
              IF PAGIN-DET-DATA-PAGTO > WS-DATA-HOJE-N
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-DT-FUTURA        ' TO WS-REJ-COD-MOTIVO
                 MOVE 'DATA DE PAGAMENTO E FUTURA'
                                             TO WS-REJ-MOTIVO
                 MOVE 'DATA-PAGTO'           TO WS-REJ-CAMPO
                 MOVE PAGIN-DET-DATA-PAGTO   TO WS-REJ-VALOR(1:8)
              END-IF
           END-IF.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DE DATA (SGCB0180)                                  *
      *---------------------------------------------------------------*
       3130-CHAMAR-SGCB0180-VAL SECTION.
           INITIALIZE SGDATAS
           MOVE 'VAL'                   TO SG-DT-FUNCAO
           MOVE PAGIN-DET-DATA-PAGTO    TO SG-DT-ENTRADA-1
           CALL 'SGCB0180' USING SGDATAS
      *
           IF SG-DT-RETURN-CODE >= 08
              MOVE 'N' TO WS-FL-DET-VALIDO
              MOVE '08-VLR-INCONSIST    ' TO WS-REJ-COD-MOTIVO
              MOVE 'DATA DE PAGAMENTO INVALIDA (SGCB0180)'
                                          TO WS-REJ-MOTIVO
              MOVE 'DATA-PAGTO'           TO WS-REJ-CAMPO
              MOVE PAGIN-DET-DATA-PAGTO   TO WS-REJ-VALOR(1:8)
           END-IF.
       3130-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DETECCAO DE DUPLICATA VIA TABELA INTERNA                      *
      *---------------------------------------------------------------*
       3150-VERIFICAR-DUPLICATA SECTION.
           MOVE 'N' TO WS-FL-DUPLICATA
      *
           IF WS-TAB-QTD > 0
              PERFORM VARYING WS-IDX FROM 1 BY 1
                        UNTIL WS-IDX > WS-TAB-QTD
                           OR WS-DUPLICADO
                 IF  WS-TB-ID-CONTRATO(WS-IDX)
                        = PAGIN-DET-ID-CONTRATO
                     AND WS-TB-NR-PARCELA(WS-IDX)
                            = PAGIN-DET-NR-PARCELA
                     AND WS-TB-DOC-PAGTO(WS-IDX)
                            = PAGIN-DET-NR-DOC-PAGTO
                    MOVE 'S' TO WS-FL-DUPLICATA
                 END-IF
              END-PERFORM
           END-IF
      *
           IF WS-DUPLICADO
              MOVE 'N' TO WS-FL-DET-VALIDO
              MOVE '04-PAG-DUP-IGNOR    ' TO WS-REJ-COD-MOTIVO
              MOVE 'PAGAMENTO DUPLICADO NO PROPRIO ARQUIVO'
                                          TO WS-REJ-MOTIVO
              MOVE 'CONTRATO+PARC+DOCPGTO' TO WS-REJ-CAMPO
              MOVE PAGIN-DET-NR-DOC-PAGTO  TO WS-REJ-VALOR(1:20)
              ADD 1 TO WS-QT-DUPL
           ELSE
              PERFORM 3160-INSERIR-CHAVE-TABELA
           END-IF.
       3150-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * INSERE CHAVE NA TABELA DE DUPLICATAS (SE HOUVER ESPACO)       *
      *---------------------------------------------------------------*
       3160-INSERIR-CHAVE-TABELA SECTION.
           IF WS-TAB-QTD < WS-TAB-LIMITE
              ADD 1                       TO WS-TAB-QTD
              MOVE PAGIN-DET-ID-CONTRATO
                                      TO WS-TB-ID-CONTRATO(WS-TAB-QTD)
              MOVE PAGIN-DET-NR-PARCELA
                                      TO WS-TB-NR-PARCELA(WS-TAB-QTD)
              MOVE PAGIN-DET-NR-DOC-PAGTO
                                      TO WS-TB-DOC-PAGTO(WS-TAB-QTD)
           ELSE
              IF NOT WS-TAB-LOTADA
                 MOVE 'S' TO WS-FL-TAB-CHEIA
                 DISPLAY '04-TABELA-DUP-CHEIA A PARTIR DAQUI NAO'
                         ' HAVERA MAIS DETECCAO DE DUPLICATA'
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
              END-IF
           END-IF.
       3160-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GRAVACAO DE VALIDO OU REJEITADO                               *
      *---------------------------------------------------------------*
       3200-GRAVAR-DETAIL SECTION.
           IF WS-DET-OK
              PERFORM 3210-GRAVAR-VALIDO
           ELSE
              PERFORM 3220-GRAVAR-REJEITADO
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
           END-IF.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3210-GRAVAR-VALIDO SECTION.
           MOVE SPACES TO REG-SGLPAGVL-DET
           MOVE 'D'                          TO PAGVL-DET-TIPO
           MOVE PAGIN-DET-ID-CONTRATO        TO PAGVL-DET-ID-CONTRATO
           MOVE PAGIN-DET-NR-PARCELA         TO PAGVL-DET-NR-PARCELA
           MOVE PAGIN-DET-VALOR              TO PAGVL-DET-VALOR
           MOVE PAGIN-DET-DATA-PAGTO         TO PAGVL-DET-DATA-PAGTO
           MOVE PAGIN-DET-CANAL              TO PAGVL-DET-CANAL
           MOVE PAGIN-DET-NR-DOC-PAGTO       TO PAGVL-DET-NR-DOC-PAGTO
           MOVE ZEROS                        TO PAGVL-DET-SALDO-ANT
                                                PAGVL-DET-SALDO-NOVO
                                                PAGVL-DET-VLR-EXCESSO
           MOVE 'N'                          TO PAGVL-DET-FL-PARCIAL
           MOVE 'N'                          TO PAGVL-DET-FL-EXCESSO
           MOVE WS-DATA-HOJE-N               TO PAGVL-DET-DT-APROVACAO
           MOVE 'SGCB0030'                   TO PAGVL-DET-CD-VALIDADOR
      *
           WRITE REG-SGLPAGVL FROM REG-SGLPAGVL-DET
           IF NOT WS-PAGVL-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-PAGVL WRITE STATUS=' WS-PAGVL-STATUS
              GO TO 3210-FIM
           END-IF
      *
           ADD 1 TO WS-QT-VALIDOS
           ADD PAGIN-DET-VALOR TO WS-SOMA-VALIDOS.
       3210-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3220-GRAVAR-REJEITADO SECTION.
           ADD 1 TO WS-SEQ-REJ
           MOVE SPACES TO REG-SGLPAGRE-DET
           MOVE 'D'                          TO PAGRE-DET-TIPO
           MOVE WS-SEQ-REJ                   TO PAGRE-DET-SEQ
           MOVE PAGIN-DET-ID-CONTRATO        TO PAGRE-DET-ID-CONTRATO
           MOVE PAGIN-DET-NR-PARCELA         TO PAGRE-DET-NR-PARCELA
           MOVE PAGIN-DET-VALOR              TO PAGRE-DET-VALOR
           MOVE PAGIN-DET-DATA-PAGTO         TO PAGRE-DET-DATA-PAGTO
           MOVE PAGIN-DET-CANAL              TO PAGRE-DET-CANAL
           MOVE PAGIN-DET-NR-DOC-PAGTO       TO PAGRE-DET-NR-DOC-PAGTO
           MOVE WS-REJ-COD-MOTIVO            TO PAGRE-DET-CD-MOTIVO
           MOVE WS-REJ-MOTIVO                TO PAGRE-DET-MOTIVO
           MOVE WS-REJ-CAMPO                 TO PAGRE-DET-CAMPO-ORIG
           MOVE WS-REJ-VALOR                 TO PAGRE-DET-VALOR-ORIG
           MOVE WS-DATA-HOJE-N               TO PAGRE-DET-DT-REJEICAO
      *
           WRITE REG-SGLPAGRE FROM REG-SGLPAGRE-DET
           IF NOT WS-PAGRE-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-PAGRE WRITE STATUS=' WS-PAGRE-STATUS
              GO TO 3220-FIM
           END-IF
      *
           ADD 1 TO WS-QT-REJEITADOS
           ADD PAGIN-DET-VALOR TO WS-SOMA-REJEIT.
       3220-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DO TRAILER                                          *
      *---------------------------------------------------------------*
       4000-VALIDAR-TRAILER SECTION.
           IF WS-ARQ-VAZIO
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              DISPLAY '08-HEADER-INVAL ARQUIVO SGLPAGIN VAZIO'
              GO TO 4000-FIM
           END-IF
      *
           IF NOT WS-TRL-OK
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
              DISPLAY '04-TRAILER-DIVERGE TRAILER AUSENTE NO PAGIN'
              GO TO 4000-FIM
           END-IF
      *
           IF PAGIN-TRL-QTD-REGS NOT = WS-QT-LIDOS
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
              DISPLAY '04-TRAILER-DIVERGE QTD DECL='
                      PAGIN-TRL-QTD-REGS
                      ' REAL='
                      WS-QT-LIDOS
           END-IF
      *
           IF PAGIN-TRL-SOMA-VALORES NOT = WS-SOMA-LIDA
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
              DISPLAY '04-TRAILER-DIVERGE SOMA DECL='
                      PAGIN-TRL-SOMA-VALORES
                      ' REAL='
                      WS-SOMA-LIDA
           END-IF.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GRAVA HEADER + TRAILER DOS ARQUIVOS DE SAIDA                  *
      *---------------------------------------------------------------*
       5000-GRAVAR-CABEC-SAIDA SECTION.
      *---- HEADER SGLPAGVL -----------------------------------------*
           MOVE SPACES                  TO REG-SGLPAGVL-HDR
           MOVE 'H'                     TO PAGVL-HDR-TIPO
           MOVE WS-DATA-HOJE-N          TO PAGVL-HDR-DT-PROC
           MOVE 'SGCB0030'              TO PAGVL-HDR-PROG-ORIGEM
           MOVE WS-QT-VALIDOS           TO PAGVL-HDR-QTD-VALIDOS
           MOVE WS-SOMA-VALIDOS         TO PAGVL-HDR-SOMA-VALIDOS
           WRITE REG-SGLPAGVL FROM REG-SGLPAGVL-HDR
      *
      *---- TRAILER SGLPAGVL ----------------------------------------*
           MOVE SPACES                  TO REG-SGLPAGVL-TRL
           MOVE 'T'                     TO PAGVL-TRL-TIPO
           MOVE WS-QT-VALIDOS           TO PAGVL-TRL-QTD-REGS
           MOVE WS-SOMA-VALIDOS         TO PAGVL-TRL-SOMA-VALORES
           MOVE WS-DATA-HOJE-N          TO PAGVL-TRL-DT-PROC
           WRITE REG-SGLPAGVL FROM REG-SGLPAGVL-TRL
      *
      *---- HEADER SGLPAGRE -----------------------------------------*
           MOVE SPACES                  TO REG-SGLPAGRE-HDR
           MOVE 'H'                     TO PAGRE-HDR-TIPO
           MOVE WS-DATA-HOJE-N          TO PAGRE-HDR-DT-PROC
           MOVE 'SGCB0030'              TO PAGRE-HDR-PROG-ORIGEM
           MOVE WS-QT-REJEITADOS        TO PAGRE-HDR-QTD-REJEIT
           WRITE REG-SGLPAGRE FROM REG-SGLPAGRE-HDR
      *
      *---- TRAILER SGLPAGRE ----------------------------------------*
           MOVE SPACES                  TO REG-SGLPAGRE-TRL
           MOVE 'T'                     TO PAGRE-TRL-TIPO
           MOVE WS-QT-REJEITADOS        TO PAGRE-TRL-QTD-REGS
           MOVE WS-SOMA-REJEIT          TO PAGRE-TRL-SOMA-REJEIT
           MOVE WS-DATA-HOJE-N          TO PAGRE-TRL-DT-PROC
           WRITE REG-SGLPAGRE FROM REG-SGLPAGRE-TRL.
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6000-FECHAR-ARQUIVOS SECTION.
           CLOSE SGLPAGIN-FILE
           CLOSE SGLPAGVL-FILE
           CLOSE SGLPAGRE-FILE.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF WS-QT-REJEITADOS > 0 AND WS-RC < SG-CT-RC-WARN
              MOVE SG-CT-RC-WARN TO WS-RC
           END-IF
      *
           DISPLAY '---------------------------------------'
           DISPLAY 'SGCB0030 SUMARIO'
           DISPLAY '  LIDOS      = ' WS-QT-LIDOS
           DISPLAY '  VALIDOS    = ' WS-QT-VALIDOS
           DISPLAY '  REJEITADOS = ' WS-QT-REJEITADOS
           DISPLAY '  DUPLICATAS = ' WS-QT-DUPL
           DISPLAY '  RC FINAL   = ' WS-RC
           DISPLAY '---------------------------------------'
      *
           MOVE WS-RC TO RETURN-CODE.
       9000-FIM. EXIT.
