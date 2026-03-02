const DEFAULT_STORAGE_MODE = 'postgres';

export const resolveAuthStorageMode = (): 'postgres' | 'memory' => {
  const configured = (process.env.AUTH_STORAGE_MODE ?? DEFAULT_STORAGE_MODE).trim().toLowerCase();
  return configured === 'memory' ? 'memory' : 'postgres';
};

