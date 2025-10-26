import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  encryptionKey: string | null;
  setEncryptionKey: (key: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  return (
    <AuthContext.Provider value={{ encryptionKey, setEncryptionKey }}>
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
