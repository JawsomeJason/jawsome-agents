export type Level = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Suggestion = { level: Level; probability: number; from: Level }

declare module 'claude-code' {
  interface PluginState {
    'claudecode-smart-usage': { suggestion: Suggestion | null }
  }
}
