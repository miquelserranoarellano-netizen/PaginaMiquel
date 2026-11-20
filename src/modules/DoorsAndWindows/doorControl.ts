/**
 * Apertura animada de puertas (0 = cerrada, 1 = abierta). El recorrido en
 * primera persona fija los objetivos según la distancia del visitante.
 */
const targets = new Map<string, number>();

export function setDoorTarget(id: string, value: number): void {
  targets.set(id, value);
}

export function getDoorTarget(id: string): number {
  return targets.get(id) ?? 0;
}

export function resetDoorTargets(): void {
  targets.clear();
}
