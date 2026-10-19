interface FilterPillsProps {
  items: string[];
  value: string;
  onChange: (val: string) => void;
}

export function FilterPills({ items, value, onChange }: FilterPillsProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          type="button"
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
            value === item
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card hover:border-primary text-foreground'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
