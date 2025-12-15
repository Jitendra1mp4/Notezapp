import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// src/stores/hooks.ts (add to existing hooks file)
export const useEncryptionKey = () => {
  return useAppSelector((state) => state.auth.encryptionKey);
};
