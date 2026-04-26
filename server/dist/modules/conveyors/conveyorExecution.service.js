import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { collaboratorExistsActive, getConveyorNodeForStepValidation, insertConveyorNodeAssignee, insertConveyorTimeEntry, } from './conveyorExecution.repository.js';
function isPgError(e) {
    return (typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        typeof e.code === 'string');
}
/**
 * Validação de domínio antes de persistir (defesa em profundidade junto aos triggers).
 */
async function assertStepAndConveyor(pool, conveyorId, conveyorNodeId) {
    const row = await getConveyorNodeForStepValidation(pool, conveyorNodeId);
    if (!row) {
        throw new AppError('Nó da esteira não encontrado.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    if (row.node_type !== 'STEP') {
        throw new AppError('Alocação e apontamento só são permitidos em atividades (STEP).', 422, ErrorCodes.VALIDATION_ERROR);
    }
    if (row.conveyor_id !== conveyorId) {
        throw new AppError('Identificador da esteira incompatível com o nó informado.', 422, ErrorCodes.VALIDATION_ERROR);
    }
}
export async function serviceInsertConveyorNodeAssignee(pool, input) {
    const active = await collaboratorExistsActive(pool, input.collaborator_id);
    if (!active) {
        throw new AppError('Colaborador não encontrado ou inativo.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    await assertStepAndConveyor(pool, input.conveyor_id, input.conveyor_node_id);
    try {
        return await insertConveyorNodeAssignee(pool, input);
    }
    catch (e) {
        if (isPgError(e) && e.code === '23505') {
            throw new AppError('Alocação duplicada para o mesmo colaborador nesta atividade, ou mais de um principal ativo.', 409, ErrorCodes.CONFLICT);
        }
        if (isPgError(e) && e.code === 'P0001') {
            throw new AppError(e.message.startsWith('conveyor_node_assignees:')
                ? e.message.replace(/^conveyor_node_assignees:\s*/, '')
                : e.message, 422, ErrorCodes.VALIDATION_ERROR);
        }
        throw e;
    }
}
export async function serviceInsertConveyorTimeEntry(pool, input) {
    if (input.minutes <= 0) {
        throw new AppError('Duração do apontamento deve ser maior que zero.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const active = await collaboratorExistsActive(pool, input.collaborator_id);
    if (!active) {
        throw new AppError('Colaborador não encontrado ou inativo.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    await assertStepAndConveyor(pool, input.conveyor_id, input.conveyor_node_id);
    try {
        return await insertConveyorTimeEntry(pool, input);
    }
    catch (e) {
        if (isPgError(e) && e.code === '23505') {
            throw new AppError('Conflito ao registrar apontamento.', 409, ErrorCodes.CONFLICT);
        }
        if (isPgError(e) && e.code === 'P0001') {
            throw new AppError(e.message.startsWith('conveyor_time_entries:')
                ? e.message.replace(/^conveyor_time_entries:\s*/, '')
                : e.message, 422, ErrorCodes.VALIDATION_ERROR);
        }
        throw e;
    }
}
//# sourceMappingURL=conveyorExecution.service.js.map