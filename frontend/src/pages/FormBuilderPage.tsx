import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchForm, updateForm } from '../store/slices/formsSlice';
import {
  loadFields,
  addField,
  updateField,
  removeField,
  reorderFields,
  selectField,
  markSaved,
  resetBuilder,
} from '../store/slices/builderSlice';
import { FIELD_TYPES } from '../types';
import SortableField from '../components/builder/SortableField';
import FieldSettings from '../components/builder/FieldSettings';

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const formId = parseInt(id || '0', 10);
  const dispatch = useAppDispatch();
  const { current } = useAppSelector((s) => s.forms);
  const { fields, selectedIndex, dirty } = useAppSelector((s) => s.builder);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (formId) dispatch(fetchForm(formId));
    return () => {
      dispatch(resetBuilder());
    };
  }, [dispatch, formId]);

  useEffect(() => {
    if (current) {
      setTitle(current.title);
      setSlug(current.slug);
      setStatus(current.status);
      dispatch(loadFields(current.fields || []));
    }
  }, [current, dispatch]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((_, i) => `field-${i}` === active.id);
    const to = fields.findIndex((_, i) => `field-${i}` === over.id);
    if (from >= 0 && to >= 0) dispatch(reorderFields({ from, to }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateForm({
          id: formId,
          title,
          slug,
          status,
          fields,
        })
      ).unwrap();
      dispatch(markSaved());
    } finally {
      setSaving(false);
    }
  };

  const selectedField = selectedIndex !== null ? fields[selectedIndex] : null;

  if (!current) {
    return <p className="text-slate-500">Loading form...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/forms" className="text-sm text-indigo-600 hover:underline">
            ← Back to forms
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Form Builder</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/forms/${formId}/submissions`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Submissions
          </Link>
          {status === 'published' && (
            <Link
              to={`/f/${slug}`}
              target="_blank"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Preview
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : dirty ? 'Save *' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Add Field</h3>
          <div className="space-y-1">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => dispatch(addField(ft.type))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-indigo-50 hover:border-indigo-200"
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Canvas</h3>
          {fields.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              Drag fields from the left or click to add
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={fields.map((_, i) => `field-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {fields.map((field, index) => (
                  <SortableField
                    key={`${field.name}-${index}`}
                    field={field}
                    index={index}
                    selected={selectedIndex === index}
                    onSelect={() => dispatch(selectField(index))}
                    onRemove={() => dispatch(removeField(index))}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-5">
          {selectedField && selectedIndex !== null ? (
            <FieldSettings
              field={selectedField}
              allFields={fields}
              onUpdate={(updates) => dispatch(updateField({ index: selectedIndex, updates }))}
            />
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">Select a field to edit settings</p>
          )}
        </div>
      </div>
    </div>
  );
}
