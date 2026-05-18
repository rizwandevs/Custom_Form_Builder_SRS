import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/client';
import type { Submission } from '../../types';

interface SubmissionsState {
  list: Submission[];
  current: Submission | null;
  pagination: { page: number; limit: number; total: number; pages: number } | null;
  loading: boolean;
  error: string | null;
}

const initialState: SubmissionsState = {
  list: [],
  current: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchSubmissions = createAsyncThunk(
  'submissions/fetch',
  async ({
    formId,
    page = 1,
    search = '',
    from,
    to,
  }: {
    formId: number;
    page?: number;
    search?: string;
    from?: string;
    to?: string;
  }) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const data = await api<{
      submissions: Submission[];
      pagination: SubmissionsState['pagination'];
    }>(`/api/forms/${formId}/submissions?${params}`);
    return data;
  }
);

export const fetchSubmission = createAsyncThunk(
  'submissions/fetchOne',
  async ({ formId, submissionId }: { formId: number; submissionId: number }) => {
    const data = await api<{ submission: Submission }>(
      `/api/forms/${formId}/submissions/${submissionId}`
    );
    return data.submission;
  }
);

const submissionsSlice = createSlice({
  name: 'submissions',
  initialState,
  reducers: {
    clearSubmissions(state) {
      state.list = [];
      state.current = null;
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubmissions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.submissions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSubmissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load submissions';
      })
      .addCase(fetchSubmission.fulfilled, (state, action) => {
        state.current = action.payload;
      });
  },
});

export const { clearSubmissions } = submissionsSlice.actions;
export default submissionsSlice.reducer;
