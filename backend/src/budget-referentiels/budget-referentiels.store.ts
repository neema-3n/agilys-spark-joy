import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type {
  ActionEntity,
  AuditEntry,
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
  auditLog: AuditEntry[];
}

const EMPTY_SNAPSHOT: BudgetReferentielsSnapshot = {
  exercices: [],
  enveloppes: [],
  sections: [],
  programmes: [],
  actions: [],
  auditLog: []
};

@Injectable()
export class BudgetReferentielsStore {
  private readonly logger = new Logger(BudgetReferentielsStore.name);
  private readonly storagePath = resolve(
    process.cwd(),
    process.env.BUDGET_REFERENTIELS_STORE_PATH ?? '.data/budget-referentiels.json'
  );

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

    const tempPath = `${this.storagePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
    renameSync(tempPath, this.storagePath);
    this.logger.debug(
      `Persisted budget referentiels snapshot (${snapshot.exercices.length} exercices, ${snapshot.auditLog.length} audits)`
    );
  }
}
