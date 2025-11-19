import { REGIONS } from '../../typeConst';

interface RegionSelectorProps {
  region: string;
  onChange: (region: string) => void;
  disabled: boolean;
}

export default function RegionSelector({ region, onChange, disabled }: RegionSelectorProps) {
  return (
    <div className="region-section">
      <div className="flex items-center gap-2">
        <label htmlFor="region-select" className="text-sm font-semibold whitespace-nowrap">
          Select a region
        </label>
        <select
          id="region-select"
          value={region}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 px-2 py-1 text-sm border rounded bg-background"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

