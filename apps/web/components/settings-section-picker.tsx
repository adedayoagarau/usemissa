'use client';

import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** On a phone, the settings section list becomes one picker that opens the chosen section. */
export function SettingsSectionPicker({ base, active, sections }: { base: string; active: string; sections: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  return (
    <Select value={active} onValueChange={(value) => { if (value) router.push(`${base}?section=${encodeURIComponent(String(value))}`); }}>
      <SelectTrigger aria-label="Settings section" className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{sections.map((section) => <SelectItem key={section.id} value={section.id}>{section.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
