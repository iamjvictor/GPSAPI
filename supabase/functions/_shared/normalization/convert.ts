// Conversion helpers
export function normalizeSpeed(speedMps: number): number {
  return +(speedMps * 3.6).toFixed(2) // m/s -> km/h
}

export function toZones(maxSpeedMps: number) {
  const max = normalizeSpeed(maxSpeedMps)
  return {
    zone1: max < 12 ? 1 : 0,
    zone2: max >= 12 && max < 18 ? 1 : 0,
    zone3: max >= 18 && max < 24 ? 1 : 0,
    zone4: max >= 24 ? 1 : 0
  }
}
