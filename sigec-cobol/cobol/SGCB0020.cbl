       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0020.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0020                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: VALIDACAO DO ARQUIVO DE CONTRATOS SGLCTRIN        *
      *                                                               *
      * ARQUIVOS .:                                                   *
      *   ENTRADA  - SGLCTRIN (DD CTRIN)  FB LRECL 200                *
      *   SAIDA    - SGLCTRVL (DD CTRVL)  FB LRECL 220 - APROVADOS    *
      *              SGLCTRRE (DD CTRRE)  FB LRECL 260 - REJEITADOS   *
      *              SGLESTAT (DD ESTAT)  FB LRECL 150 - APPEND       *
      *                                                               *
      * FLUXO .....:                                                  *
      *   1000 - INICIALIZAR                                          *
      *   2000 - ABRIR ARQUIVOS E LER HEADER                          *
      *   3000 - LOOP LEITURA DETAIL                                  *
      *          3100 - VALIDAR DETAIL                                *
      *          3200 - GRAVAR VALIDO / REJEITADO                     *
      *   4000 - LER E CONFERIR TRAILER                               *
      *   5000 - GRAVAR HEADER/TRAILER DE SAIDA E ESTATISTICAS        *
      *   6000 - FECHAR ARQUIVOS                                      *
      *   9000 - FINALIZAR                                            *
      *                                                               *
      * SUBROTINAS CHAMADAS:                                          *
      *   SGCB0170 USING SGDOCVAL   - validacao CPF/CNPJ/LE           *
      *   SGCB0180 USING SGDATAS    - validacao de data AAAAMMDD      *
      *                                                               *
      * REGRAS PRINCIPAIS (docs/REGRAS_NEGOCIO.md):                   *
      *   - VALOR-TOTAL > 0                                           *
      *   - QTD-PARCELAS ENTRE 001 E 360                              *
      *   - TAXA-JUROS  <= 15.00                                      *
      *   - PCT-MULTA   <= 10.00                                      *
      *   - TIPO-CLI    IN (PF, PJ, ES)                               *
      *   - TIPO-CTR    IN (CR, CD, FI, CO, EM)                       *
      *   - DOCUMENTO   VALIDO POR SGCB0170                           *
      *   - DATA-INICIO VALIDA POR SGCB0180                           *
      *   - VLR-TOTAL   >= QTD-PARCELAS (regra de coerencia minima)   *
      *                                                               *
      * CODIGOS DE RETORNO (docs/CODIGOS_RETORNO.md):                 *
      *   00 - 00-CTR-VAL-OK          arquivo aprovado sem incidentes *
      *   04 - 04-TRAILER-DIVERGE     trailer divergente ou ausente   *
      *   04 - 04-CTR-REJEIT-PARCIAL  parte dos DETAIL rejeitados     *
      *   08 - 08-HEADER-INVAL        header ausente/invalido/arq zero*
      *   08 - 08-DOC-INVALIDO        subrotina SGCB0170 devolveu 08  *
      *   08 - 08-VLR-INCONSIST       validacao de negocio falhou     *
      *   12 - 12-IO-CTRIN            file status <> 00 em I/O grave  *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLCTRIN-FILE
                  ASSIGN TO CTRIN
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-CTRIN-STATUS.
      *
           SELECT SGLCTRVL-FILE
                  ASSIGN TO CTRVL
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-CTRVL-STATUS.
      *
           SELECT SGLCTRRE-FILE
                  ASSIGN TO CTRRE
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-CTRRE-STATUS.
      *
           SELECT SGLESTAT-FILE
                  ASSIGN TO ESTAT
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-ESTAT-STATUS.
      *
       DATA DIVISION.
       FILE SECTION.
      *---------------------------------------------------------------*
       FD  SGLCTRIN-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLCTRIN.
      *
       FD  SGLCTRVL-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLCTRVL.
      *
       FD  SGLCTRRE-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLCTRRE.
      *
       FD  SGLESTAT-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLESTAT.
      *
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVOS                                            *
      *---------------------------------------------------------------*
       01  WS-STATUS.
           05  WS-CTRIN-STATUS       PIC X(02) VALUE '00'.
               88  WS-CTRIN-OK               VALUE '00'.
               88  WS-CTRIN-EOF              VALUE '10'.
           05  WS-CTRVL-STATUS       PIC X(02) VALUE '00'.
               88  WS-CTRVL-OK               VALUE '00'.
           05  WS-CTRRE-STATUS       PIC X(02) VALUE '00'.
               88  WS-CTRRE-OK               VALUE '00'.
           05  WS-ESTAT-STATUS       PIC X(02) VALUE '00'.
               88  WS-ESTAT-OK               VALUE '00'.
      *
      *---------------------------------------------------------------*
      * FLAGS DE CONTROLE                                             *
      *---------------------------------------------------------------*
       01  WS-FLAGS.
           05  WS-FL-EOF             PIC X(01) VALUE 'N'.
               88  WS-EOF-CTRIN              VALUE 'S'.
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
      *
      *---------------------------------------------------------------*
      * CONTADORES E ACUMULADORES                                     *
      *---------------------------------------------------------------*
       01  WS-CONTA.
           05  WS-QT-LIDOS           PIC 9(09) VALUE ZERO.
           05  WS-QT-VALIDOS         PIC 9(09) VALUE ZERO.
           05  WS-QT-REJEITADOS      PIC 9(09) VALUE ZERO.
           05  WS-SEQ-REJ            PIC 9(09) VALUE ZERO.
           05  WS-SOMA-LIDA          PIC 9(15)V99 VALUE ZERO.
           05  WS-SOMA-VALIDOS       PIC 9(15)V99 VALUE ZERO.
           05  WS-SOMA-REJEIT        PIC 9(15)V99 VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * DATA E HORA DE PROCESSAMENTO                                  *
      *---------------------------------------------------------------*
       01  WS-DTHR.
           05  WS-DATA-HOJE-N        PIC 9(08) VALUE ZERO.
           05  WS-HORA-HOJE-N        PIC 9(06) VALUE ZERO.
           05  WS-CURR-DATE          PIC X(21) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * CONTROLE DE REJEICAO (MOTIVO + CAMPO + VALOR)                 *
      *---------------------------------------------------------------*
       01  WS-REJ.
           05  WS-REJ-COD-MOTIVO     PIC X(20) VALUE SPACES.
           05  WS-REJ-MOTIVO         PIC X(40) VALUE SPACES.
           05  WS-REJ-CAMPO          PIC X(20) VALUE SPACES.
           05  WS-REJ-VALOR          PIC X(30) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * VARIAVEIS AUXILIARES                                          *
      *---------------------------------------------------------------*
       01  WS-AUX.
           05  WS-VLR-EDIT           PIC ZZZZZZZZZZZZZ9.99.
           05  WS-QTD-EDIT           PIC ZZZ9.
           05  WS-METRICA-30         PIC X(30) VALUE SPACES.
           05  WS-PROG               PIC X(08) VALUE 'SGCB0020'.
           05  WS-ID-EXEC            PIC X(12) VALUE 'SGCB0020    '.
      *
      *---------------------------------------------------------------*
      * COPYBOOKS DE APOIO                                            *
      *---------------------------------------------------------------*
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
      *---------------------------------------------------------------*
      * AREAS DE LINKAGE PARA CHAMADAS EXTERNAS                       *
      *---------------------------------------------------------------*
           COPY SGDOCVAL.
           COPY SGDATAS.
      *
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-ABRIR-E-LER-HEADER
      *
           IF SG-RC-ROMPE-FLUXO
              PERFORM 6000-FECHAR-ARQUIVOS
              PERFORM 5900-GRAVAR-ESTATISTICAS
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 3000-PROCESSAR-DETAIL
              UNTIL WS-EOF-CTRIN
      *
           PERFORM 4000-VALIDAR-TRAILER
           PERFORM 5000-GRAVAR-CABEC-SAIDA
           PERFORM 5900-GRAVAR-ESTATISTICAS
           PERFORM 6000-FECHAR-ARQUIVOS
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE 'N'                  TO WS-FL-EOF
           MOVE 'N'                  TO WS-FL-HEADER-OK
           MOVE 'N'                  TO WS-FL-TRAILER-OK
           MOVE 'S'                  TO WS-FL-ARQ-VAZIO
           MOVE ZERO                 TO WS-QT-LIDOS
                                        WS-QT-VALIDOS
                                        WS-QT-REJEITADOS
                                        WS-SEQ-REJ
                                        WS-SOMA-LIDA
                                        WS-SOMA-VALIDOS
                                        WS-SOMA-REJEIT
      *
           MOVE FUNCTION CURRENT-DATE TO WS-CURR-DATE
           MOVE WS-CURR-DATE(1:8)    TO WS-DATA-HOJE-N
           MOVE WS-CURR-DATE(9:6)    TO WS-HORA-HOJE-N
      *
           DISPLAY '======================================='
           DISPLAY 'SGCB0020 - VALIDACAO CONTRATOS SGLCTRIN'
           DISPLAY '  DT-PROC = ' WS-DATA-HOJE-N
                   '  HR-PROC = ' WS-HORA-HOJE-N
           DISPLAY '=======================================' .
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-E-LER-HEADER SECTION.
           OPEN INPUT  SGLCTRIN-FILE
           IF NOT WS-CTRIN-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              DISPLAY '12-IO-CTRIN OPEN INPUT STATUS='
                      WS-CTRIN-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLCTRVL-FILE
           IF NOT WS-CTRVL-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              DISPLAY '12-IO-CTRVL OPEN OUTPUT STATUS='
                      WS-CTRVL-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLCTRRE-FILE
           IF NOT WS-CTRRE-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              DISPLAY '12-IO-CTRRE OPEN OUTPUT STATUS='
                      WS-CTRRE-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN EXTEND SGLESTAT-FILE
           IF NOT WS-ESTAT-OK
              OPEN OUTPUT SGLESTAT-FILE
              IF NOT WS-ESTAT-OK
                 MOVE SG-CT-RC-ERR-TEC    TO WS-RC
                 DISPLAY '12-IO-ESTAT OPEN STATUS='
                         WS-ESTAT-STATUS
                 GO TO 2000-FIM
              END-IF
           END-IF
      *
      *---- LEITURA DO PRIMEIRO REGISTRO (ESPERA HEADER) -------------*
           READ SGLCTRIN-FILE
              AT END
                 MOVE 'S'                  TO WS-FL-EOF
                 MOVE SG-CT-RC-ERR-FUNC    TO WS-RC
                 MOVE MS-CTR-VAL-OK        TO WS-EMS-CHAVE
                 MOVE '08-HEADER-INVAL    ' TO WS-EMS-CHAVE
                 DISPLAY '08-HEADER-INVAL ARQUIVO CTRIN VAZIO'
              NOT AT END
                 MOVE 'N'                  TO WS-FL-ARQ-VAZIO
                 IF CTRIN-E-HEADER
                    MOVE 'S'               TO WS-FL-HEADER-OK
                    PERFORM 2100-LOG-HEADER
                 ELSE
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    DISPLAY '08-HEADER-INVAL PRIMEIRO REG NAO E H'
                    MOVE '08-HEADER-INVAL    ' TO WS-EMS-CHAVE
                 END-IF
           END-READ.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2100-LOG-HEADER SECTION.
           DISPLAY 'CTRIN HEADER: DT-GER='  CTRIN-HDR-DT-GERACAO
                   ' ORIGEM='               CTRIN-HDR-ORIGEM
                   ' QTD-DECL='             CTRIN-HDR-QTD-DECLARADA
                   ' VERSAO='               CTRIN-HDR-VERSAO-LAYOUT.
       2100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * LOOP PRINCIPAL DE PROCESSAMENTO DE DETAIL                     *
      *---------------------------------------------------------------*
       3000-PROCESSAR-DETAIL SECTION.
           READ SGLCTRIN-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 GO TO 3000-FIM
              NOT AT END
                 CONTINUE
           END-READ
      *
           EVALUATE TRUE
              WHEN CTRIN-E-DETAIL
                 ADD 1 TO WS-QT-LIDOS
                 ADD CTRIN-DET-VALOR-TOTAL TO WS-SOMA-LIDA
                 PERFORM 3100-VALIDAR-DETAIL
                 PERFORM 3200-GRAVAR-DETAIL
              WHEN CTRIN-E-TRAILER
                 MOVE 'S' TO WS-FL-TRAILER-OK
                 MOVE 'S' TO WS-FL-EOF
              WHEN CTRIN-E-HEADER
                 DISPLAY '04-HEADER-DUPLIC IGNORADO NA POSICAO '
                         WS-QT-LIDOS
                 IF SG-RC-OK
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
              WHEN OTHER
                 DISPLAY '08-TIPO-INVAL REG TIPO='
                         CTRIN-TIPO-REG
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
      *---- 1. NUMERO DE CONTRATO OBRIGATORIO ------------------------*
           IF WS-DET-OK
              IF CTRIN-DET-NR-CONTRATO = SPACES
                 OR CTRIN-DET-NR-CONTRATO = LOW-VALUES
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    '  TO WS-REJ-COD-MOTIVO
                 MOVE 'NR CONTRATO OBRIGATORIO'
                                              TO WS-REJ-MOTIVO
                 MOVE 'NR-CONTRATO'           TO WS-REJ-CAMPO
                 MOVE CTRIN-DET-NR-CONTRATO   TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 2. TIPO CLIENTE PF / PJ / ES ----------------------------*
           IF WS-DET-OK
              IF CTRIN-DET-TIPO-CLIENTE NOT = 'PF'
                 AND CTRIN-DET-TIPO-CLIENTE NOT = 'PJ'
                 AND CTRIN-DET-TIPO-CLIENTE NOT = 'ES'
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-TIPO-INVALIDO   '   TO WS-REJ-COD-MOTIVO
                 MOVE 'TIPO-CLIENTE FORA DO DOMINIO PF/PJ/ES'
                                              TO WS-REJ-MOTIVO
                 MOVE 'TIPO-CLIENTE'          TO WS-REJ-CAMPO
                 MOVE CTRIN-DET-TIPO-CLIENTE  TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 3. TIPO CONTRATO CR / CD / FI / CO / EM -----------------*
           IF WS-DET-OK
              EVALUATE CTRIN-DET-TIPO-CONTRATO
                 WHEN 'CR' CONTINUE
                 WHEN 'CD' CONTINUE
                 WHEN 'FI' CONTINUE
                 WHEN 'CO' CONTINUE
                 WHEN 'EM' CONTINUE
                 WHEN OTHER
                    MOVE 'N' TO WS-FL-DET-VALIDO
                    MOVE '08-TIPO-INVALIDO   '  TO WS-REJ-COD-MOTIVO
                    MOVE 'TIPO-CONTRATO FORA DE CR/CD/FI/CO/EM'
                                                TO WS-REJ-MOTIVO
                    MOVE 'TIPO-CONTRATO'        TO WS-REJ-CAMPO
                    MOVE CTRIN-DET-TIPO-CONTRATO TO WS-REJ-VALOR
              END-EVALUATE
           END-IF
      *
      *---- 4. VALOR TOTAL > 0 --------------------------------------*
           IF WS-DET-OK
              IF CTRIN-DET-VALOR-TOTAL = 0
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    '   TO WS-REJ-COD-MOTIVO
                 MOVE 'VALOR TOTAL DEVE SER MAIOR QUE ZERO'
                                               TO WS-REJ-MOTIVO
                 MOVE 'VALOR-TOTAL'            TO WS-REJ-CAMPO
                 MOVE CTRIN-DET-VALOR-TOTAL    TO WS-VLR-EDIT
                 MOVE WS-VLR-EDIT              TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 5. QTD PARCELAS 1..360 ----------------------------------*
           IF WS-DET-OK
              IF CTRIN-DET-QTD-PARCELAS < 1
                 OR CTRIN-DET-QTD-PARCELAS > 360
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    '   TO WS-REJ-COD-MOTIVO
                 MOVE 'QTD PARCELAS FORA DA FAIXA 001..360'
                                               TO WS-REJ-MOTIVO
                 MOVE 'QTD-PARCELAS'           TO WS-REJ-CAMPO
                 MOVE CTRIN-DET-QTD-PARCELAS   TO WS-QTD-EDIT
                 MOVE WS-QTD-EDIT              TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 6. COERENCIA VALOR X QTD PARCELAS -----------------------*
           IF WS-DET-OK
              IF CTRIN-DET-VALOR-TOTAL < CTRIN-DET-QTD-PARCELAS
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    '   TO WS-REJ-COD-MOTIVO
                 MOVE 'VLR-TOTAL MENOR QUE QTD-PARCELAS (INCONSIS)'
                                               TO WS-REJ-MOTIVO
                 MOVE 'VALOR-TOTAL'            TO WS-REJ-CAMPO
                 MOVE CTRIN-DET-VALOR-TOTAL    TO WS-VLR-EDIT
                 MOVE WS-VLR-EDIT              TO WS-REJ-VALOR
              END-IF
           END-IF
      *
      *---- 7. TAXA DE JUROS <= 15.00 -------------------------------*
           IF WS-DET-OK
              IF CTRIN-DET-TAXA-JUROS > 15.00
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    '   TO WS-REJ-COD-MOTIVO
                 MOVE 'TAXA JUROS ACIMA DE 15% AM'
                                               TO WS-REJ-MOTIVO
                 MOVE 'TAXA-JUROS'             TO WS-REJ-CAMPO
              END-IF
           END-IF
      *
      *---- 8. PCT DE MULTA <= 10.00 --------------------------------*
           IF WS-DET-OK
              IF CTRIN-DET-PCT-MULTA > 10.00
                 MOVE 'N' TO WS-FL-DET-VALIDO
                 MOVE '08-VLR-INCONSIST    '   TO WS-REJ-COD-MOTIVO
                 MOVE 'PCT MULTA ACIMA DE 10%'
                                               TO WS-REJ-MOTIVO
                 MOVE 'PCT-MULTA'              TO WS-REJ-CAMPO
              END-IF
           END-IF
      *
      *---- 9. DOCUMENTO VIA SGCB0170 -------------------------------*
           IF WS-DET-OK
              PERFORM 3110-CHAMAR-SGCB0170
           END-IF
      *
      *---- 10. DATA DE INICIO VIA SGCB0180 -------------------------*
           IF WS-DET-OK
              PERFORM 3120-CHAMAR-SGCB0180
           END-IF.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DE DOCUMENTO POR SUBROTINA (SGCB0170)               *
      *---------------------------------------------------------------*
       3110-CHAMAR-SGCB0170 SECTION.
           MOVE SPACES TO SG-DV-TIPO
                          SG-DV-DOCUMENTO
                          SG-DV-UF
                          SG-DV-MOTIVO
                          SG-DV-MENSAGEM
                          SG-DV-DOC-FORMATADO
           MOVE ZERO   TO SG-DV-COMPRIMENTO
                          SG-DV-RETURN-CODE
      *
      *---- MAPEAMENTO 3->4 CARACTERES DO TIPO ----------------------*
           EVALUATE CTRIN-DET-TIPO-DOC
              WHEN 'CPF' MOVE 'CPF ' TO SG-DV-TIPO
              WHEN 'CNP' MOVE 'CNPJ' TO SG-DV-TIPO
              WHEN 'CNJ' MOVE 'CNPJ' TO SG-DV-TIPO
              WHEN 'LE ' MOVE 'LE  ' TO SG-DV-TIPO
              WHEN 'LE'  MOVE 'LE  ' TO SG-DV-TIPO
              WHEN OTHER MOVE CTRIN-DET-TIPO-DOC TO SG-DV-TIPO(1:3)
           END-EVALUATE
      *
           MOVE CTRIN-DET-DOCUMENTO TO SG-DV-DOCUMENTO
           MOVE 'BR'                TO SG-DV-UF
           MOVE 'N'                 TO SG-DV-IND-PERMITE-VAZIO
      *
           CALL 'SGCB0170' USING SGDOCVAL
      *
           IF SG-DV-RETURN-CODE >= 08
              MOVE 'N' TO WS-FL-DET-VALIDO
              MOVE '08-DOC-INVALIDO    '   TO WS-REJ-COD-MOTIVO
              MOVE SG-DV-MENSAGEM(1:40)    TO WS-REJ-MOTIVO
              MOVE 'DOCUMENTO'              TO WS-REJ-CAMPO
              MOVE CTRIN-DET-DOCUMENTO      TO WS-REJ-VALOR(1:14)
           END-IF.
       3110-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DE DATA POR SUBROTINA (SGCB0180 FUNCAO 'VAL')       *
      *---------------------------------------------------------------*
       3120-CHAMAR-SGCB0180 SECTION.
           INITIALIZE SGDATAS
           MOVE 'VAL'                   TO SG-DT-FUNCAO
           MOVE CTRIN-DET-DATA-INICIO   TO SG-DT-ENTRADA-1
      *
           CALL 'SGCB0180' USING SGDATAS
      *
           IF SG-DT-RETURN-CODE >= 08
              MOVE 'N' TO WS-FL-DET-VALIDO
              MOVE '08-VLR-INCONSIST    '   TO WS-REJ-COD-MOTIVO
              MOVE 'DATA DE INICIO INVALIDA (VER SGCB0180)'
                                             TO WS-REJ-MOTIVO
              MOVE 'DATA-INICIO'             TO WS-REJ-CAMPO
              MOVE CTRIN-DET-DATA-INICIO     TO WS-REJ-VALOR(1:8)
           END-IF.
       3120-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GRAVACAO DE VALIDO OU REJEITADO                               *
      *---------------------------------------------------------------*
       3200-GRAVAR-DETAIL SECTION.
           IF WS-DET-OK
              PERFORM 3210-GRAVAR-VALIDO
           ELSE
              PERFORM 3220-GRAVAR-REJEITADO
      *      Eleva RC para 04 (parcial) quando houver rejeicao        *
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
           END-IF.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3210-GRAVAR-VALIDO SECTION.
           MOVE SPACES TO REG-SGLCTRVL-DET
           MOVE 'D'                            TO CTRVL-DET-TIPO
           MOVE CTRIN-DET-NR-CONTRATO          TO CTRVL-DET-NR-CONTRATO
           MOVE CTRIN-DET-TIPO-DOC             TO CTRVL-DET-TIPO-DOC
           MOVE CTRIN-DET-DOCUMENTO            TO CTRVL-DET-DOCUMENTO
           MOVE CTRIN-DET-NOME                 TO CTRVL-DET-NOME
           MOVE CTRIN-DET-TIPO-CLIENTE         TO CTRVL-DET-TIPO-CLIENTE
           MOVE CTRIN-DET-TIPO-CONTRATO
                                          TO CTRVL-DET-TIPO-CONTRATO
           MOVE CTRIN-DET-VALOR-TOTAL          TO CTRVL-DET-VALOR-TOTAL
           MOVE CTRIN-DET-QTD-PARCELAS         TO CTRVL-DET-QTD-PARCELAS
           MOVE CTRIN-DET-DATA-INICIO          TO CTRVL-DET-DATA-INICIO
           MOVE CTRIN-DET-TAXA-JUROS           TO CTRVL-DET-TAXA-JUROS
           MOVE CTRIN-DET-PCT-MULTA            TO CTRVL-DET-PCT-MULTA
           MOVE 'S'                            TO CTRVL-DET-FL-CLI-NOVO
           MOVE 'S'                            TO CTRVL-DET-FL-DOC-OK
           MOVE 'S'                            TO CTRVL-DET-FL-DT-OK
           MOVE 'S'                            TO CTRVL-DET-FL-TAXA-OK
           MOVE WS-DATA-HOJE-N                 TO CTRVL-DET-DT-APROVACAO
           MOVE WS-HORA-HOJE-N                 TO CTRVL-DET-HR-APROVACAO
           MOVE 'SGCB0020'                     TO CTRVL-DET-CD-VALIDADOR
      *
           WRITE REG-SGLCTRVL FROM REG-SGLCTRVL-DET
           IF NOT WS-CTRVL-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-CTRVL WRITE STATUS=' WS-CTRVL-STATUS
              GO TO 3210-FIM
           END-IF
      *
           ADD 1 TO WS-QT-VALIDOS
           ADD CTRIN-DET-VALOR-TOTAL TO WS-SOMA-VALIDOS.
       3210-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3220-GRAVAR-REJEITADO SECTION.
           ADD 1 TO WS-SEQ-REJ
           MOVE SPACES TO REG-SGLCTRRE-DET
           MOVE 'D'                            TO CTRRE-DET-TIPO
           MOVE WS-SEQ-REJ                     TO CTRRE-DET-SEQ
           MOVE CTRIN-DET-NR-CONTRATO          TO CTRRE-DET-NR-CONTRATO
           MOVE CTRIN-DET-TIPO-DOC             TO CTRRE-DET-TIPO-DOC
           MOVE CTRIN-DET-DOCUMENTO            TO CTRRE-DET-DOCUMENTO
           MOVE CTRIN-DET-NOME                 TO CTRRE-DET-NOME
           MOVE CTRIN-DET-TIPO-CLIENTE         TO CTRRE-DET-TIPO-CLIENTE
           MOVE CTRIN-DET-TIPO-CONTRATO
                                          TO CTRRE-DET-TIPO-CONTRATO
           MOVE CTRIN-DET-VALOR-TOTAL          TO CTRRE-DET-VALOR-TOTAL
           MOVE CTRIN-DET-QTD-PARCELAS         TO CTRRE-DET-QTD-PARCELAS
           MOVE CTRIN-DET-DATA-INICIO          TO CTRRE-DET-DATA-INICIO
           MOVE WS-REJ-COD-MOTIVO              TO CTRRE-DET-CD-MOTIVO
           MOVE WS-REJ-MOTIVO                  TO CTRRE-DET-MOTIVO
           MOVE WS-REJ-CAMPO                   TO CTRRE-DET-CAMPO-ORIG
           MOVE WS-REJ-VALOR                   TO CTRRE-DET-VALOR-ORIG
           MOVE WS-DATA-HOJE-N                 TO CTRRE-DET-DT-REJEICAO
      *
           WRITE REG-SGLCTRRE FROM REG-SGLCTRRE-DET
           IF NOT WS-CTRRE-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-CTRRE WRITE STATUS=' WS-CTRRE-STATUS
              GO TO 3220-FIM
           END-IF
      *
           ADD 1 TO WS-QT-REJEITADOS
           ADD CTRIN-DET-VALOR-TOTAL TO WS-SOMA-REJEIT.
       3220-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DO TRAILER                                          *
      *---------------------------------------------------------------*
       4000-VALIDAR-TRAILER SECTION.
           IF WS-ARQ-VAZIO
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              DISPLAY '08-HEADER-INVAL ARQUIVO SGLCTRIN VAZIO'
              GO TO 4000-FIM
           END-IF
      *
           IF NOT WS-TRL-OK
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
              DISPLAY '04-TRAILER-DIVERGE TRAILER AUSENTE NO CTRIN'
              GO TO 4000-FIM
           END-IF
      *
      *---- COMPARA QUANTIDADE E SOMA DECLARADAS X REAIS ------------*
           IF CTRIN-TRL-QTD-REGS NOT = WS-QT-LIDOS
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
              DISPLAY '04-TRAILER-DIVERGE QTD DECL=' CTRIN-TRL-QTD-REGS
                      ' REAL=' WS-QT-LIDOS
           END-IF
      *
           IF CTRIN-TRL-SOMA-VALORES NOT = WS-SOMA-LIDA
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
              DISPLAY '04-TRAILER-DIVERGE SOMA DECL='
                      CTRIN-TRL-SOMA-VALORES
                      ' REAL='
                      WS-SOMA-LIDA
           END-IF.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GRAVA HEADER + TRAILER DOS ARQUIVOS DE SAIDA                  *
      *---------------------------------------------------------------*
       5000-GRAVAR-CABEC-SAIDA SECTION.
      *---- HEADER SGLCTRVL -----------------------------------------*
           MOVE SPACES                  TO REG-SGLCTRVL-HDR
           MOVE 'H'                     TO CTRVL-HDR-TIPO
           MOVE WS-DATA-HOJE-N          TO CTRVL-HDR-DT-PROC
           MOVE WS-HORA-HOJE-N          TO CTRVL-HDR-HR-PROC
           MOVE 'SGCB0020'              TO CTRVL-HDR-PROG-ORIGEM
           MOVE WS-QT-VALIDOS           TO CTRVL-HDR-QTD-VALIDOS
           MOVE 'V001'                  TO CTRVL-HDR-VERSAO-LAYOUT
           WRITE REG-SGLCTRVL FROM REG-SGLCTRVL-HDR
      *
      *---- TRAILER SGLCTRVL ----------------------------------------*
           MOVE SPACES                  TO REG-SGLCTRVL-TRL
           MOVE 'T'                     TO CTRVL-TRL-TIPO
           MOVE WS-QT-VALIDOS           TO CTRVL-TRL-QTD-REGS
           MOVE WS-SOMA-VALIDOS         TO CTRVL-TRL-SOMA-VALORES
           MOVE WS-DATA-HOJE-N          TO CTRVL-TRL-DT-PROC
           WRITE REG-SGLCTRVL FROM REG-SGLCTRVL-TRL
      *
      *---- HEADER SGLCTRRE -----------------------------------------*
           MOVE SPACES                  TO REG-SGLCTRRE-HDR
           MOVE 'H'                     TO CTRRE-HDR-TIPO
           MOVE WS-DATA-HOJE-N          TO CTRRE-HDR-DT-PROC
           MOVE WS-HORA-HOJE-N          TO CTRRE-HDR-HR-PROC
           MOVE 'SGCB0020'              TO CTRRE-HDR-PROG-ORIGEM
           MOVE WS-QT-REJEITADOS        TO CTRRE-HDR-QTD-REJEIT
           WRITE REG-SGLCTRRE FROM REG-SGLCTRRE-HDR
      *
      *---- TRAILER SGLCTRRE ----------------------------------------*
           MOVE SPACES                  TO REG-SGLCTRRE-TRL
           MOVE 'T'                     TO CTRRE-TRL-TIPO
           MOVE WS-QT-REJEITADOS        TO CTRRE-TRL-QTD-REGS
           MOVE WS-SOMA-REJEIT          TO CTRRE-TRL-SOMA-REJEIT
           MOVE WS-DATA-HOJE-N          TO CTRRE-TRL-DT-PROC
           WRITE REG-SGLCTRRE FROM REG-SGLCTRRE-TRL.
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ESTATISTICAS EM SGLESTAT (APPEND)                             *
      *---------------------------------------------------------------*
       5900-GRAVAR-ESTATISTICAS SECTION.
      *    Grava as tres metricas principais em SGLESTAT.
           MOVE 'CTR-LIDOS                     ' TO WS-METRICA-30
           MOVE WS-QT-LIDOS                     TO ESTAT-VLR-INTEIRO
           PERFORM 5920-GRAVAR-ESTAT-LINE
      *
           MOVE 'CTR-VALIDOS                   ' TO WS-METRICA-30
           MOVE WS-QT-VALIDOS                   TO ESTAT-VLR-INTEIRO
           PERFORM 5920-GRAVAR-ESTAT-LINE
      *
           MOVE 'CTR-REJEITADOS                ' TO WS-METRICA-30
           MOVE WS-QT-REJEITADOS                TO ESTAT-VLR-INTEIRO
           PERFORM 5920-GRAVAR-ESTAT-LINE
      *
           DISPLAY '---------------------------------------'
           DISPLAY 'SGCB0020 SUMARIO'
           DISPLAY '  LIDOS      = ' WS-QT-LIDOS
           DISPLAY '  VALIDOS    = ' WS-QT-VALIDOS
           DISPLAY '  REJEITADOS = ' WS-QT-REJEITADOS
           DISPLAY '  RC FINAL   = ' WS-RC
           DISPLAY '---------------------------------------'.
       5900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       5920-GRAVAR-ESTAT-LINE SECTION.
           MOVE SPACES                    TO REG-SGLESTAT
           MOVE WS-DATA-HOJE-N            TO ESTAT-DT-REF
           MOVE WS-HORA-HOJE-N            TO ESTAT-HR-COLETA
           MOVE WS-ID-EXEC                TO ESTAT-ID-EXECUCAO
           MOVE WS-PROG                   TO ESTAT-PROG-ORIGEM
           MOVE WS-METRICA-30             TO ESTAT-CD-METRICA
           MOVE SPACES                    TO ESTAT-DIMENSAO
           MOVE 'VALIDACAO      '         TO ESTAT-CATEGORIA
           MOVE ZERO                      TO ESTAT-VLR-DECIMAL
           MOVE ZERO                      TO ESTAT-VLR-PCT
           MOVE 'QT   '                   TO ESTAT-UNIDADE
           WRITE REG-SGLESTAT
           IF NOT WS-ESTAT-OK
              DISPLAY '04-STEP-WARNING FALHA GRAVAR ESTAT ST='
                      WS-ESTAT-STATUS
           END-IF.
       5920-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6000-FECHAR-ARQUIVOS SECTION.
           CLOSE SGLCTRIN-FILE
           CLOSE SGLCTRVL-FILE
           CLOSE SGLCTRRE-FILE
           CLOSE SGLESTAT-FILE.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
      *---- REFINA RC FINAL BASEADO EM ESTADO ------------------------*
           IF WS-QT-REJEITADOS > 0 AND WS-RC < SG-CT-RC-WARN
              MOVE SG-CT-RC-WARN TO WS-RC
           END-IF
      *
           MOVE WS-RC TO RETURN-CODE
           DISPLAY 'SGCB0020 TERMINO RC=' WS-RC.
       9000-FIM. EXIT.
