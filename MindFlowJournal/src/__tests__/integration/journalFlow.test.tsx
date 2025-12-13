import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import journalsReducer, {
  addJournal,
  updateJournal,
  deleteJournal,
} from '../../stores/slices/journalsSlice';
import { Journal } from '../../types';

describe('Journal Flow Integration', () => {
  it('should add, update, and delete journals in Redux', () => {
    const store = configureStore({
      reducer: {
        journals: journalsReducer,
      },
    });

    const journal: Journal = {
      id: '1',
      date: '2025-10-26T08:00:00.000Z',
      createdAt: '2025-10-26T08:00:00.000Z',
      updatedAt: '2025-10-26T08:00:00.000Z',
      text: 'Test entry',
    };

    // Add journal
    store.dispatch(addJournal(journal));
    let state = store.getState().journals;
    expect(state.journals).toHaveLength(1);
    expect(state.journals[0].text).toBe('Test entry');

    // Update journal
    const updated = { ...journal, text: 'Updated entry' };
    store.dispatch(updateJournal(updated));
    state = store.getState().journals;
    expect(state.journals[0].text).toBe('Updated entry');

    // Delete journal
    store.dispatch(deleteJournal(journal.id));
    state = store.getState().journals;
    expect(state.journals).toHaveLength(0);
  });
});

