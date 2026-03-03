export type PrimitiveType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export interface ContractFieldMap {
  [field: string]: PrimitiveType;
}

export interface ContractShape {
  required: ContractFieldMap;
  optional?: ContractFieldMap;
}

export interface EndpointContract {
  id: string;
  domain: 'AUTH' | 'TENANT' | 'BUD';
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  statuses: number[];
  request?: ContractShape;
  response?: ContractShape;
  businessErrorCodes?: string[];
}

export interface ContractDiff {
  endpointId: string;
  method: string;
  path: string;
  severity: 'bloquant' | 'majeur' | 'mineur';
  message: string;
}

export interface ContractParityResult {
  generatedAt: string;
  comparedEndpoints: number;
  coverageByDomain: Record<'AUTH' | 'TENANT' | 'BUD', number>;
  nonCoveredEndpoints: string[];
  diffs: ContractDiff[];
}
