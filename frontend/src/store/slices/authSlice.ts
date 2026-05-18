import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, setToken, getToken, ApiError } from '../../api/client';
import type { UpdateProfilePayload } from '../../types';
import type { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  token: getToken(),
  loading: false,
  error: null,
  initialized: false,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const data = await api<{ token: string; user: User }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  }
);

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const data = await api<{ user: User }>('/api/me');
  return data.user;
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload: UpdateProfilePayload, { rejectWithValue }) => {
    const formData = new FormData();
    formData.append('name', payload.name.trim());
    formData.append('email', payload.email.trim());

    if (payload.currentPassword) {
      formData.append('currentPassword', payload.currentPassword);
    }
    if (payload.newPassword) {
      formData.append('newPassword', payload.newPassword);
    }
    if (payload.removeAvatar) {
      formData.append('removeAvatar', 'true');
    }
    if (payload.avatarFile) {
      formData.append('avatar', payload.avatarFile);
    }

    const token = getToken();
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return rejectWithValue(data.error || 'Failed to update profile');
    }

    if (data.token) setToken(data.token);
    return data as { user: User; message: string; token?: string };
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } finally {
    setToken(null);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    finishInitialization(state) {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        setToken(null);
        state.initialized = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        if (action.payload.token) state.token = action.payload.token;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          (action.error instanceof ApiError ? action.error.message : null) ||
          'Failed to update profile';
      });
  },
});

export const { clearError, finishInitialization } = authSlice.actions;
export default authSlice.reducer;
