export enum AppStep {
  WELCOME,
  CAPTURING,
  PREVIEW,
  METADATA,
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
  capturePerson: string;
  notes: string;
  captureTime: string;
  stage: RipenessStage | '';
}