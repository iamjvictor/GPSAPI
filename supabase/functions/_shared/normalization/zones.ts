// Future extensible zones logic (placeholder)
export interface ZoneDefinition { name: string; minKmh: number; maxKmh: number }

export const DEFAULT_ZONES: ZoneDefinition[] = [
  { name: 'zone1', minKmh: 0, maxKmh: 12 },
  { name: 'zone2', minKmh: 12, maxKmh: 18 },
  { name: 'zone3', minKmh: 18, maxKmh: 24 },
  { name: 'zone4', minKmh: 24, maxKmh: 99 }
]
