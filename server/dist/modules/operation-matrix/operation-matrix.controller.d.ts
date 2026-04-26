import type { Request, Response } from 'express';
export declare function getMatrixItems(req: Request, res: Response): Promise<void>;
export declare function getSuggestionCatalog(_req: Request, res: Response): Promise<void>;
export declare function getMatrixItemTree(req: Request, res: Response): Promise<void>;
export declare function postMatrixNode(req: Request, res: Response): Promise<void>;
export declare function patchMatrixNode(req: Request, res: Response): Promise<void>;
export declare function deleteMatrixNode(req: Request, res: Response): Promise<void>;
export declare function postMatrixNodeReorder(req: Request, res: Response): Promise<void>;
export declare function postMatrixNodeDuplicate(req: Request, res: Response): Promise<void>;
export declare function postMatrixNodeRestore(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=operation-matrix.controller.d.ts.map