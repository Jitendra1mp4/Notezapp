## Sprint 1: Setup & Core Architecture

This PR completes all tasks for Sprint 1, establishing the foundation for MindFlow Journal.

### What's Included

✅ **Project Setup**
- Expo project initialization
- All dependencies installed (navigation, Redux, UI library, etc.)
- TypeScript configuration

✅ **Development Tooling**
- ESLint + Prettier configuration
- Jest testing framework
- Husky pre-commit hooks
- Git workflow (main/develop branches)

✅ **Architecture**
- Redux store with 3 slices: auth, journals, settings
- Theme provider with light/dark mode
- Safe area context for proper screen rendering

✅ **Navigation**
- AuthStack: Login, Signup, ForgotPassword
- MainStack: Home, JournalList, JournalEditor, JournalDetail, Calendar, Export, Settings
- Conditional rendering based on auth state

✅ **Screens**
- All placeholder screens created with basic UI
- Proper navigation between screens
- Theme-aware styling