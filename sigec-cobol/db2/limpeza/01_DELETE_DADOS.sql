--*********************************************************************
--* 01_DELETE_DADOS.sql                                                *
--* Limpa todos os dados do SIGEC em ordem FK-safe.                    *
--* NAO faz DROP das tabelas.                                          *
--*                                                                    *
--* Ordem: filhas -> pais.                                             *
--*   1. SG_HIST_FINANCEIRO  (dep. SG_CONTRATO/SG_PAGAMENTO)           *
--*   2. SG_EVENTO_COBRANCA  (dep. SG_CONTRATO)                        *
--*   3. SG_OPCAO_RENEGOCIACAO (dep. SG_RENEGOCIACAO)                  *
--*   4. SG_RENEGOCIACAO     (dep. SG_CONTRATO)                        *
--*   5. SG_PAGAMENTO        (dep. SG_PARCELA)                         *
--*   6. SG_PARCELA          (dep. SG_CONTRATO)                        *
--*   7. SG_HIST_CONTRATO    (dep. SG_CONTRATO)                        *
--*   8. SG_HIST_CLIENTE     (dep. SG_CLIENTE)                         *
--*   9. SG_CONTRATO         (dep. SG_CLIENTE)                         *
--*  10. SG_CLIENTE                                                    *
--*  11. SG_HIST_PROCESSAMENTO (sem FK)                                *
--*  12. SG_PARAMETRO         (sem FK)                                 *
--*                                                                    *
--* CUIDADO: este script APAGA dados. Use apenas em ambientes de lab   *
--* ou de reset de homologacao. NUNCA em producao sem plano formal.    *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

DELETE FROM SIGEC.SG_HIST_FINANCEIRO;
DELETE FROM SIGEC.SG_EVENTO_COBRANCA;
DELETE FROM SIGEC.SG_OPCAO_RENEGOCIACAO;
DELETE FROM SIGEC.SG_RENEGOCIACAO;
DELETE FROM SIGEC.SG_PAGAMENTO;
DELETE FROM SIGEC.SG_PARCELA;
DELETE FROM SIGEC.SG_HIST_CONTRATO;
DELETE FROM SIGEC.SG_HIST_CLIENTE;
DELETE FROM SIGEC.SG_CONTRATO;
DELETE FROM SIGEC.SG_CLIENTE;
DELETE FROM SIGEC.SG_HIST_PROCESSAMENTO;
DELETE FROM SIGEC.SG_PARAMETRO;

COMMIT;
