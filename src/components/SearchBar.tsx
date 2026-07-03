"use client";

export function SearchBar({
  value,
  onChange,
  placeholder = "Ürün adı, kod veya renk ara...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`catalog-search-wrap px-5 ${className}`}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        aria-label={placeholder}
        className="catalog-search-input"
      />
    </div>
  );
}

/** Kaydırınca üstte sabit kalan tam genişlik arama çubuğu */
export function StickySearchBar({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="search-sticky-wrap">
      <SearchBar
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
