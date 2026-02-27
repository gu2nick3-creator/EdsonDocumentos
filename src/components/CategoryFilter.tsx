import { categories, type DocumentCategory } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  selected: DocumentCategory | "Todos";
  onSelect: (cat: DocumentCategory | "Todos") => void;
}

const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => {
  const allCategories: (DocumentCategory | "Todos")[] = ["Todos", ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {allCategories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
            selected === cat
              ? "bg-primary text-primary-foreground border-primary shadow-gold"
              : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
