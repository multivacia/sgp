import type {
  Collaborator,
  CollaboratorCreateInput,
  CollaboratorListFilter,
  CollaboratorUpdateInput,
  Role,
  Sector,
  ServiceMutationResult,
} from './collaborator.types'

export type CollaboratorsService = {
  listCollaborators(
    filter?: CollaboratorListFilter,
  ): Promise<Collaborator[]>
  getCollaborator(id: string): Promise<Collaborator | null>
  createCollaborator(
    input: CollaboratorCreateInput,
  ): Promise<ServiceMutationResult<Collaborator>>
  updateCollaborator(
    id: string,
    input: CollaboratorUpdateInput,
  ): Promise<ServiceMutationResult<Collaborator>>
  activateCollaborator(
    id: string,
  ): Promise<ServiceMutationResult<Collaborator>>
  inactivateCollaborator(
    id: string,
  ): Promise<ServiceMutationResult<Collaborator>>
  listSectors(): Promise<Sector[]>
  listRoles(): Promise<Role[]>
}
