const Parser = require('./parser');
const Tokenizer = require('./tokenizer');
const fs = require('fs');

// Patch the Parser to add debugging
const originalConsume = Parser.prototype.consume;
Parser.prototype.consume = function(expected = null) {
  const current = this.current;
  const token = this.tokens[current];
  
  // Log when we're near position 864
  if (current >= 860 && current <= 870) {
    console.log(`[consume] pos=${current}, token="${token}", expected="${expected}"`);
  }
  
  try {
    return originalConsume.call(this, expected);
  } catch (error) {
    console.log(`[ERROR at consume] pos=${current}, token="${token}", expected="${expected}"`);
    throw error;
  }
};

const originalFunctionDeclaration = Parser.prototype.functionDeclaration;
Parser.prototype.functionDeclaration = function() {
  const startPos = this.current;
  console.log(`[functionDeclaration ENTER] pos=${startPos}, next tokens: ${this.tokens.slice(startPos, startPos + 5).join(' ')}`);
  
  try {
    return originalFunctionDeclaration.call(this);
  } catch (error) {
    console.log(`[functionDeclaration ERROR] started at pos=${startPos}, now at pos=${this.current}`);
    throw error;
  }
};

// Now parse the file
const code = fs.readFileSync('examples/algo.jlp', 'utf8');
const tokens = Tokenizer.tokenize(code);
const parser = new Parser(tokens);

try {
  parser.parse();
  console.log('\n✓ Parsing successful!');
} catch (error) {
  console.log('\n✗ Parsing failed:', error.message);
}