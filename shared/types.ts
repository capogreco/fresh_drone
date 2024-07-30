export interface Program {
  id: number;
  is_playing: boolean;
  frequency: number;
  amplitude: number;
  lag_time: number;
  versionstamp: string;
  values: number[];
  key: string;
}
