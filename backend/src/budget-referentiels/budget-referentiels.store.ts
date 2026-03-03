import { Injectable, Logger } from '@nestjs/common';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type {
  ActionEntity,
  AllocationEntity,
  AuditEntry,
  DecisionVersionEntity,
  EnveloppeEntity,
  ExerciceEntity,
  ProgrammeEntity,
  SectionEntity
} from './budget-referentiels.types';

interface BudgetReferentielsSnapshot {
  exercices: ExerciceEntity[];
  enveloppes: EnveloppeEntity[];
  sections: SectionEntity[];
  programmes: ProgrammeEntity[];
  actions: ActionEntity[];
  allocations: AllocationEntity[];
  decisionVersions: DecisionVersionEntity[];
  auditLog: AuditEntry[];
}

const EMPTY_SNAPSHOT: BudgetReferentielsSnapshot = {
  exercices: [],
  enveloppes: [],
  sections: [],
  programmes: [],
  actions: [],
  allocations: [],
  decisionVersions: [],
  auditLog: []
};

@Injectable()
export class BudgetReferentielsStore {
  private readonly logger = new Logger(BudgetReferentielsStore.name);
  private readonly storagePath = resolve(
    process.cwd(),
    process.env.BUDGET_REFERENTIELS_STORE_PATH ?? '.data/budget-referentiels.json'
  );
  private readonly lockPath = `${this.storagePath}.lock`;

  load(): BudgetReferentielsSnapshot {
    if (!existsSync(this.storagePath)) {
      return { ...EMPTY_SNAPSHOT };
    }

    try {
      const content = readFileSync(this.storagePath, 'utf8');
      const parsed = JSON.parse(content) as BudgetReferentielsSnapshot;

      return {
        exercices: parsed.exercices ?? [],
        enveloppes: parsed.enveloppes ?? [],
        sections: parsed.sections ?? [],
        programmes: parsed.programmes ?? [],
        actions: parsed.actions ?? [],
        allocations: parsed.allocations ?? [],
        decisionVersions: parsed.decisionVersions ?? [],
        auditLog: parsed.auditLog ?? []
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load budget referentiels store: ${message}`);
    }
  }

  save(snapshot: BudgetReferentielsSnapshot): void {
    const directory = dirname(this.storagePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    const lockFd = this.acquireExclusiveLock();
    try {
      const tempPath = `${this.storagePath}.tmp`;
      writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
      renameSync(tempPath, this.storagePath);
      this.logger.debug(
        `Persisted budget referentiels snapshot (${snapshot.exercices.length} exercices, ${snapshot.auditLog.length} audits)`
      );
    } finally {
      this.releaseExclusiveLock(lockFd);
    }
  }

  private acquireExclusiveLock(): number {
    const startedAt = Date.now();
    const maxWaitMs = 2000;

    while (Date.now() - startedAt < maxWaitMs) {
      try {
        return openSync(this.lockPath, 'wx');
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'EEXIST') {
          throw error;
        }

        this.blockingSleep(20);
      }
    }

    throw new Error('Failed to acquire budget referentiels store lock within timeout');
  }

  private releaseExclusiveLock(lockFd: number): void {
    closeSync(lockFd);
    rmSync(this.lockPath, { force: true });
  }

  private blockingSleep(milliseconds: number): void {
    const lock = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(lock, 0, 0, milliseconds);
  }
}
