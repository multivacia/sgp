--*********************************************************************
--* 07_DOMINIOS.sql                                                    *
--* Verifica se os CHECKs de dominio das tabelas estao sendo           *
--* respeitados. Se as constraints forem trusted, retorno vazio.       *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

-- Cliente: tipo documento fora do dominio
SELECT ID_CLIENTE, TP_DOCUMENTO FROM SIGEC.SG_CLIENTE
 WHERE TP_DOCUMENTO NOT IN ('CPF','CNP','LE ');

-- Cliente: tipo cliente fora do dominio
SELECT ID_CLIENTE, TP_CLIENTE FROM SIGEC.SG_CLIENTE
 WHERE TP_CLIENTE NOT IN ('PF','PJ','ES');

-- Contrato: status fora do dominio
SELECT ID_CONTRATO, ST_CONTRATO FROM SIGEC.SG_CONTRATO
 WHERE ST_CONTRATO NOT IN ('AT','BL','IN','RN','EN','CA');

-- Contrato: classificacao inadimplencia fora do dominio
SELECT ID_CONTRATO, CLASSIFICACAO_INAD FROM SIGEC.SG_CONTRATO
 WHERE CLASSIFICACAO_INAD IS NOT NULL
   AND CLASSIFICACAO_INAD NOT IN ('N','L','M','G','R');

-- Parcela: status fora do dominio
SELECT ID_CONTRATO, NR_PARCELA, ST_PARCELA FROM SIGEC.SG_PARCELA
 WHERE ST_PARCELA NOT IN ('AB','PG','PP','VC','CN');

-- Pagamento: canal fora do dominio
SELECT ID_PAGAMENTO, CD_CANAL FROM SIGEC.SG_PAGAMENTO
 WHERE CD_CANAL NOT IN ('BOL','PIX','TED','DOC','CAX','CRT','LEG');

-- Renegociacao: status fora do dominio
SELECT ID_RENEGOCIACAO, ST_RENEGOCIACAO FROM SIGEC.SG_RENEGOCIACAO
 WHERE ST_RENEGOCIACAO NOT IN ('PR','AP','RC','AT','EN');

-- Registros com SITUACAO_REG fora do dominio (em todas as tabelas)
SELECT 'SG_CLIENTE' AS TAB,
       CAST(ID_CLIENTE AS VARCHAR(20)) AS ID_CHAVE,
       SITUACAO_REG
  FROM SIGEC.SG_CLIENTE   WHERE SITUACAO_REG NOT IN ('A','I')
UNION ALL
SELECT 'SG_CONTRATO',
       ID_CONTRATO,
       SITUACAO_REG
  FROM SIGEC.SG_CONTRATO  WHERE SITUACAO_REG NOT IN ('A','I');
