// src/utils/markdownStyles.ts
import { Dimensions } from 'react-native';
import { MD3Theme } from 'react-native-paper';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Global Markdown styles that automatically adapt to light/dark theme
 * Uses react-native-paper theme tokens for consistency
 */
export const getMarkdownStyles = (theme: MD3Theme) => ({
  // Body text
  body: {
    color: theme.colors.onBackground,
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Headings
  heading1: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: 'bold' as const,
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 34,
  },
  heading2: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginTop: 18,
    marginBottom: 10,
    lineHeight: 30,
  },
  heading3: {
    color: theme.colors.onBackground,
    fontSize: 20,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 26,
  },
  heading4: {
    color: theme.colors.onBackground,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 24,
  },
  heading5: {
    color: theme.colors.onBackground,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 6,
  },
  heading6: {
    color: theme.colors.onBackground,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 10,
    marginBottom: 4,
  },

  // Paragraph
  paragraph: {
    marginTop: 0,
    marginBottom: 12,
    lineHeight: 24,
  },

  // Lists
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  list_item: {
    marginVertical: 4,
    flexDirection: 'row' as const,
  },
  bullet_list_icon: {
    color: theme.colors.primary,
    fontSize: 16,
    marginLeft: 0,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: theme.colors.primary,
    fontSize: 16,
    marginLeft: 0,
    marginRight: 8,
  },

  // Code blocks
  code_inline: {
    backgroundColor: theme.colors.surfaceVariant,
    color: theme.colors.onSurfaceVariant,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: theme.colors.surfaceVariant,
    color: theme.colors.onSurfaceVariant,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  fence: {
    backgroundColor: theme.colors.surfaceVariant,
    color: theme.colors.onSurfaceVariant,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 14,
  },

  // Blockquote
  blockquote: {
    backgroundColor: theme.colors.elevation.level1,
    borderLeftColor: theme.colors.primary,
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    fontStyle: 'italic' as const,
  },

  // Links
  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
  },

  // Emphasis
  em: {
    fontStyle: 'italic' as const,
  },
  strong: {
    fontWeight: 'bold' as const,
    color: theme.colors.onBackground,
  },
  del: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.7,
  },

  // Horizontal rule
  hr: {
    backgroundColor: theme.colors.outlineVariant,
    height: 1,
    marginVertical: 16,
  },

  // Table (if you use tables)
  table: {
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: 8,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  tbody: {},
  th: {
    color: theme.colors.onSurface,
    fontWeight: 'bold' as const,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  td: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },

  // Images - ✅ FIXED: Use number instead of string for width
  image: {
    width: screenWidth - 32, // Full width minus padding
    height: 200, // Fixed height or use aspectRatio
    marginVertical: 8,
    borderRadius: 8,
    resizeMode: 'cover' as const,
  },

  // Text styling
  text: {
    color: theme.colors.onBackground,
  },
  textgroup: {},
  s: {
    textDecorationLine: 'line-through' as const,
  },
  
  // Preformatted text
  pre: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
});
