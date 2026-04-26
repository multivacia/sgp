import { HttpArgosDocumentDraftAdapter } from './httpArgosDocumentDraftAdapter.js';
import { LocalPipelineArgosDocumentDraftAdapter } from './localPipelineArgosDocumentDraftAdapter.js';
import { StubArgosDocumentDraftAdapter } from './stubArgosDocumentDraftAdapter.js';
export function createArgosDocumentDraftAdapter(env) {
    if (env.argosIngestUrl?.trim()) {
        return new HttpArgosDocumentDraftAdapter(env);
    }
    if (env.argosUseMinimalStub) {
        return new StubArgosDocumentDraftAdapter();
    }
    return new LocalPipelineArgosDocumentDraftAdapter();
}
//# sourceMappingURL=createArgosDocumentDraftAdapter.js.map