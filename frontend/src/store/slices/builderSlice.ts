import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { FormField } from '../../types';

interface BuilderState {
  fields: FormField[];
  selectedIndex: number | null;
  dirty: boolean;
}

const initialState: BuilderState = {
  fields: [],
  selectedIndex: null,
  dirty: false,
};

function generateFieldName(label: string, existing: FormField[]): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'field';
  let name = base;
  let i = 1;
  while (existing.some((f) => f.name === name)) {
    name = `${base}_${i}`;
    i++;
  }
  return name;
}

const builderSlice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    loadFields(state, action: PayloadAction<FormField[]>) {
      state.fields = action.payload.map((f, i) => ({ ...f, order: i }));
      state.selectedIndex = null;
      state.dirty = false;
    },
    addField(state, action: PayloadAction<string>) {
      const type = action.payload;
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const field: FormField = {
        type,
        label,
        name: generateFieldName(label, state.fields),
        order: state.fields.length,
        required: false,
        options: ['select', 'radio'].includes(type) ? ['Option 1', 'Option 2'] : null,
        settings: { placeholder: '' },
      };
      state.fields.push(field);
      state.selectedIndex = state.fields.length - 1;
      state.dirty = true;
    },
    updateField(state, action: PayloadAction<{ index: number; updates: Partial<FormField> }>) {
      const { index, updates } = action.payload;
      if (state.fields[index]) {
        state.fields[index] = { ...state.fields[index], ...updates };
        state.dirty = true;
      }
    },
    removeField(state, action: PayloadAction<number>) {
      state.fields.splice(action.payload, 1);
      state.fields.forEach((f, i) => {
        f.order = i;
      });
      state.selectedIndex = null;
      state.dirty = true;
    },
    reorderFields(state, action: PayloadAction<{ from: number; to: number }>) {
      const { from, to } = action.payload;
      const [item] = state.fields.splice(from, 1);
      state.fields.splice(to, 0, item);
      state.fields.forEach((f, i) => {
        f.order = i;
      });
      state.dirty = true;
    },
    selectField(state, action: PayloadAction<number | null>) {
      state.selectedIndex = action.payload;
    },
    markSaved(state) {
      state.dirty = false;
    },
    resetBuilder() {
      return initialState;
    },
  },
});

export const {
  loadFields,
  addField,
  updateField,
  removeField,
  reorderFields,
  selectField,
  markSaved,
  resetBuilder,
} = builderSlice.actions;
export default builderSlice.reducer;
