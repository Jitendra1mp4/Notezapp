import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserAuth } from '../../types';

interface AuthState extends UserAuth {
  isLoading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setSalt: (state, action: PayloadAction<string>) => {
      state.salt = action.payload;
    },
    setSecurityQuestions: (
      state,
      action: PayloadAction<UserAuth['securityQuestions']>
    ) => {
      state.securityQuestions = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.salt = undefined;
      state.securityQuestions = undefined;
    },
  },
});

export const {
  setAuthenticated,
  setSalt,
  setSecurityQuestions,
  setLoading,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
