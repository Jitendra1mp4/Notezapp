// src/utils/journalPrompts.ts
/**
 * Journaling Prompts Utility
 * 
 * Provides psychology-backed prompts to help users overcome writer's block
 * and maintain consistent journaling habits. Prompts are categorized for
 * variety and effectiveness.
 */

export interface JournalPrompt {
  id: string;
  text: string;
  category: 'reflection' | 'gratitude' | 'goals' | 'emotions' | 'creativity' 
  | 'mindfulness'|'self-care'|'productivity' | 'values'|'wins'|'relationships'|'moments'|'challenges'|'future'|'morning'|'evening';
}

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  // Reflection (quick daily processing)
  {
    id: 'ref_1',
    text: 'What made today different?',
    category: 'reflection',
  },
  {
    id: 'ref_2',
    text: 'What surprised me today?',
    category: 'reflection',
  },
  {
    id: 'ref_3',
    text: 'What was my biggest challenge today?',
    category: 'reflection',
  },
  {
    id: 'ref_4',
    text: 'What conversation stuck with me today?',
    category: 'reflection',
  },
  {
    id: 'ref_5',
    text: 'What would I change about today?',
    category: 'reflection',
  },
  {
    id: 'ref_6',
    text: 'What did I learn today?',
    category: 'reflection',
  },

  // Gratitude (concrete and immediate)
  {
    id: 'grat_1',
    text: `Three things I'm grateful for today`,
    category: 'gratitude',
  },
  {
    id: 'grat_2',
    text: 'Who made me smile today?',
    category: 'gratitude',
  },
  {
    id: 'grat_3',
    text: 'What simple thing did I enjoy today?',
    category: 'gratitude',
  },
  {
    id: 'grat_4',
    text: 'What went better than expected today?',
    category: 'gratitude',
  },
  {
    id: 'grat_5',
    text: 'What made me laugh today?',
    category: 'gratitude',
  },
  {
    id: 'grat_6',
    text: 'What comfort or luxury am I grateful for?',
    category: 'gratitude',
  },

  // Goals & Growth (actionable and specific)
  {
    id: 'goal_1',
    text: 'One thing I can do better tomorrow:',
    category: 'goals',
  },
  {
    id: 'goal_2',
    text: 'What progress did I make today?',
    category: 'goals',
  },
  {
    id: 'goal_3',
    text: 'What skill did I practice today?',
    category: 'goals',
  },
  {
    id: 'goal_4',
    text: 'What am I looking forward to?',
    category: 'goals',
  },
  {
    id: 'goal_5',
    text: 'What habit am I building this week?',
    category: 'goals',
  },
  {
    id: 'goal_6',
    text: 'What did I accomplish today?',
    category: 'goals',
  },

  // Emotions (simple awareness)
  {
    id: 'emo_1',
    text: 'How am I feeling right now?',
    category: 'emotions',
  },
  {
    id: 'emo_2',
    text: 'What made me feel good today?',
    category: 'emotions',
  },
  {
    id: 'emo_3',
    text: 'What drained my energy today?',
    category: 'emotions',
  },
  {
    id: 'emo_4',
    text: 'What gave me energy today?',
    category: 'emotions',
  },
  {
    id: 'emo_5',
    text: 'What am I worried about?',
    category: 'emotions',
  },
  {
    id: 'emo_6',
    text: 'What brought me peace today?',
    category: 'emotions',
  },

  // Mindfulness (present moment, concrete)
  {
    id: 'mind_1',
    text: 'What did I notice today for the first time?',
    category: 'mindfulness',
  },
  {
    id: 'mind_2',
    text: 'When was I most focused today?',
    category: 'mindfulness',
  },
  {
    id: 'mind_3',
    text: 'How does my body feel right now?',
    category: 'mindfulness',
  },
  {
    id: 'mind_4',
    text: 'What moment made me stop and think?',
    category: 'mindfulness',
  },
  {
    id: 'mind_5',
    text: 'What do I need more of?',
    category: 'mindfulness',
  },
  {
    id: 'mind_6',
    text: 'What do I need less of?',
    category: 'mindfulness',
  },

  // Quick Wins (easy to answer, builds momentum)
  {
    id: 'quick_1',
    text: 'Best part of my day:',
    category: 'reflection',
  },
  {
    id: 'quick_2',
    text: 'One word to describe today:',
    category: 'emotions',
  },
  {
    id: 'quick_3',
    text: 'Something kind I did or saw today:',
    category: 'gratitude',
  },
  {
    id: 'quick_4',
    text: 'What made today worth it?',
    category: 'reflection',
  },
  {
    id: 'quick_5',
    text: `What's on my mind right now?`,
    category: 'emotions',
  },
  {
    id: 'quick_6',
    text: 'Who do I want to connect with?',
    category: 'reflection',
  },

  // Connection (relationships and impact)
  {
    id: 'conn_1',
    text: 'Who impacted my day and how?',
    category: 'reflection',
  },
  {
    id: 'conn_2',
    text: 'How did I help someone today?',
    category: 'gratitude',
  },
  {
    id: 'conn_3',
    text: 'What do I appreciate about someone close to me?',
    category: 'gratitude',
  },
  {
    id: 'conn_4',
    text: 'What quality do I admire in someone I met today?',
    category: 'reflection',
  },

  // Self-Care (nurturing and boundaries)
  {
    id: 'care_1',
    text: 'What do I need right now?',
    category: 'self-care',
  },
  {
    id: 'care_2',
    text: 'How did I take care of myself today?',
    category: 'self-care',
  },
  {
    id: 'care_3',
    text: 'What made me feel rested today?',
    category: 'self-care',
  },
  {
    id: 'care_4',
    text: 'What boundary did I set or need to set?',
    category: 'self-care',
  },
  {
    id: 'care_5',
    text: 'What self-care habit do I want to prioritize this week?',
    category: 'self-care',
  },
  {
    id: 'care_6',
    text: 'What activity always makes me feel better?',
    category: 'self-care',
  },
  {
    id: 'care_7',
    text: 'When did I say "no" when I needed to?',
    category: 'self-care',
  },
  {
    id: 'care_8',
    text: 'What does my body need more of?',
    category: 'self-care',
  },

  // Productivity (work and focus)
  {
    id: 'prod_1',
    text: 'What are my top 3 priorities tomorrow?',
    category: 'productivity',
  },
  {
    id: 'prod_2',
    text: 'When was I most focused today?',
    category: 'productivity',
  },
  {
    id: 'prod_3',
    text: 'What distracted me today?',
    category: 'productivity',
  },
  {
    id: 'prod_4',
    text: 'What task am I avoiding and why?',
    category: 'productivity',
  },
  {
    id: 'prod_5',
    text: 'What helped me work better today?',
    category: 'productivity',
  },
  {
    id: 'prod_6',
    text: `What did I finish today that I'm proud of?`,
    category: 'productivity',
  },
  {
    id: 'prod_7',
    text: 'What time of day was I most productive?',
    category: 'productivity',
  },
  {
    id: 'prod_8',
    text: 'What can I delegate or say no to?',
    category: 'productivity',
  },

  // Personal Values (identity and purpose)
  {
    id: 'val_1',
    text: 'What matters most to me right now?',
    category: 'values',
  },
  {
    id: 'val_2',
    text: 'Did my actions today match my values?',
    category: 'values',
  },
  {
    id: 'val_3',
    text: 'What do I want to be known for?',
    category: 'values',
  },
  {
    id: 'val_4',
    text: `What quality did I show today that I'm proud of?`,
    category: 'values',
  },
  {
    id: 'val_5',
    text: 'What type of person do I want to become?',
    category: 'values',
  },
  {
    id: 'val_6',
    text: 'What value guided my decisions today?',
    category: 'values',
  },
  {
    id: 'val_7',
    text: 'What do I stand for?',
    category: 'values',
  },

  // Relationships (connection and communication)
  {
    id: 'rel_1',
    text: 'Who energizes me and why?',
    category: 'relationships',
  },
  {
    id: 'rel_2',
    text: 'What relationship do I want to strengthen?',
    category: 'relationships',
  },
  {
    id: 'rel_3',
    text: 'How did I show up for someone today?',
    category: 'relationships',
  },
  {
    id: 'rel_4',
    text: 'What do I appreciate about my closest friend?',
    category: 'relationships',
  },
  {
    id: 'rel_5',
    text: 'Who do I miss and why?',
    category: 'relationships',
  },
  {
    id: 'rel_6',
    text: 'What conversation do I need to have?',
    category: 'relationships',
  },
  {
    id: 'rel_7',
    text: 'How can I be a better friend/partner/family member?',
    category: 'relationships',
  },

  // Challenges & Problem-Solving (resilience)
  {
    id: 'chal_1',
    text: 'What problem did I solve today?',
    category: 'challenges',
  },
  {
    id: 'chal_2',
    text: `What's my biggest obstacle right now?`,
    category: 'challenges',
  },
  {
    id: 'chal_3',
    text: `What can I control vs. what can't I control?`,
    category: 'challenges',
  },
  {
    id: 'chal_4',
    text: `How did I overcome difficulty today?`,
    category: 'challenges',
  },
  {
    id: 'chal_5',
    text: `What lesson did today's challenge teach me?`,
    category: 'challenges',
  },
  {
    id: 'chal_6',
    text: `What's one small step toward solving my problem?`,
    category: 'challenges',
  },
  {
    id: 'chal_7',
    text: 'Who can I ask for help?',
    category: 'challenges',
  },

  // Moments & Memories (capturing the day)
  {
    id: 'mem_1',
    text: 'What moment do I want to remember from today?',
    category: 'moments',
  },
  {
    id: 'mem_2',
    text: 'What made today unique?',
    category: 'moments',
  },
  {
    id: 'mem_3',
    text: 'What small detail made me happy today?',
    category: 'moments',
  },
  {
    id: 'mem_4',
    text: 'What story does today tell?',
    category: 'moments',
  },
  {
    id: 'mem_5',
    text: 'What sensory detail stands out from today?',
    category: 'moments',
  },
  {
    id: 'mem_6',
    text: `What happened that I didn't expect?`,
    category: 'moments',
  },

  // Future-Focused (aspirations and planning)
  {
    id: 'fut_1',
    text: 'What am I excited about this week?',
    category: 'future',
  },
  {
    id: 'fut_2',
    text: 'Where do I want to be in 3 months?',
    category: 'future',
  },
  {
    id: 'fut_3',
    text: 'What dream am I working toward?',
    category: 'future',
  },
  {
    id: 'fut_4',
    text: 'What opportunity am I creating for myself?',
    category: 'future',
  },
  {
    id: 'fut_5',
    text: 'What do I want to learn next?',
    category: 'future',
  },
  {
    id: 'fut_6',
    text: `What's one thing I can plan for this week?`,
    category: 'future',
  },

  // Wins & Accomplishments (positive reinforcement)
  {
    id: 'win_1',
    text: 'What went well today?',
    category: 'wins',
  },
  {
    id: 'win_2',
    text: 'What am I proud of this week?',
    category: 'wins',
  },
  {
    id: 'win_3',
    text: 'What did I do today that my future self will thank me for?',
    category: 'wins',
  },
  {
    id: 'win_4',
    text: 'What compliment did I receive recently?',
    category: 'wins',
  },
  {
    id: 'win_5',
    text: 'What positive change have I made recently?',
    category: 'wins',
  },
  {
    id: 'win_6',
    text: `What's something I'm getting better at?`,
    category: 'wins',
  },

  // Evening Wind-Down (closure and processing)
  {
    id: 'eve_1',
    text: 'How would I rate today out of 10?',
    category: 'evening',
  },
  {
    id: 'eve_2',
    text: 'What am I letting go of from today?',
    category: 'evening',
  },
  {
    id: 'eve_3',
    text: 'What do I need to release before sleep?',
    category: 'evening',
  },
  {
    id: 'eve_4',
    text: 'What did today teach me about myself?',
    category: 'evening',
  },
  {
    id: 'eve_5',
    text: 'What positive thought can I end today with?',
    category: 'evening',
  },

  // Morning Intention (starting the day)
  {
    id: 'morn_1',
    text: `What's my intention for today?`,
    category: 'morning',
  },
  {
    id: 'morn_2',
    text: 'What do I want to accomplish today?',
    category: 'morning',
  },
  {
    id: 'morn_3',
    text: 'How do I want to feel by the end of today?',
    category: 'morning',
  },
  {
    id: 'morn_4',
    text: 'What am I grateful for this morning?',
    category: 'morning',
  },
  {
    id: 'morn_5',
    text: 'What word will guide my day today?',
    category: 'morning',
  },
];




/**
 * Get a random journal prompt
 */
export const getRandomPrompt = (): JournalPrompt => {
  const randomIndex = Math.floor(Math.random() * JOURNAL_PROMPTS.length);
  return JOURNAL_PROMPTS[randomIndex];
};

/**
 * Get a random prompt from a specific category
 */
export const getPromptByCategory = (
  category: JournalPrompt['category']
): JournalPrompt => {
  const filteredPrompts = JOURNAL_PROMPTS.filter((p) => p.category === category);
  const randomIndex = Math.floor(Math.random() * filteredPrompts.length);
  return filteredPrompts[randomIndex];
};

/**
 * Get a prompt that hasn't been used recently
 * @param recentlyUsedIds - Array of recently used prompt IDs
 */
export const getUniquePrompt = (recentlyUsedIds: string[] = []): JournalPrompt => {
  const availablePrompts = JOURNAL_PROMPTS.filter(
    (p) => !recentlyUsedIds.includes(p.id)
  );

  const promptPool = availablePrompts.length > 0 ? availablePrompts : JOURNAL_PROMPTS;

  const randomIndex = Math.floor(Math.random() * promptPool.length);
  return promptPool[randomIndex];
};
