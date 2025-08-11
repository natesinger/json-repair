export function repairJson(text: string): string {
  if (!text) return ''
  
  // Pre-compile regex patterns for better performance
  const commentPatterns = [
    /\/\*[\s\S]*?\*\//g,           // Block comments
    /(^|[^:])\/\/.*$/gm,           // Line comments (not URLs)
    /#.*$/gm,                       // Hash comments
    /;.*$/gm,                       // Semicolon comments
    /^\s*[\r\n]/gm                  // Empty lines after comment removal
  ]
  
  let s = text
  
  // Apply all comment removal patterns efficiently
  commentPatterns.forEach(pattern => {
    s = s.replace(pattern, '')
  })

  // 2. Quote unquoted keys and values - optimized patterns
  // Only quote values that are NOT already quoted
  const unquotedPatterns = [
    [/([,{]\s*)([A-Za-z_][\w-]*)(\s*:)/g, '$1"$2"$3'],           // Object keys
    [/(:\s*)(?!")([A-Za-z_][\w-]*)(\s*[,}])/g, '$1"$2"$3'],      // String values before commas/braces (not already quoted)
    [/(:\s*)(?!")([A-Za-z_][\w-]*)(\s*$)/gm, '$1"$2"'],          // String values at end (not already quoted)
    [/([\[,]\s*)(?!")([A-Za-z_][\w-]*)(\s*[,}\]])/g, '$1"$2"$3'], // Array items (not already quoted)
    [/([\[,]\s*)(?!")([A-Za-z_][\w-]*)(\s*$)/gm, '$1"$2"']       // Array items at end (not already quoted)
  ]
  
  // First, check if the input is already valid JSON to avoid unnecessary processing
  try {
    JSON.parse(text)
    // If it's already valid JSON, return it unchanged
    return text
  } catch {
    // Not valid JSON, proceed with repair
  }
  
  unquotedPatterns.forEach(([pattern, replacement]) => {
    s = s.replace(pattern as RegExp, replacement as string)
  })
  
  // 3. Convert single → double quotes
  // Use a more robust approach that correctly handles escaped characters
  let pos = 0
  while (pos < s.length) {
    const quotePos = s.indexOf("'", pos)
    if (quotePos === -1) break
    
    // Find the closing quote, accounting for escaped quotes
    let endPos = quotePos + 1
    while (endPos < s.length) {
      if (s[endPos] === "'" && s[endPos - 1] !== "\\") {
        break
      }
      endPos++
    }
    
    if (endPos < s.length) {
      const inner = s.slice(quotePos + 1, endPos)
      const escaped = inner
        .replace(/\\\\/g, '\\\\')  // Preserve double backslashes
        .replace(/\\'/g, "'")      // Convert escaped single quotes to regular single quotes
        .replace(/"/g, '\\"')      // Escape any double quotes
      const replacement = '"' + escaped + '"'
      s = s.slice(0, quotePos) + replacement + s.slice(endPos + 1)
      pos = quotePos + replacement.length
    } else {
      pos = quotePos + 1
    }
  }

  // 4. Replace True/False/None → true/false/null - optimized
  const booleanPatterns = [
    [/\bTrue\b/g, 'true'],
    [/\bFalse\b/g, 'false'],
    [/\bNone\b/g, 'null']
  ]
  
  booleanPatterns.forEach(([pattern, replacement]) => {
    s = s.replace(pattern as RegExp, replacement as string)
  })

      // 5. Replace invalid values with null FIRST - before numeric fixes
  s = s.replace(/-Infinity/g, 'null')  // Handle -Infinity FIRST (before Infinity)
  s = s.replace(/\bNaN\b/g, 'null')
  s = s.replace(/\bInfinity\b/g, 'null')
  s = s.replace(/\bundefined\b/g, 'null')
  s = s.replace(/\b0x[0-9a-fA-F]+\b/g, 'null')
  s = s.replace(/\b0b[01]+\b/g, 'null')
  s = s.replace(/\b0o[0-7]+\b/g, 'null')
  
  // 6. Simple, targeted numeric fixes - one pattern at a time
  
  // Fix leading zeros: "01" -> "1" (only after colons)
  s = s.replace(/(:\s*)0([1-9]\d*)/g, '$1$2')
  
  // Fix leading decimals: ".5" -> "0.5" (only after colons)
  s = s.replace(/(:\s*)\.(\d+)/g, '$10.$2')
  
  // Fix trailing decimals: "5." -> "5.0" (before commas/braces)
  s = s.replace(/(\d+)\.(?=\s*[,}\]])/g, '$1.0')
  
  // Fix incomplete scientific notation: "1e" -> "1" (before commas/braces)
  s = s.replace(/(\d+)e(?=\s*[,}\]])/g, '$1')
  s = s.replace(/(\d+)E(?=\s*[,}\]])/g, '$1')
  
  // 7. Clean up any quoted nulls that might have been created
  s = s.replace(/"null"/g, 'null')
  
  // 8. Remove trailing commas and clean up invalid patterns - optimized
  const commaCleanupPatterns = [
    [/,\s*([}\]])/g, '$1'],                                    // Remove trailing commas in objects/arrays
    [/,\s*[=;]/g, ''],                                          // Remove trailing commas followed by invalid characters
    [/,\s*$/, '']                                               // Trim dangling commas at end of input
  ]
  
  commaCleanupPatterns.forEach(([pattern, replacement]) => {
    s = s.replace(pattern as RegExp, replacement as string)
  })
  
    // 9. Fix missing commas between objects/properties - optimized
  const missingCommaPatterns = [
    [/(\s*)\]\s*(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:)/g, '$1],$2'],  // "] property:"
    [/(\s*)\}\s*(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:)/g, '$1},$2'],  // "} property:"
    [/(\s*)\]\s*(\s*\{)/g, '$1],$2'],                           // "] {"
    [/(\s*)\}\s*(\s*\[)/g, '$1},$2']                            // "} ["
  ]
  
  missingCommaPatterns.forEach(([pattern, replacement]) => {
    s = s.replace(pattern as RegExp, replacement as string)
  })

  // Normalize Unicode quotes → straight quotes
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')

  // Remove BOM
  s = s.replace(/^\uFEFF/, '')
  
  return s.trim()
}

/**
 * Detect JSON errors in the original text before any repairs
 * This provides more accurate error positioning
 */
export function detectOriginalJsonErrors(text: string): {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
  error: string | null
} | null {
  if (!text) return null
  
  // First, try to parse the original text to see what error we get
  try {
    JSON.parse(text)
    return null // No errors found
  } catch (e: any) {
    const errorMsg = e.message || 'Unknown error'
    
    // Look for structural patterns that commonly cause JSON errors
    const lines = text.split('\n')
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]
      const trimmed = line.trim()
      
      // Skip empty lines and comment lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue
      
      // Check for double commas (like "value,,") - this is a structural issue
      const doubleCommaMatch = line.match(/([^,]),,/)
      if (doubleCommaMatch) {
        const pos = lines.slice(0, lineNum).join('\n').length + line.indexOf(',,') + 1
        return {
          pos,
          line: lineNum + 1,
          col: line.indexOf(',,') + 2,
          token: ',',
          error: 'Unexpected comma - remove duplicate comma'
        }
      }
      
      // Check for trailing commas that can't be auto-fixed
      // Only flag if there's a trailing comma followed by a closing bracket/brace on the same line
      const trailingCommaSameLine = line.match(/,\s*([}\]])/)
      if (trailingCommaSameLine) {
        const pos = lines.slice(0, lineNum).join('\n').length + line.indexOf(',')
        return {
          pos,
          line: lineNum + 1,
          col: line.indexOf(',') + 1,
          token: ',',
          error: 'Unexpected comma - remove trailing comma'
        }
      }
      
      // Check for missing commas between properties (structural issue)
      // Look for patterns like "} property:" or "] property:" where a comma is missing
      const missingCommaAfterBrace = line.match(/(\s*)\}(\s*)$/)
      if (missingCommaAfterBrace) {
        const nextLine = lines[lineNum + 1]
        if (nextLine && nextLine.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          return {
            pos,
            line: lineNum + 1,
            col: line.length + 1,
            token: ',',
            error: 'Missing comma - add comma after closing brace'
          }
        }
      }
      
      // Check for missing commas after closing brackets
      const missingCommaAfterBracket = line.match(/(\s*)\]\s*$/)
      if (missingCommaAfterBracket) {
        const nextLine = lines[lineNum + 1]
        if (nextLine && nextLine.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          return {
            pos,
            line: lineNum + 1,
            col: line.length + 1,
            token: ',',
            error: 'Missing comma - add comma after closing bracket'
          }
        }
      }
      
      // Check for missing commas after values followed by properties
      const missingCommaAfterValue = line.match(/(\s*)([a-zA-Z0-9_]+|"[^"]*"|'[^']*'|true|false|null|None|True|False)\s*$/)
      if (missingCommaAfterValue) {
        const nextLine = lines[lineNum + 1]
        if (nextLine && nextLine.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/)) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          return {
            pos,
            line: lineNum + 1,
            col: line.length + 1,
            token: ',',
            error: 'Missing comma - add comma after value'
          }
        }
      }
      
      // Check for structural bracket/brace mismatches
      // Look for lines that end with an opening bracket/brace but don't have a corresponding closing one
      const openingBracket = line.match(/(\s*)\{\s*$/)
      if (openingBracket) {
        // Count opening vs closing braces from this line forward
        let braceCount = 1
        for (let i = lineNum + 1; i < lines.length; i++) {
          const futureLine = lines[i]
          braceCount += (futureLine.match(/\{/g) || []).length
          braceCount -= (futureLine.match(/\}/g) || []).length
          if (braceCount === 0) break
        }
        if (braceCount > 0) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          return {
            pos,
            line: lineNum + 1,
            col: line.length,
            token: '{',
            error: 'Missing closing brace - check bracket balance'
          }
        }
      }
      
      const openingSquareBracket = line.match(/(\s*)\[\s*$/)
      if (openingSquareBracket) {
        // Count opening vs closing brackets from this line forward
        let bracketCount = 1
        for (let i = lineNum + 1; i < lines.length; i++) {
          const futureLine = lines[i]
          bracketCount += (futureLine.match(/\[/g) || []).length
          bracketCount -= (futureLine.match(/\]/g) || []).length
          if (bracketCount === 0) break
        }
        if (bracketCount > 0) {
          const pos = lines.slice(0, lineNum).join('\n').length + line.length
          return {
            pos,
            line: lineNum + 1,
            col: line.length,
            token: '[',
            error: 'Missing closing bracket - check bracket balance'
          }
        }
      }
    }
    
    // If no specific structural pattern found, try to locate the error using the original error message
    // but only if it's a structural error (not a syntax error that can be auto-fixed)
    if (errorMsg.includes('Unexpected token') || errorMsg.includes('Unexpected end') || 
        errorMsg.includes('Unexpected number') || errorMsg.includes('Unexpected string')) {
      const fallbackResult = locateJsonError(errorMsg, text)
      
      // Only return error info if we can reliably locate the position
      if (fallbackResult.pos !== null && fallbackResult.line !== null && fallbackResult.col !== null) {
        return {
          pos: fallbackResult.pos,
          line: fallbackResult.line,
          col: fallbackResult.col,
          token: fallbackResult.token,
          error: errorMsg
        }
      }
      
      // If we can't locate the position reliably, just return the error message without position info
      // This prevents showing misleading error markers
      return {
        pos: null,
        line: null,
        col: null,
        token: null,
        error: errorMsg
      }
    }
    
    // For other types of errors, let the repair function handle them
    return null
  }
}

export function locateJsonError(msg: string, text: string): {
  pos: number | null
  line: number | null
  col: number | null
  token: string | null
} {
  // Try multiple regex patterns to find error position
  const patterns = [
    /at position (\d+)/,
    /position (\d+)/,
    /Unexpected token '([^']+)' at position (\d+)/,
    /Unexpected end of JSON input at position (\d+)/,
    /Unexpected number at position (\d+)/,
    /Unexpected string at position (\d+)/,
    /Unexpected token ([^ ]+) at position (\d+)/,
    /Unexpected token '([^']+)' at position (\d+)/,
    /Unexpected token ([^ ]+) at position (\d+)/
  ]
  
  let pos = null
  let token = null
  
  for (const pattern of patterns) {
    const match = pattern.exec(msg || '')
    if (match) {
      if (match[2]) {
        // Pattern with token and position
        token = match[1]
        pos = parseInt(match[2], 10)
      } else if (match[1]) {
        // Pattern with just position
        pos = parseInt(match[1], 10)
      }
      break
    }
  }
  
  if (pos == null || isNaN(pos)) {
    // No position found - don't show misleading markers
    // Return null to indicate we can't reliably locate the error
    return { pos: null, line: null, col: null, token: null }
  }
  
  // Validate position is within text bounds
  pos = Math.max(0, Math.min(text.length - 1, pos))
  
  // Use a simple, reliable line/column calculation
  const lines = text.split('\n')
  let currentPos = 0
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length
    
    if (currentPos + lineLength >= pos) {
      const line = i + 1
      const col = pos - currentPos + 1
      
      // Validate that the calculated position makes sense
      if (col > 0 && col <= lineLength + 1) {
        return { pos, line, col, token }
      } else {
        // Invalid column calculation - don't show misleading markers
        return { pos: null, line: null, col: null, token: null }
      }
    }
    currentPos += lineLength + 1 // +1 for newline
  }
  
  // Fallback if we somehow didn't find the line - don't show misleading markers
  return { pos: null, line: null, col: null, token: null }
}

/**
 * Calculate the visual line number that accounts for line wrapping
 * @param text The full text content
 * @param logicalLine The logical line number (1-based)
 * @param containerWidth The width of the container in pixels
 * @param charWidth Approximate width of a character in pixels
 * @returns The visual line number (1-based) that accounts for wrapping
 */
export function getVisualLineNumber(text: string, logicalLine: number, containerWidth: number = 800, charWidth: number = 8): number {
  if (logicalLine <= 0) return 1
  
  const lines = text.split('\n')
  if (logicalLine > lines.length) return logicalLine
  
  let visualLine = 1
  
  // Count visual lines for all lines up to the target logical line
  for (let i = 0; i < logicalLine; i++) {
    const line = lines[i]
    if (line) {
      // Calculate how many visual lines this logical line takes
      const lineWidth = line.length * charWidth
      const visualLinesForThisLine = Math.ceil(lineWidth / containerWidth)
      visualLine += visualLinesForThisLine - 1 // -1 because we already counted this line
    }
  }
  
  return visualLine
}

export function getErrorSuggestion(error: string, _line?: number, _col?: number): string {
  if (!error) return ''
  
  const errorLower = error.toLowerCase()
  
  // Check for structural error patterns first
  if (errorLower.includes('duplicate comma') || errorLower.includes('unexpected comma')) {
    return 'Remove the duplicate or trailing comma'
  }
  
  if (errorLower.includes('missing comma')) {
    if (errorLower.includes('after closing brace')) {
      return 'Add a comma after the closing brace } before the next property'
    }
    if (errorLower.includes('after closing bracket')) {
      return 'Add a comma after the closing bracket ] before the next property'
    }
    if (errorLower.includes('after value')) {
      return 'Add a comma after the value before the next property'
    }
    return 'Add a comma to separate properties or array items'
  }
  
  if (errorLower.includes('missing closing brace')) {
    return 'Check that all opening braces { have matching closing braces }'
  }
  
  if (errorLower.includes('missing closing bracket')) {
    return 'Check that all opening brackets [ have matching closing brackets ]'
  }
  
  if (errorLower.includes('bracket balance')) {
    return 'Check that opening and closing brackets/braces are properly balanced'
  }
  
  // Fallback to general structural suggestions
  if (errorLower.includes('unexpected token')) {
    if (errorLower.includes("'")) {
      return 'Check for missing quotes around strings or keys'
    }
    return 'Check for missing commas, brackets, or quotes'
  }
  
  if (errorLower.includes('unexpected end')) {
    return 'Check for missing closing brackets, braces, or quotes'
  }
  
  if (errorLower.includes('unexpected number')) {
    return 'Check for invalid number format or missing quotes'
  }
  
  if (errorLower.includes('unexpected string')) {
    return 'Check for missing quotes or invalid string format'
  }
  
  if (errorLower.includes('duplicate key')) {
    return 'Remove duplicate object keys'
  }
  
  // Check for specific invalid characters
  if (errorLower.includes('=')) {
    return 'Remove the "=" character - it\'s not valid in JSON'
  }
  
  if (errorLower.includes(';')) {
    return 'Remove the ";" character - it\'s not valid in JSON'
  }
  
  if (errorLower.includes('<') || errorLower.includes('>')) {
    return 'Remove the "<" or ">" characters - they\'re not valid in JSON'
  }
  
  return 'Check the syntax around the highlighted position'
} 