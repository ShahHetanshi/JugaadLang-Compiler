class Parser {
  constructor(tokens) {
    this.tokens = tokens; 
    this.current = 0;
    this.loopDepth = 0;
    this.functionDepth = 0;
  }

  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      const statement = this.declaration();
      if (statement) {
        statements.push(statement);
      }
    }
    console.log(statements)
    return statements;
  }

  declaration() {
    try {
      if (this.check("class") && this.checkNext("bhai")) {
        this.advance();
        this.advance();
        return this.classDeclaration();
      }
      if (this.check("struct") && this.checkNext("bhai")) {
        this.advance();
        this.advance();
        return this.structDeclaration();
      }
      if (this.check("function") && this.checkNext("bhai")) {
        this.advance();
        this.advance();
        return this.functionDeclaration();
      }
      return this.statement();
    } catch (error) {
      // Add context to error
      const context = this.tokens.slice(Math.max(0, this.current - 3), this.current + 2).join(' ');
      throw new Error(`${error.message} (near: "${context}")`);
    }
  }

  classDeclaration() {
    const name = this.consume();
    
    let superclass = null;
    if (this.match("extends")) {
      superclass = this.consume();
    }
    
    this.consume("{");
    
    const methods = [];
    const properties = [];
    const staticMethods = [];
    
    while (!this.check("}") && !this.isAtEnd()) {
      const isStatic = this.match("static");
      
      if (this.check("function") && this.checkNext("bhai")) {
        this.advance();
        this.advance();
        const method = this.functionDeclaration();
        if (isStatic) {
          staticMethods.push(method);
        } else {
          methods.push(method);
        }
      } else if (this.match("bhai", "ye", "hai")) {
        properties.push(this.variableDeclaration());
      } else {
        throw new Error("Expected method or property declaration in class");
      }
    }
    
    this.consume("}");
    
    return {
      type: "ClassDeclaration",
      name,
      superclass,
      methods,
      properties,
      staticMethods
    };
  }

  structDeclaration() {
    const name = this.consume();
    this.consume("{");
    
    const fields = [];
    while (!this.check("}") && !this.isAtEnd()) {
      if (this.match("bhai", "ye", "hai")) {
        const field = this.variableDeclaration();
        fields.push(field);
      } else {
        throw new Error("Expected field declaration in struct");
      }
    }
    
    this.consume("}");
    
    return {
      type: "StructDeclaration",
      name,
      fields
    };
  }

  functionDeclaration() {
    this.functionDepth++;
    const name = this.consume();
    
    this.consume("(");
    const params = [];
    
    if (!this.check(")")) {
      do {
        params.push(this.consume());
      } while (this.match(","));
    }
    
    this.consume(")");
    this.consume("{");
    
    const body = this.block();
    
    this.consume("}");
    this.functionDepth--;
    
    return {
      type: "FunctionDeclaration",
      name,
      params,
      body
    };
  }

  statement() {
    if (this.match("bhai", "ye", "hai")) return this.variableDeclaration();
    if (this.match("bol", "bhai")) return this.printStatement();
    if (this.match("agar", "bhai")) return this.ifStatement();
    if (this.match("jab", "tak", "bhai")) return this.whileStatement();
    if (this.match("ke", "liye", "bhai")) return this.forStatement();
    if (this.match("sunao", "bhai")) return this.inputStatement();
    if (this.match("return", "bhai")) return this.returnStatement();
    if (this.match("bye", "bhai")) return { type: "Exit" };
    if (this.match("break")) return this.breakStatement();
    if (this.match("continue")) return this.continueStatement();
    if (this.check("file") && this.checkNext("kholo")) {
      this.advance(); this.advance();
      return this.fileOpenStatement();
    }
    if (this.check("file") && this.checkNext("likho")) {
      this.advance(); this.advance();
      return this.fileWriteStatement();
    }
    if (this.check("file") && this.checkNext("padho")) {
      this.advance(); this.advance();
      return this.fileReadStatement();
    }
    if (this.check("file") && this.checkNext("band")) {
      this.advance(); this.advance(); this.advance();
      return this.fileCloseStatement();
    }
    if (this.check("tezi") && this.checkNext("se")) {
      this.advance(); this.advance();
      return this.fastIOStatement();
    }
    
    return this.expressionStatement();
  }

  returnStatement() {
    if (this.functionDepth === 0) {
      throw new Error("'return bhai' can only be used inside a function");
    }
    
    let value = null;
    if (!this.check(";") && !this.isAtEnd()) {
      value = this.expression();
    }
    
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "Return", value };
  }

  fileOpenStatement() {
    this.consume("(");
    const filepath = this.expression();
    this.consume(",");
    const mode = this.expression();
    this.consume(")");
    const handle = this.consume();
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    
    return {
      type: "FileOpen",
      filepath,
      mode,
      handle
    };
  }

  fileWriteStatement() {
    this.consume("(");
    const handle = this.expression();
    this.consume(",");
    const content = this.expression();
    this.consume(")");
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    
    return {
      type: "FileWrite",
      handle,
      content
    };
  }

  fileReadStatement() {
    this.consume("(");
    const handle = this.expression();
    this.consume(")");
    const variable = this.consume();
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    
    return {
      type: "FileRead",
      handle,
      variable
    };
  }

  fileCloseStatement() {
    this.consume("(");
    const handle = this.expression();
    this.consume(")");
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    
    return {
      type: "FileClose",
      handle
    };
  }

  fastIOStatement() {
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "FastIO" };
  }

  expressionStatement() {
    const expr = this.expression();
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "ExpressionStatement", expression: expr };
  }

  variableDeclaration() {
    const name = this.consume();
    this.consume("=");
    const value = this.expression();
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "VariableDeclaration", name, value };
  }

  printStatement() {
    const value = this.expression();
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "Print", message: value };
  }

  inputStatement() {
    const variable = this.consume();
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "Input", variable };
  }

  ifStatement() {
    this.consume("(");
    const condition = this.expression();
    this.consume(")");
    this.consume("{");
    const thenBranch = this.block();
    this.consume("}");

    let elseBranch = null;
    if (this.match("nahi", "to", "bhai")) {
      this.consume("{");
      elseBranch = this.block();
      this.consume("}");
    }

    return { type: "If", condition, thenBranch, elseBranch };
  }

  whileStatement() {
    this.loopDepth++;
    this.consume("(");
    const condition = this.expression();
    this.consume(")");
    this.consume("{");
    const body = this.block();
    this.consume("}");
    this.loopDepth--;
    return { type: "While", condition, body };
  }

  forStatement() {
    this.loopDepth++;
    this.consume("(");
    
    let initializer = null;
    if (!this.check(";")) {
      if (this.match("bhai", "ye", "hai")) {
        initializer = this.variableDeclaration();
      } else {
        initializer = this.expressionStatement();
      }
    } else {
      this.consume(";");
    }
    
    let condition = null;
    if (!this.check(";")) {
      condition = this.expression();
    }
    this.consume(";");
    
    let increment = null;
    if (!this.check(")")) {
      increment = this.expression();
    }
    this.consume(")");
    
    this.consume("{");
    let body = this.block();
    this.consume("}");
    
    this.loopDepth--;
    
    return { 
      type: "For", 
      initializer, 
      condition, 
      increment, 
      body 
    };
  }

  breakStatement() {
    if (this.loopDepth === 0) {
      throw new Error("'break' can only be used inside a loop");
    }
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "Break" };
  }

  continueStatement() {
    if (this.loopDepth === 0) {
      throw new Error("'continue' can only be used inside a loop");
    }
    if (!this.isAtEnd() && this.check(";")) this.consume(";");
    return { type: "Continue" };
  }

  expression() {
    return this.assignment();
  }

  assignment() {
    let expr = this.logicalOr();

    if (this.match("=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", "**=")) {
      const operator = this.previous();
      const value = this.assignment();

      if (expr.type === "Variable" || expr.type === "Get" || expr.type === "Index") {
        return { type: "Assign", target: expr, operator, value };
      }

      throw new Error("Invalid assignment target.");
    }

    return expr;
  }

  logicalOr() {
    let expr = this.logicalAnd();

    while (this.match("||")) {
      const operator = this.previous();
      const right = this.logicalAnd();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  logicalAnd() {
    let expr = this.bitwiseOr();

    while (this.match("&&")) {
      const operator = this.previous();
      const right = this.bitwiseOr();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  bitwiseOr() {
    let expr = this.bitwiseXor();

    while (this.match("|")) {
      const operator = this.previous();
      const right = this.bitwiseXor();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  bitwiseXor() {
    let expr = this.bitwiseAnd();

    while (this.match("^")) {
      const operator = this.previous();
      const right = this.bitwiseAnd();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  bitwiseAnd() {
    let expr = this.equality();

    while (this.match("&")) {
      const operator = this.previous();
      const right = this.equality();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  equality() {
    let expr = this.comparison();

    while (this.match("==", "!=")) {
      const operator = this.previous();
      const right = this.comparison();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  comparison() {
    let expr = this.bitShift();

    while (this.match(">", ">=", "<", "<=")) {
      const operator = this.previous();
      const right = this.bitShift();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  bitShift() {
    let expr = this.term();

    while (this.match("<<", ">>")) {
      const operator = this.previous();
      const right = this.term();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  term() {
    let expr = this.factor();

    while (this.match("+", "-")) {
      const operator = this.previous();
      const right = this.factor();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  factor() {
    let expr = this.exponentiation();

    while (this.match("*", "/", "%")) {
      const operator = this.previous();
      const right = this.exponentiation();
      expr = { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  exponentiation() {
    let expr = this.unary();

    if (this.match("**")) {
      const operator = this.previous();
      const right = this.exponentiation();
      return { type: "Binary", left: expr, operator, right };
    }

    return expr;
  }

  unary() {
    if (this.match("!", "-", "~", "&", "*")) {
      const operator = this.previous();
      const right = this.unary();
      return { type: "Unary", operator, right };
    }

    return this.call();
  }

  call() {
    let expr = this.primary();

    while (true) {
      if (this.match("(")) {
        expr = this.finishCall(expr);
      } else if (this.match(".")) {
        const name = this.consume();
        expr = { type: "Get", object: expr, name };
      } else if (this.match("[")) {
        const index = this.expression();
        this.consume("]");
        expr = { type: "Index", object: expr, index };
      } else {
        break;
      }
    }

    return expr;
  }

  finishCall(callee) {
    const args = [];

    if (!this.check(")")) {
      do {
        args.push(this.expression());
      } while (this.match(","));
    }

    this.consume(")");

    return { type: "Call", callee, arguments: args };
  }

  primary() {
    if (this.match("true")) return { type: "Literal", value: true };
    if (this.match("false")) return { type: "Literal", value: false };
    if (this.match("null")) return { type: "Literal", value: null };
    if (this.match("this")) return { type: "This" };

    const currentToken = this.peek();
    
    if (!currentToken) {
      throw new Error("Unexpected end of input");
    }

    // New instance creation - check for "new" followed by "bhai"
    if (currentToken === "new" && this.checkNext("bhai")) {
      this.advance(); // consume 'new'
      this.advance(); // consume 'bhai'
      const className = this.consume();
      this.consume("(");
      const args = [];
      
      if (!this.check(")")) {
        do {
          args.push(this.expression());
        } while (this.match(","));
      }
      
      this.consume(")");
      return { type: "New", className, arguments: args };
    }

    // Grouping
    if (currentToken === "(") {
      this.advance();
      const expr = this.expression();
      this.consume(")");
      return { type: "Grouping", expression: expr };
    }

    // Arrays
    if (currentToken === "[") {
      this.advance();
      const elements = [];
      
      if (!this.check("]")) {
        do {
          elements.push(this.expression());
        } while (this.match(","));
      }
      
      this.consume("]");
      return { type: "Array", elements };
    }

    // Strings
    if ((currentToken.startsWith('"') && currentToken.endsWith('"')) ||
        (currentToken.startsWith("'") && currentToken.endsWith("'"))) {
      const value = this.advance().slice(1, -1);
      return { type: "Literal", value };
    }

    // Numbers
    if (/^\d+(\.\d+)?$/.test(currentToken)) {
      const value = parseFloat(this.advance());
      return { type: "Literal", value };
    }

    // Variables
    const keywords = ["bhai", "ye", "hai", "bol", "agar", "nahi", "to", "bye", "jab", "tak", 
                     "sunao", "ke", "liye", "break", "continue", "true", "false", "null",
                     "class", "struct", "function", "return", "new", "this", "extends",
                     "static", "file", "kholo", "likho", "padho", "band", "karo", "tezi", "se"];
    
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(currentToken) && !keywords.includes(currentToken)) {
      const name = this.advance();
      return { type: "Variable", name };
    }

    throw new Error(`Expected expression, found: ${currentToken}`);
  }

  block() {
    const statements = [];
    while (!this.check("}") && !this.isAtEnd()) {
      statements.push(this.declaration());
    }
    return statements;
  }

  match(...types) {
    // Special handling for multi-word keywords
    const multiWordKeywords = [
      ['bhai', 'ye', 'hai'],
      ['bol', 'bhai'],
      ['agar', 'bhai'],
      ['nahi', 'to', 'bhai'],
      ['bye', 'bhai'],
      ['jab', 'tak', 'bhai'],
      ['sunao', 'bhai'],
      ['ke', 'liye', 'bhai'],
      ['return', 'bhai']
    ];
    
    // Check if the provided types match any multi-word keyword
    let isMultiWord = false;
    if (types.length > 1) {
      for (const keyword of multiWordKeywords) {
        if (keyword.length === types.length) {
          let matches = true;
          for (let i = 0; i < keyword.length; i++) {
            if (keyword[i] !== types[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            isMultiWord = true;
            break;
          }
        }
      }
    }
    
    // If it's a multi-word keyword, match as a sequence
    if (isMultiWord) {
      for (let i = 0; i < types.length; i++) {
        if (this.current + i >= this.tokens.length || this.tokens[this.current + i] !== types[i]) {
          return false;
        }
      }
      
      for (let i = 0; i < types.length; i++) {
        this.advance();
      }
      return true;
    }
    
    // Otherwise, match any single token from the list
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    
    return false;
  }

  check(token) {
    if (this.isAtEnd()) return false;
    return this.tokens[this.current] === token;
  }

  checkNext(token) {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1] === token;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  consume(expected = null) {
    if (this.isAtEnd()) {
      throw new Error(`Unexpected end of input. Expected: ${expected}`);
    }

    const token = this.tokens[this.current];
    
    if (expected !== null && token !== expected) {
      throw new Error(`Expected "${expected}", but found "${token}" at position ${this.current}`);
    }
    
    this.current++;
    return token;
  }

  peek() {
    return this.isAtEnd() ? null : this.tokens[this.current];
  }

  isAtEnd() {
    return this.current >= this.tokens.length;
  }

  synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous() === ";") return;

      const next = this.peek();
      if (["bhai", "bol", "agar", "jab", "sunao", "bye", "ke", "break", 
           "continue", "class", "struct", "function", "return"].includes(next)) {
        return;
      }

      this.advance();
    }
  }
}

module.exports = Parser;