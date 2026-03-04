class Tokenizer {
  static tokenize(code) {
    const tokens = []; //stores the tokens
    let current = 0;  //keeps track of your position in the input string
    const input = code; //code

    const multiWordKeywords = [
      'bhai ye hai', 'bol bhai', 'agar bhai', 'nahi to bhai',
      'bye bhai', 'jab tak bhai', 'sunao bhai', 'ke liye bhai',
      'return bhai'
    ];

    const singleKeywords = [
      'break', 'continue', 'true', 'false', 'null', 'this',
      'extends', 'static', 'class', 'struct', 'function',
      'new', 'file', 'tezi', 'return', 'async', 'await'
    ];

    while (current < input.length) {
      let char = input[current];

      // Skip whitespace
      if (/\s/.test(char)) {
        current++;
        continue;
      }

      // Handle comments
      if (char === '/' && current + 1 < input.length) {
        // Single-line comment //
        if (input[current + 1] === '/') {
          current += 2;
          while (current < input.length && input[current] !== '\n') {
            current++;
          }
          continue;
        }

        // Multi-line comment /* */
        if (input[current + 1] === '*') {
          current += 2;
          while (current < input.length - 1) {
            if (input[current] === '*' && input[current + 1] === '/') {
              current += 2;
              break;
            }
            current++;
          }
          continue;
        }
      }

      // Check for multi-word keywords FIRST
      let keywordMatched = false;
      for (const keyword of multiWordKeywords) {
        if (input.substr(current).startsWith(keyword)) {
          const afterKeyword = current + keyword.length;
          if (afterKeyword >= input.length || /[\s({]/.test(input[afterKeyword])) {
            const parts = keyword.split(' ');
            tokens.push(...parts);
            current += keyword.length;
            keywordMatched = true;
            break;
          }
        }
      }
      if (keywordMatched) continue;

      // Multi-character operators (check longer patterns first)
      if (current + 2 < input.length) {
        const threeChar = input.substr(current, 3);
        if (['<<=', '>>=', '**='].includes(threeChar)) {
          tokens.push(threeChar);
          current += 3;
          continue;
        }
      }

      if (current + 1 < input.length) {
        const twoChar = input.substr(current, 2);
        if (['==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '**', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '::'].includes(twoChar)) {
          tokens.push(twoChar);
          current += 2;
          continue;
        }
      }

      // Single character operators and delimiters
      if (['=', ';', '(', ')', '{', '}', '+', '-', '*', '/', '%', '>', '<', '!', '&', '|', '^', '~', ',', '.', '[', ']', '@', ':'].includes(char)) {
        tokens.push(char);
        current++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        let num = '';
        let hasDecimal = false;

        while (current < input.length) {
          const currentChar = input[current];
          if (/[0-9]/.test(currentChar)) {
            num += currentChar;
            current++;
          } else if (currentChar === '.' && !hasDecimal) {
            num += currentChar;
            hasDecimal = true;
            current++;
          } else {
            break;
          }
        }

        if (current < input.length && /[a-zA-Z_]/.test(input[current])) {
          throw new Error(`Invalid number format: ${num}${input[current]} at position ${current}`);
        }

        tokens.push(num);
        continue;
      }

      // Strings (both double and single quotes) with escape sequence processing
      if (char === '"' || char === "'") {
        const quote = char;
        let string = quote;
        current++;
        while (current < input.length && input[current] !== quote) {
          if (input[current] === '\\' && current + 1 < input.length) {
            // Process escape sequences
            const nextChar = input[current + 1];
            if (nextChar === 'n') {
              string += '\\n'; // Keep as \\n for now, will be processed later
            } else if (nextChar === 't') {
              string += '\\t';
            } else if (nextChar === 'r') {
              string += '\\r';
            } else if (nextChar === '\\') {
              string += '\\\\';
            } else if (nextChar === quote) {
              string += '\\' + quote;
            } else {
              string += input[current] + nextChar;
            }
            current += 2;
          } else {
            string += input[current];
            current++;
          }
        }
        if (current < input.length && input[current] === quote) {
          string += quote;
          current++;
          tokens.push(string);
        } else {
          throw new Error('Unterminated string literal');
        }
        continue;
      }

      // Identifiers and single keywords
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        while (current < input.length && /[a-zA-Z0-9_]/.test(input[current])) {
          ident += input[current];
          current++;
        }

        tokens.push(ident);
        continue;
      }

      throw new Error(`Unexpected character: ${char} at position ${current}`);
    }

    return tokens;
  }
}

module.exports = Tokenizer;