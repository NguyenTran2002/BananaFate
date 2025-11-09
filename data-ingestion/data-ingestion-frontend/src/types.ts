export enum AppStep {
  WELCOME,
  CAPTURING,
  PREVIEW,
  METADATA,
  CONFIRMATION,
  UPLOADING,
  SUCCESS,
  ERROR,
}

export enum RipenessStage {
  UNDER_RIPE = 'Under Ripe',
  BARELY_RIPE = 'Barely Ripe',
  RIPE = 'Ripe',
  VERY_RIPE = 'Very Ripe',
  OVER_RIPE = 'Over Ripe',
  DEATH = 'Death',
}

export interface BananaMetadata {
  batchId: string;
  bananaId: string;
  notes: string;
  captureTime: string;
  stage: RipenessStage | '';
}

export interface BananaLookupResult {
  found: boolean;
  batchId?: string;
}