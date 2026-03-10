import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ReportingAnalytiqueCycleTimeQueryDto,
  ReportingAnalytiqueExportRequestDto,
  ReportingAnalytiqueQueryDto
} from './reporting-analytique.dto';

describe('ReportingAnalytique DTO validation', () => {
  it('rejette exerciceId invalide', () => {
    const dto = plainToInstance(ReportingAnalytiqueQueryDto, {
      exerciceId: 'invalid-uuid',
      periode: '2026-03'
    });

    const errors = validateSync(dto);
    const hasExerciceIdError = errors.some((error) => error.property === 'exerciceId');
    expect(hasExerciceIdError).toBe(true);
  });

  it('rejette rowDimension hors enum', () => {
    const dto = plainToInstance(ReportingAnalytiqueQueryDto, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      rowDimension: 'invalid-dimension'
    });

    const errors = validateSync(dto);
    const hasRowDimensionError = errors.some((error) => error.property === 'rowDimension');
    expect(hasRowDimensionError).toBe(true);
  });

  it('rejette format export hors enum', () => {
    const dto = plainToInstance(ReportingAnalytiqueExportRequestDto, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'tableau-croise',
      format: 'docx'
    });

    const errors = validateSync(dto);
    const hasFormatError = errors.some((error) => error.property === 'format');
    expect(hasFormatError).toBe(true);
  });

  it('accepte un filtre cycle-time avec seuils par etape', () => {
    const dto = plainToInstance(ReportingAnalytiqueCycleTimeQueryDto, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      etape: 'depense-paiement',
      seuilDepensePaiementHeures: 72,
      seuilVariationPct: 15
    });

    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });
});
