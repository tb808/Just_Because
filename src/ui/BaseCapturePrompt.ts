import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { captureDuration, captureRadius } from '../data/bases';
import type { BaseStatus } from '../world/BaseManager';

const targetText = (guards: number, tanks: number) => {
  const targets: string[] = [];
  if (guards) targets.push(`${guards} ${guards === 1 ? 'Wache' : 'Wachen'}`);
  if (tanks) targets.push(`${tanks} ${tanks === 1 ? 'roten Tank' : 'rote Tanks'}`);
  return targets.join(' und ');
};

export function baseCapturePrompt(base: BaseStatus, position: Vector3) {
  const definition = base.definition;
  const remainingGuards = definition.guards.length - base.guards;
  const remainingTanks = definition.tanks.length - base.tanks;
  const cleared = remainingGuards === 0 && remainingTanks === 0;
  const insideFlag = Vector3.DistanceSquared(position, Vector3.FromArray(definition.flag)) < captureRadius ** 2;
  const seconds = Math.floor(base.capture);

  if (base.liberated) return {
    title: `${definition.name} · FREI`,
    detail: 'Die Bewohner sind zurück. Nachschub am SUV verfügbar. N wählt die nächste Basis.',
    count: `${base.guards}/${definition.guards.length} WACHEN · ${base.tanks}/${definition.tanks.length} TANKS · FLAGGE ${captureDuration}/${captureDuration} S`,
    hint: '',
    progress: 1,
  };

  if (!cleared) {
    const targets = targetText(remainingGuards, remainingTanks);
    return {
      title: `${definition.name} · EINNEHMEN`,
      detail: insideFlag
        ? `Flaggenbereich erreicht. Schalte zuerst noch ${targets} aus und bleibe danach ${captureDuration} Sekunden hier.`
        : `Schalte noch ${targets} aus. Gehe danach zur Flagge und bleibe ${captureDuration} Sekunden im markierten Bereich.`,
      count: `${base.guards}/${definition.guards.length} WACHEN · ${base.tanks}/${definition.tanks.length} TANKS · DANACH FLAGGE ${captureDuration} S`,
      hint: `BASIS EINNEHMEN · Noch ${targets} ausschalten · danach ${captureDuration} S an der Flagge bleiben`,
      progress: (base.guards + base.tanks) / (definition.guards.length + definition.tanks.length + 1),
    };
  }

  return {
    title: `${definition.name} · FLAGGE EINNEHMEN`,
    detail: insideFlag
      ? `Bleibe im Flaggenbereich, bis die ${captureDuration} Sekunden vollständig sind.`
      : `Alle Wachen und roten Tanks sind ausgeschaltet. Gehe jetzt zur Flagge und bleibe dort ${captureDuration} Sekunden.`,
    count: `${base.guards}/${definition.guards.length} WACHEN · ${base.tanks}/${definition.tanks.length} TANKS · FLAGGE ${seconds}/${captureDuration} S`,
    hint: insideFlag
      ? `FLAGGE EINNEHMEN · Im Bereich bleiben · ${seconds}/${captureDuration} S`
      : `BASIS EINNEHMEN · Zur Flagge gehen und dort ${captureDuration} S bleiben`,
    progress: (base.guards + base.tanks + base.capture / captureDuration) / (definition.guards.length + definition.tanks.length + 1),
  };
}
