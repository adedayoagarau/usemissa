'use client';

import {
  TAXONOMY_BROWSE_LAYERS,
  taxonomyDescendantIds,
  taxonomyLabelFor,
  taxonomyTermById,
  termsForBrowseLayer,
  type TaxonomyBrowseLayerId,
} from '@missa/taxonomy';

export type TaxonomyPreferenceValue = 'include' | 'prefer' | 'exclude';

export type TaxonomyPreferenceSelection = {
  termId: string;
  preference: TaxonomyPreferenceValue;
  weight: number;
};

type TaxonomyBrowsePickerProps = {
  idPrefix: string;
  selectedTermIds?: string[];
  onSelectedTermIdsChange?: (termIds: string[]) => void;
  preferences?: TaxonomyPreferenceSelection[];
  onPreferencesChange?: (preferences: TaxonomyPreferenceSelection[]) => void;
  description?: string;
};

function selectedTermIdsFor(props: TaxonomyBrowsePickerProps): string[] {
  return props.preferences?.map((preference) => preference.termId) ?? props.selectedTermIds ?? [];
}

function selectedForFacet(termIds: string[], facet: string): string | undefined {
  return [...termIds].reverse().find((termId) => taxonomyTermById(termId)?.facet === facet);
}

function labelForLayer(layerId: TaxonomyBrowseLayerId): string {
  return TAXONOMY_BROWSE_LAYERS.find((layer) => layer.id === layerId)?.label ?? layerId;
}

export function TaxonomyBrowsePicker({
  idPrefix,
  selectedTermIds,
  onSelectedTermIdsChange,
  preferences,
  onPreferencesChange,
  description = 'Choose a discipline, then narrow it to a genre or style. Missa stores canonical terms, not labels.',
}: TaxonomyBrowsePickerProps) {
  const selected = selectedTermIdsFor({ selectedTermIds, onSelectedTermIdsChange, preferences, onPreferencesChange, idPrefix, description });
  const activeDiscipline = selectedForFacet(selected, 'practice-family');
  const activeGenre = selectedForFacet(selected, 'discipline');
  const genreOptions = termsForBrowseLayer('genre', activeDiscipline);
  const styleOptions = termsForBrowseLayer('style', activeGenre);

  function addTerm(termId: string): void {
    if (!termId) return;
    if (selected.includes(termId)) return;
    if (preferences && onPreferencesChange) {
      onPreferencesChange([...preferences, { termId, preference: 'include', weight: 100 }]);
      return;
    }
    onSelectedTermIdsChange?.([...selected, termId]);
  }

  function removeTerm(termId: string): void {
    const removed = new Set(taxonomyDescendantIds(termId));
    if (preferences && onPreferencesChange) {
      onPreferencesChange(preferences.filter((preference) => !removed.has(preference.termId)));
      return;
    }
    onSelectedTermIdsChange?.(selected.filter((id) => !removed.has(id)));
  }

  function changePreference(termId: string, preference: TaxonomyPreferenceValue): void {
    onPreferencesChange?.(preferences?.map((item) => item.termId === termId ? { ...item, preference } : item) ?? []);
  }

  function control(layerId: TaxonomyBrowseLayerId, options: Array<{ id: string; label: string }>, disabled = false) {
    const label = labelForLayer(layerId);
    return (
      <label key={layerId} className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
        <span className="sr-only">{label}</span>
        <select
          id={`${idPrefix}-${layerId}`}
          aria-label={label}
          value=""
          disabled={disabled}
          onChange={(event) => addTerm(event.target.value)}
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{disabled ? `Choose ${label.toLowerCase()} first` : label}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-3" data-taxonomy-picker={idPrefix}>
      <div className="grid gap-2 sm:grid-cols-3">
        {control('discipline', termsForBrowseLayer('discipline').map((term) => ({ id: term.id, label: term.preferredLabel })))}
        {control('genre', genreOptions.map((term) => ({ id: term.id, label: term.preferredLabel })), !activeDiscipline)}
        {control('style', styleOptions.map((term) => ({ id: term.id, label: term.preferredLabel })), !activeGenre)}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected taxonomy terms">
          {selected.map((termId) => {
            const preference = preferences?.find((item) => item.termId === termId);
            return (
              <span key={termId} className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-foreground">
                <span>{taxonomyLabelFor(termId)}</span>
                {preference && (
                  <select
                    aria-label={`Preference for ${taxonomyLabelFor(termId)}`}
                    value={preference.preference}
                    onChange={(event) => changePreference(termId, event.target.value as TaxonomyPreferenceValue)}
                    className="h-7 rounded border border-border bg-background px-1.5 text-[11px]"
                  >
                    <option value="include">Show me opportunities like this</option>
                    <option value="prefer">Especially interested</option>
                    <option value="exclude">Do not show this practice</option>
                  </select>
                )}
                <button type="button" aria-label={`Remove ${taxonomyLabelFor(termId)}`} onClick={() => removeTerm(termId)} className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground">×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
