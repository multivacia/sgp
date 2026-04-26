import type { Env } from '../../config/env.js'
import type { ArgosDocumentDraftPort } from './argosDocumentDraftPort.js'
import { HttpArgosDocumentDraftAdapter } from './httpArgosDocumentDraftAdapter.js'
import { LocalPipelineArgosDocumentDraftAdapter } from './localPipelineArgosDocumentDraftAdapter.js'
import { StubArgosDocumentDraftAdapter } from './stubArgosDocumentDraftAdapter.js'

export function createArgosDocumentDraftAdapter(env: Env): ArgosDocumentDraftPort {
  if (env.argosIngestUrl?.trim()) {
    return new HttpArgosDocumentDraftAdapter(env)
  }
  if (env.argosUseMinimalStub) {
    return new StubArgosDocumentDraftAdapter()
  }
  return new LocalPipelineArgosDocumentDraftAdapter()
}
