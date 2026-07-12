--*********************************************************************
--* 99_COMMIT.sql                                                      *
--* COMMIT explicito final da carga (redundante quando cada script     *
--* ja emite COMMIT, mas util quando os arquivos sao concatenados      *
--* em uma unica execucao).                                            *
--*********************************************************************

COMMIT;
