      *****************************************************************
      * COPYBOOK.: SGCLIDAT                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: DADOS DO CLIENTE (VISAO CANONICA)                   *
      * USO .....: WORKING DE PROGRAMAS DE VALIDACAO E CARGA           *
      *----------------------------------------------------------------*
      * ESPELHA A ESTRUTURA DE SGT_CLI_CLIENTE, PORTAVEL ENTRE         *
      * MODULOS. NAO SUBSTITUI DCLGEN, QUE FICA EM dclgen/DCLCLI.CPY.  *
      *****************************************************************
       01  SGCLIDAT.
           05  SG-CLI-ID                 PIC 9(10).
           05  SG-CLI-TIPO-DOC           PIC X(03).
               88  SG-CLI-DOC-CPF                 VALUE 'CPF'.
               88  SG-CLI-DOC-CNPJ                VALUE 'CNPJ'.
               88  SG-CLI-DOC-LE                  VALUE 'LE '.
               88  SG-CLI-DOC-VALIDO              VALUES
                   'CPF' 'CNPJ' 'LE '.
           05  SG-CLI-DOCUMENTO          PIC X(14).
           05  SG-CLI-NOME               PIC X(60).
           05  SG-CLI-NOME-REDUZ         PIC X(20).
           05  SG-CLI-TIPO-CLI           PIC X(02).
               88  SG-CLI-PF                      VALUE 'PF'.
               88  SG-CLI-PJ                      VALUE 'PJ'.
               88  SG-CLI-ES                      VALUE 'ES'.
           05  SG-CLI-SITUACAO           PIC X(01).
               88  SG-CLI-SIT-ATIVO               VALUE 'A'.
               88  SG-CLI-SIT-INATIVO             VALUE 'I'.
               88  SG-CLI-SIT-BLOQUEADO           VALUE 'B'.
               88  SG-CLI-SIT-CANCELADO           VALUE 'C'.
           05  SG-CLI-DT-CADASTRO        PIC 9(08).
           05  SG-CLI-DT-ATUALIZACAO     PIC 9(08).
      *---- ENDERECO --------------------------------------------------*
           05  SG-CLI-ENDERECO.
               10  SG-CLI-CEP            PIC 9(08).
               10  SG-CLI-LOGRADOURO     PIC X(60).
               10  SG-CLI-NUMERO         PIC X(10).
               10  SG-CLI-COMPLEMENTO    PIC X(30).
               10  SG-CLI-BAIRRO         PIC X(30).
               10  SG-CLI-CIDADE         PIC X(30).
               10  SG-CLI-UF             PIC X(02).
               10  SG-CLI-PAIS           PIC X(03) VALUE 'BRA'.
      *---- CONTATO ---------------------------------------------------*
           05  SG-CLI-CONTATO.
               10  SG-CLI-DDD            PIC 9(02).
               10  SG-CLI-TELEFONE       PIC 9(09).
               10  SG-CLI-CELULAR        PIC 9(11).
               10  SG-CLI-EMAIL          PIC X(60).
      *---- INDICADORES -----------------------------------------------*
           05  SG-CLI-IND-INADIMP        PIC X(01).
               88  SG-CLI-INADIMPLENTE            VALUE 'S'.
               88  SG-CLI-EM-DIA                  VALUE 'N'.
           05  SG-CLI-CLASSE-RISCO       PIC X(01).
               88  SG-CLI-RISCO-A                 VALUE 'A'.
               88  SG-CLI-RISCO-B                 VALUE 'B'.
               88  SG-CLI-RISCO-C                 VALUE 'C'.
               88  SG-CLI-RISCO-D                 VALUE 'D'.
               88  SG-CLI-RISCO-E                 VALUE 'E'.
           05  SG-CLI-SCORE              PIC 9(04).
           05  SG-CLI-FILLER             PIC X(20).
