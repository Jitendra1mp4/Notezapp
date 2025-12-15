import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserAuth } from '../../types';

interface AuthState extends UserAuth {
  isLoading: boolean;
   encryptionKey: string | null; // Store DK here instead of context
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
    encryptionKey: null,

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
      state.encryptionKey = null; // 🔑 CRITICAL: Wipe encryption key
    },

    setEncryptionKey(state, action: PayloadAction<string | null>) {
      state.encryptionKey = action.payload;
    },   
  
  },
});

export const {
  setAuthenticated,
  setSalt,
  setSecurityQuestions,
  setLoading,
  logout,
  setEncryptionKey,
  
  
} = authSlice.actions;

export default authSlice.reducer;
