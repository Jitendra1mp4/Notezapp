export type Journal = {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  text: string;
  mood?: string;
  images?: string[]; // Now stores base64 strings instead of file paths
};

export type SecurityQuestion = {
  questionId: string;
  question: string;
  answerHash: string;
};

export type UserAuth = {
  isAuthenticated: boolean;
  salt?: string;
  securityQuestions?: SecurityQuestion[];
};

export type AppSettings = {
  theme: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
  notificationTime: string;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Home: undefined;
  JournalList: undefined;
  JournalEditor: { journalId?: string; selectedDate?: string }; // Updated
  JournalDetail: { journalId: string };
  Calendar: undefined;
  Export: undefined;
  Settings: undefined;
};

