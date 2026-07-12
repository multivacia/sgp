       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0090.
       AUTHOR.        LAB-SIGEC.
      *****************************************************************
      * PROGRAMA .: SGCB0090                                          *
      * FUNCAO   .: CONSULTA DE PARCELA POR (ID_CONTRATO, NR_PARCELA) *
      * TABELA   .: SIGEC.SG_PARCELA (SELECT)                         *
      *----------------------------------------------------------------*
      * ENTRADA  .: LK-PAR-AREA (ID CONTRATO, NR PARCELA)             *
      * SAIDA    .: SGPARDAT preenchido, LK-IND-EXISTE, LK-RC         *
      *----------------------------------------------------------------*
      * SITUACAO NO BANCO (CHAR 2) -> SGPARDAT (CHAR 10)              *
      *   AB -> 'ABERTA    '                                          *
      *   PP -> 'PARCIAL   '                                          *
      *   PG -> 'LIQUIDADA '                                          *
      *   VC -> 'ABERTA    '  (VENCIDA E TRATADA COMO EM ANDAMENTO)   *
      *   CN -> 'CANCELADA '                                          *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLSGPAR END-EXEC.
       COPY SGRETCOD.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0090'.
           05  WS-SQLCODE-DISP           PIC -9(9).
      *
       LINKAGE SECTION.
       01  LK-PAR-AREA.
           05  LK-ID-CONTRATO            PIC X(15).
           05  LK-NR-PARCELA             PIC 9(03).
           05  LK-IND-EXISTE             PIC X(01).
               88  LK-EXISTE                     VALUE 'S'.
               88  LK-NAO-EXISTE                 VALUE 'N'.
           05  LK-RETURN-CODE            PIC 9(02).
           05  LK-MENSAGEM               PIC X(80).
      *
       COPY SGPARDAT.
       COPY SGCOMMAR.
      *
       PROCEDURE DIVISION USING LK-PAR-AREA
                                SGPARDAT
                                SGCOMMAR.
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-RC-OK
              PERFORM 3000-SELECIONAR-PARCELA
           END-IF
           PERFORM 9000-FINALIZAR
           GOBACK.
      *
       1000-INICIALIZAR.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE 'N'                  TO LK-IND-EXISTE
           MOVE SPACES               TO LK-MENSAGEM
           INITIALIZE SGPARDAT
           MOVE WS-PROG              TO SGC-PROG-CHAMADO.
      *
       2000-VALIDAR-ENTRADA.
           IF LK-ID-CONTRATO = SPACES OR LOW-VALUES
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              MOVE 'ID CONTRATO OBRIGATORIO'
                                     TO LK-MENSAGEM
           ELSE IF LK-NR-PARCELA = ZEROES
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              MOVE 'NR PARCELA OBRIGATORIO'
                                     TO LK-MENSAGEM
           END-IF.
      *
       3000-SELECIONAR-PARCELA.
           MOVE LENGTH OF LK-ID-CONTRATO
                                     TO SGPAR-ID-CTR-LEN
           MOVE LK-ID-CONTRATO       TO SGPAR-ID-CTR-TXT
           MOVE LK-NR-PARCELA        TO SGPAR-NR-PARCELA
      *
           EXEC SQL
             SELECT ID_CONTRATO,
                    NR_PARCELA,
                    CHAR(DT_VENCIMENTO, ISO),
                    VR_PARCELA,
                    VR_SALDO,
                    VR_JUROS,
                    VR_MULTA,
                    ST_PARCELA,
                    CHAR(DT_ULTIMO_PAGTO, ISO),
                    DIAS_ATRASO,
                    SITUACAO_REG
               INTO :SGPAR-ID-CONTRATO,
                    :SGPAR-NR-PARCELA,
                    :SGPAR-DT-VENCIMENTO,
                    :SGPAR-VR-PARCELA,
                    :SGPAR-VR-SALDO,
                    :SGPAR-VR-JUROS,
                    :SGPAR-VR-MULTA,
                    :SGPAR-ST-PARCELA,
                    :SGPAR-DT-ULTIMO-PAGTO
                       :SGPAR-IND-DT-ULT-PAGTO,
                    :SGPAR-DIAS-ATRASO,
                    :SGPAR-SITUACAO-REG
               FROM SIGEC.SG_PARCELA
              WHERE ID_CONTRATO = :SGPAR-ID-CONTRATO
                AND NR_PARCELA  = :SGPAR-NR-PARCELA
              FETCH FIRST 1 ROWS ONLY
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    MOVE 'S'                  TO LK-IND-EXISTE
                    PERFORM 4000-MAPEAR-RETORNO
               WHEN SQLCODE = +100
                    MOVE 'N'                  TO LK-IND-EXISTE
                    MOVE SG-CT-RC-ERR-FUNC    TO WS-RC
                    MOVE 'PARCELA NAO ENCONTRADA'
                                              TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE.
      *
       4000-MAPEAR-RETORNO.
           MOVE SGPAR-ID-CTR-TXT      TO SG-PAR-CTR-ID (1:15)
           MOVE SGPAR-NR-PARCELA      TO SG-PAR-NUMERO
      *    DT_VENCIMENTO CHAR(10) 'YYYY-MM-DD' -> AAAAMMDD PIC 9(08)  *
           PERFORM 4100-DATA-CHAR-P-NUM
             THRU 4100-DATA-CHAR-P-NUM-EXIT
      *
           MOVE SGPAR-VR-PARCELA      TO SG-PAR-VLR-ORIGINAL
           COMPUTE SG-PAR-VLR-PAGO =
                   SGPAR-VR-PARCELA - SGPAR-VR-SALDO
           MOVE SGPAR-VR-SALDO        TO SG-PAR-VLR-SALDO
           MOVE SGPAR-VR-JUROS        TO SG-PAR-VLR-JUROS
           MOVE SGPAR-VR-MULTA        TO SG-PAR-VLR-MULTA
           MOVE SGPAR-DIAS-ATRASO     TO SG-PAR-DIAS-ATRASO
      *
      *    MAPEIA STATUS ABREVIADO PARA A DESCRICAO CANONICA          *
           EVALUATE SGPAR-ST-PARCELA
               WHEN 'AB' MOVE 'ABERTA    '  TO SG-PAR-SITUACAO
               WHEN 'PP' MOVE 'PARCIAL   '  TO SG-PAR-SITUACAO
                          MOVE 'S'          TO SG-PAR-IND-PARCIAL
               WHEN 'PG' MOVE 'LIQUIDADA '  TO SG-PAR-SITUACAO
               WHEN 'VC' MOVE 'ABERTA    '  TO SG-PAR-SITUACAO
               WHEN 'CN' MOVE 'CANCELADA '  TO SG-PAR-SITUACAO
               WHEN OTHER
                          MOVE 'ABERTA    ' TO SG-PAR-SITUACAO
           END-EVALUATE
      *
      *    DATA DO ULTIMO PAGAMENTO (PODE VIR NULL)                   *
           IF SGPAR-IND-DT-ULT-PAGTO = 0
              MOVE SGPAR-DT-ULTIMO-PAGTO (1:4)
                                       TO SG-PAR-DT-ULT-PAG (1:4)
              MOVE SGPAR-DT-ULTIMO-PAGTO (6:2)
                                       TO SG-PAR-DT-ULT-PAG (5:2)
              MOVE SGPAR-DT-ULTIMO-PAGTO (9:2)
                                       TO SG-PAR-DT-ULT-PAG (7:2)
           ELSE
              MOVE ZEROES              TO SG-PAR-DT-ULT-PAG
           END-IF.
      *
       4100-DATA-CHAR-P-NUM.
      *    Converte 'YYYY-MM-DD' -> 99999999 para DT_VENCIMENTO       *
           MOVE SGPAR-DT-VENCIMENTO (1:4)
                                       TO SG-PAR-DT-VCTO (1:4)
           MOVE SGPAR-DT-VENCIMENTO (6:2)
                                       TO SG-PAR-DT-VCTO (5:2)
           MOVE SGPAR-DT-VENCIMENTO (9:2)
                                       TO SG-PAR-DT-VCTO (7:2)
           MOVE SG-PAR-DT-VCTO         TO SG-PAR-DT-VCTO-ORIG.
       4100-DATA-CHAR-P-NUM-EXIT.
           EXIT.
      *
       8000-TRATAR-ERRO-DB2.
           MOVE SG-CT-RC-ERR-TEC     TO WS-RC
           MOVE SQLCODE              TO WS-SQLCODE-DISP
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0090'        DELIMITED BY SIZE
             INTO LK-MENSAGEM.
      *
       9000-FINALIZAR.
           MOVE WS-RC                TO LK-RETURN-CODE
           MOVE WS-RC                TO SGC-RETURN-CODE
           MOVE LK-MENSAGEM          TO SGC-MENSAGEM
           MOVE WS-RC                TO RETURN-CODE.
