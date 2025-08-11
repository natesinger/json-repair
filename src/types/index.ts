export interface Settings {
  live: boolean
  visualize: boolean
  tabSize: 2 | 4
}

export interface JsonParseResult {
  ok: boolean | null
  obj?: any
  error?: string
  cleaned?: string
  ms?: number
  pos?: number
  line?: number
  col?: number
  token?: string
}

export interface ErrorLocation {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
}

export interface ProcessedResult {
  input: string
  result: JsonParseResult
  timestamp: number
} 