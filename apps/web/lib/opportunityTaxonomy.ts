import { assembleRegistry } from '@missa/radar-engine';

function labelFor(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const registry = assembleRegistry();

/**
 * The filter vocabulary is derived from the same registry that powers Radar.
 * Keeping this here prevents the browse UI from quietly becoming a literary-
 * only directory as new niches are added to the source graph.
 */
export const DISCIPLINE_OPTIONS = [...new Set(
  registry.verticals.flatMap((vertical) => vertical.disciplines),
)]
  .sort((a, b) => a.localeCompare(b))
  .map((value) => ({ value, label: labelFor(value) }));

/** ISO/region values represented by registry sources, kept as query values. */
export const LOCATION_OPTIONS = [...new Set(
  registry.sources.flatMap((source) => source.geography ?? []),
)]
  .sort((a, b) => a.localeCompare(b))
  .map((value) => ({ value, label: value === 'global' ? 'Worldwide' : labelFor(value) }));
