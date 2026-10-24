export type Level = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Suggestion = { level: Level; probability: number; from: Level }

declare module 'claude-code' {
  interface PluginState {
    'smart-usage-claude': { suggestion: Suggestion | null }
  }
}
