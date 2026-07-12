      *****************************************************************
      * COPYBOOK.: SGDOCVAL                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: AREA DE COMUNICACAO DA VALIDACAO DE DOCUMENTO       *
      *            EXECUTADA POR SGCB0170                              *
      * USO .....: LINKAGE-SECTION DE SGCB0170 E WORKING DOS CHAMADORES*
      *----------------------------------------------------------------*
      * TIPOS SUPORTADOS:                                              *
      *   CPF  - PESSOA FISICA  (11 DIGITOS COM 2 DVs)                 *
      *   CNPJ - PESSOA JURIDICA (14 DIGITOS COM 2 DVs)                *
      *   LE   - INSCRICAO ESTADUAL (VARIA POR UF)                     *
      *****************************************************************
       01  SGDOCVAL.
      *---- ENTRADA ---------------------------------------------------*
           05  SG-DV-TIPO                PIC X(04).
               88  SG-DV-TIPO-CPF                 VALUE 'CPF '.
               88  SG-DV-TIPO-CNPJ                VALUE 'CNPJ'.
               88  SG-DV-TIPO-LE                  VALUE 'LE  '.
               88  SG-DV-TIPO-VALIDO              VALUES
                   'CPF ' 'CNPJ' 'LE  '.
      *
           05  SG-DV-DOCUMENTO           PIC X(14).
           05  SG-DV-UF                  PIC X(02).
           05  SG-DV-IND-PERMITE-VAZIO   PIC X(01).
               88  SG-DV-PERMITE-VAZIO            VALUE 'S'.
               88  SG-DV-NAO-PERMITE-VAZIO        VALUE 'N'.
      *---- SAIDA -----------------------------------------------------*
           05  SG-DV-IND-VALIDO          PIC X(01).
               88  SG-DV-DOC-VALIDO               VALUE 'S'.
               88  SG-DV-DOC-INVALIDO             VALUE 'N'.
      *
           05  SG-DV-DOC-FORMATADO       PIC X(18).
           05  SG-DV-COMPRIMENTO         PIC 9(02).
      *
           05  SG-DV-MOTIVO              PIC X(20).
               88  SG-DV-MT-OK                    VALUE
                   '00-DOC-OK           '.
               88  SG-DV-MT-VAZIO                 VALUE
                   '04-DOC-VAZIO        '.
               88  SG-DV-MT-DV-ERR                VALUE
                   '08-DOC-DV-ERR       '.
               88  SG-DV-MT-LEN-INVAL             VALUE
                   '08-DOC-LEN-INVAL    '.
               88  SG-DV-MT-TIPO-INVAL            VALUE
                   '08-DOC-TIPO-INVAL   '.
               88  SG-DV-MT-CHAR-INVAL            VALUE
                   '08-DOC-CHAR-INVAL   '.
      *
           05  SG-DV-RETURN-CODE         PIC 9(02).
           05  SG-DV-MENSAGEM            PIC X(80).
