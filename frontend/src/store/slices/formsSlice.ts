import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/client';
import type { Form } from '../../types';

interface FormsState {
  list: Form[];
  current: Form | null;
  loading: boolean;
  error: string | null;
}

const initialState: FormsState = {
  list: [],
  current: null,
  loading: false,
  error: null,
};

export const fetchForms = createAsyncThunk('forms/fetchAll', async () => {
  const data = await api<{ forms: Form[] }>('/api/forms');
  return data.forms;
});

export const fetchForm = createAsyncThunk('forms/fetchOne', async (id: number) => {
  const data = await api<{ form: Form }>(`/api/forms/${id}`);
  return data.form;
});

export const createForm = createAsyncThunk(
  'forms/create',
  async (payload: { title: string; description?: string }) => {
    const data = await api<{ form: Form }>('/api/forms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.form;
  }
);

export const updateForm = createAsyncThunk(
  'forms/update',
  async ({ id, ...payload }: Partial<Form> & { id: number; fields?: Form['fields'] }) => {
    const data = await api<{ form: Form }>(`/api/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.form;
  }
);

export const deleteForm = createAsyncThunk('forms/delete', async (id: number) => {
  await api(`/api/forms/${id}`, { method: 'DELETE' });
  return id;
});

export const duplicateForm = createAsyncThunk('forms/duplicate', async (id: number) => {
  const data = await api<{ form: Form }>(`/api/forms/${id}/duplicate`, { method: 'POST' });
  return data.form;
});

const formsSlice = createSlice({
  name: 'forms',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchForms.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchForms.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchForms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load forms';
      })
      .addCase(fetchForm.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createForm.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(updateForm.fulfilled, (state, action) => {
        state.current = action.payload;
        const idx = state.list.findIndex((f) => f.id === action.payload.id);
        if (idx >= 0) state.list[idx] = action.payload;
      })
      .addCase(deleteForm.fulfilled, (state, action) => {
        state.list = state.list.filter((f) => f.id !== action.payload);
      })
      .addCase(duplicateForm.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      });
  },
});

export const { clearCurrent } = formsSlice.actions;
export default formsSlice.reducer;
