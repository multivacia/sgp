export type CollaboratorApi = {
  id: string
  code: string | null
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  avatar_url: string | null
  sector_id: string | null
  sector_name: string | null
  role_id: string | null
  role_name: string | null
  registration_code: string | null
  nickname: string | null
  status: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type CollaboratorRow = {
  id: string
  code: string | null
  registration_code: string | null
  nickname: string | null
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  avatar_url: string | null
  sector_id: string | null
  role_id: string | null
  status: string
  is_active: boolean
  notes: string | null
  created_at: Date
  updated_at: Date
  sector_name: string | null
  role_name: string | null
}

export function rowToCollaboratorApi(row: CollaboratorRow): CollaboratorApi {
  return {
    id: row.id,
    code: row.code,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    avatar_url: row.avatar_url,
    sector_id: row.sector_id,
    sector_name: row.sector_name,
    role_id: row.role_id,
    role_name: row.role_name,
    registration_code: row.registration_code,
    nickname: row.nickname,
    status: row.status,
    is_active: row.is_active,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}
