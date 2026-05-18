import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '../../types';

interface Props {
  field: FormField;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export default function SortableField({ field, index, selected, onSelect, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `field-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`mb-2 flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${
        selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-400 hover:text-slate-600"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⋮⋮
      </button>
      <div className="flex-1">
        <span className="text-xs font-medium uppercase text-slate-400">{field.type}</span>
        <p className="font-medium text-slate-800">{field.label}</p>
        {field.required && <span className="text-xs text-red-500">Required</span>}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-red-500 hover:text-red-700"
      >
        ×
      </button>
    </div>
  );
}
