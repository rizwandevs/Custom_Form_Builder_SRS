import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import formsReducer from './slices/formsSlice';
import builderReducer from './slices/builderSlice';
import submissionsReducer from './slices/submissionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    forms: formsReducer,
    builder: builderReducer,
    submissions: submissionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
