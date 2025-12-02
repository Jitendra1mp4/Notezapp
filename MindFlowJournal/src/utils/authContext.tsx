import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface AuthContextType {
  encryptionKey: string | null;
  setEncryptionKey: (key: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  /**
   * Logout: Wipe the encryption key from memory
   * This ensures the DK is not accessible if device is compromised
   */
  const logout = () => {
    setEncryptionKey(null);
  };

  const value = useMemo(
    () => ({ encryptionKey, setEncryptionKey, logout }),
    [encryptionKey]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
