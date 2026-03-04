const readline = require('readline');
const fs = require('fs');

class BreakException extends Error {
  constructor() {
    super('Break');
    this.name = 'BreakException';
  }
}

class ContinueException extends Error {
  constructor() {
    super('Continue');
    this.name = 'ContinueException';
  }
}

class ReturnException extends Error {
  constructor(value) {
    super('Return');
    this.name = 'ReturnException';
    this.value = value;
  }
}

class JugaadClass {
  constructor(name, superclass, methods, properties, staticMethods) {
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
    this.properties = properties;
    this.staticMethods = staticMethods;
  }

  instantiate(interpreter, args) {
    const instance = new JugaadInstance(this);
    
    // Initialize properties
    for (const prop of this.properties) {
      const value = interpreter.evaluate(prop.value);
      instance.fields[prop.name] = value;
    }

    // Call constructor if exists
    const constructor = this.methods.find(m => m.name === 'constructor');
    if (constructor) {
      interpreter.executeFunctionSync(constructor, args, instance);
    }

    return instance;
  }
}

class JugaadInstance {
  constructor(klass) {
    this.klass = klass;
    this.fields = {};
  }

  get(name) {
    if (name in this.fields) {
      return this.fields[name];
    }

    const method = this.klass.methods.find(m => m.name === name);
    if (method) {
      return method;
    }

    throw new Error(`Undefined property: ${name}`);
  }

  set(name, value) {
    this.fields[name] = value;
  }
}

class JugaadStruct {
  constructor(name, fields) {
    this.name = name;
    this.fields = fields;
  }

  instantiate(interpreter, args) {
    const instance = {};
    
    for (let i = 0; i < this.fields.length; i++) {
      const field = this.fields[i];
      instance[field.name] = args[i] !== undefined ? args[i] : interpreter.evaluate(field.value);
    }

    return instance;
  }
}

class Interpreter {
  constructor() {
    this.variables = {};
    this.classes = {};
    this.structs = {};
    this.functions = {};
    this.fileHandles = {};
    this.fastIO = false;
    this.handleCounter = 0;
  }

  async interpret(statements) {
    for (const statement of statements) {
      await this.execute(statement);
    }
  }

  async execute(statement) {
    switch (statement.type) {
      case "ClassDeclaration":
        this.executeClassDeclaration(statement);
        break;
      case "StructDeclaration":
        this.executeStructDeclaration(statement);
        break;
      case "FunctionDeclaration":
        this.executeFunctionDeclaration(statement);
        break;
      case "VariableDeclaration":
        this.executeVariableDeclaration(statement);
        break;
      case "Print":
        await this.executePrint(statement);
        break;
      case "Input":
        await this.executeInput(statement);
        break;
      case "If":
        await this.executeIf(statement);
        break;
      case "While":
        await this.executeWhile(statement);
        break;
      case "For":
        await this.executeFor(statement);
        break;
      case "Break":
        throw new BreakException();
      case "Continue":
        throw new ContinueException();
      case "Return":
        throw new ReturnException(statement.value ? this.evaluate(statement.value) : null);
      case "FileOpen":
        this.executeFileOpen(statement);
        break;
      case "FileWrite":
        this.executeFileWrite(statement);
        break;
      case "FileRead":
        this.executeFileRead(statement);
        break;
      case "FileClose":
        this.executeFileClose(statement);
        break;
      case "FastIO":
        this.fastIO = true;
        break;
      case "ExpressionStatement":
        this.evaluate(statement.expression);
        break;
      case "Exit":
        console.log("Bye bhai!");
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown statement type: ${statement.type}`);
    }
  }

  executeClassDeclaration(statement) {
    const klass = new JugaadClass(
      statement.name,
      statement.superclass,
      statement.methods,
      statement.properties,
      statement.staticMethods
    );
    this.classes[statement.name] = klass;
  }

  executeStructDeclaration(statement) {
    const struct = new JugaadStruct(statement.name, statement.fields);
    this.structs[statement.name] = struct;
  }

  executeFunctionDeclaration(statement) {
    this.functions[statement.name] = statement;
  }

  executeVariableDeclaration(statement) {
    const value = this.evaluate(statement.value);
    this.variables[statement.name] = value;
  }

  async executePrint(statement) {
    const value = this.evaluate(statement.message);
    
    if (this.fastIO) {
      // Fast I/O: no flushing, direct write
      process.stdout.write(String(value) + '\n');
    } else {
      console.log(value);
    }
  }

  async executeInput(statement) {
    if (this.fastIO) {
      // Fast I/O: read entire line without prompt
      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false
        });

        rl.once('line', (line) => {
          const parsedValue = line.trim();
          const value = isNaN(parsedValue) || parsedValue === '' ? parsedValue : parseFloat(parsedValue);
          this.variables[statement.variable] = value;
          rl.close();
          resolve();
        });
      });
    } else {
      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question(`Enter value for ${statement.variable}: `, (answer) => {
          const parsedValue = answer.trim();
          const value = isNaN(parsedValue) || parsedValue === '' ? parsedValue : parseFloat(parsedValue);
          this.variables[statement.variable] = value;
          rl.close();
          resolve();
        });
      });
    }
  }

  async executeIf(statement) {
    const condition = this.evaluate(statement.condition);
    if (this.isTruthy(condition)) {
      await this.interpret(statement.thenBranch);
    } else if (statement.elseBranch) {
      await this.interpret(statement.elseBranch);
    }
  }

  async executeWhile(statement) {
    try {
      while (this.isTruthy(this.evaluate(statement.condition))) {
        try {
          await this.interpret(statement.body);
        } catch (e) {
          if (e instanceof BreakException) {
            break;
          } else if (e instanceof ContinueException) {
            continue;
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      if (!(e instanceof BreakException) && !(e instanceof ContinueException)) {
        throw e;
      }
    }
  }

  async executeFor(statement) {
    if (statement.initializer) {
      await this.execute(statement.initializer);
    }

    const condition = statement.condition || { type: "Literal", value: true };

    try {
      while (this.isTruthy(this.evaluate(condition))) {
        try {
          await this.interpret(statement.body);
          
          if (statement.increment) {
            this.evaluate(statement.increment);
          }
        } catch (e) {
          if (e instanceof BreakException) {
            break;
          } else if (e instanceof ContinueException) {
            if (statement.increment) {
              this.evaluate(statement.increment);
            }
            continue;
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      if (!(e instanceof BreakException) && !(e instanceof ContinueException)) {
        throw e;
      }
    }
  }

  executeFileOpen(statement) {
    const filepath = this.evaluate(statement.filepath);
    const mode = this.evaluate(statement.mode);
    
    try {
      let fileDescriptor;
      
      if (mode === 'r' || mode === 'read') {
        if (!fs.existsSync(filepath)) {
          throw new Error(`File not found: ${filepath}`);
        }
        fileDescriptor = { path: filepath, mode: 'r' };
      } else if (mode === 'w' || mode === 'write') {
        fileDescriptor = { path: filepath, mode: 'w', content: '' };
      } else if (mode === 'a' || mode === 'append') {
        fileDescriptor = { path: filepath, mode: 'a', content: '' };
      } else {
        throw new Error(`Invalid file mode: ${mode}`);
      }
      
      const handleId = `handle_${this.handleCounter++}`;
      this.fileHandles[handleId] = fileDescriptor;
      this.variables[statement.handle] = handleId;
    } catch (error) {
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  executeFileWrite(statement) {
    const handleId = this.evaluate(statement.handle);
    const content = this.evaluate(statement.content);
    
    const fileDescriptor = this.fileHandles[handleId];
    if (!fileDescriptor) {
      throw new Error(`Invalid file handle: ${handleId}`);
    }
    
    if (fileDescriptor.mode === 'r') {
      throw new Error('Cannot write to file opened in read mode');
    }
    
    try {
      if (fileDescriptor.mode === 'w') {
        fs.writeFileSync(fileDescriptor.path, String(content));
      } else if (fileDescriptor.mode === 'a') {
        fs.appendFileSync(fileDescriptor.path, String(content));
      }
    } catch (error) {
      throw new Error(`File write failed: ${error.message}`);
    }
  }

  executeFileRead(statement) {
    const handleId = this.evaluate(statement.handle);
    
    const fileDescriptor = this.fileHandles[handleId];
    if (!fileDescriptor) {
      throw new Error(`Invalid file handle: ${handleId}`);
    }
    
    if (fileDescriptor.mode !== 'r') {
      throw new Error('Cannot read from file not opened in read mode');
    }
    
    try {
      const content = fs.readFileSync(fileDescriptor.path, 'utf8');
      this.variables[statement.variable] = content;
    } catch (error) {
      throw new Error(`File read failed: ${error.message}`);
    }
  }

  executeFileClose(statement) {
    const handleId = this.evaluate(statement.handle);
    
    if (!this.fileHandles[handleId]) {
      throw new Error(`Invalid file handle: ${handleId}`);
    }
    
    delete this.fileHandles[handleId];
  }

  async executeFunction(funcDecl, args, thisContext = null) {
    const oldVars = { ...this.variables };
    
    if (thisContext) {
      this.variables['this'] = thisContext;
    }
    
    for (let i = 0; i < funcDecl.params.length; i++) {
      this.variables[funcDecl.params[i]] = args[i];
    }
    
    try {
      await this.interpret(funcDecl.body);
      this.variables = oldVars;
      return null;
    } catch (e) {
      if (e instanceof ReturnException) {
        this.variables = oldVars;
        return e.value;
      }
      this.variables = oldVars;
      throw e;
    }
  }

  executeFunctionSync(funcDecl, args, thisContext = null) {
    // Save only parameters that might be shadowed
    const paramNames = funcDecl.params || [];
    const savedVars = {};
    
    // Save any existing variables with the same names as parameters
    for (const param of paramNames) {
      if (param in this.variables) {
        savedVars[param] = this.variables[param];
      }
    }
    
    // Set up 'this' context if provided
    let savedThis = null;
    if (thisContext) {
      if ('this' in this.variables) {
        savedThis = this.variables['this'];
      }
      this.variables['this'] = thisContext;
    }
    
    // Set up parameters
    for (let i = 0; i < paramNames.length; i++) {
      this.variables[paramNames[i]] = args[i];
    }
    
    try {
      // Execute function body synchronously
      this.interpretSync(funcDecl.body);
      
      // Restore saved parameter values
      for (const param of paramNames) {
        if (param in savedVars) {
          this.variables[param] = savedVars[param];
        } else {
          delete this.variables[param];
        }
      }
      
      // Restore 'this' context
      if (thisContext) {
        if (savedThis !== null) {
          this.variables['this'] = savedThis;
        } else {
          delete this.variables['this'];
        }
      }
      
      return null;
    } catch (e) {
      if (e instanceof ReturnException) {
        // Restore saved parameter values
        for (const param of paramNames) {
          if (param in savedVars) {
            this.variables[param] = savedVars[param];
          } else {
            delete this.variables[param];
          }
        }
        
        // Restore 'this' context
        if (thisContext) {
          if (savedThis !== null) {
            this.variables['this'] = savedThis;
          } else {
            delete this.variables['this'];
          }
        }
        
        return e.value;
      }
      
      // On any other error, still restore variables
      for (const param of paramNames) {
        if (param in savedVars) {
          this.variables[param] = savedVars[param];
        } else {
          delete this.variables[param];
        }
      }
      
      if (thisContext) {
        if (savedThis !== null) {
          this.variables['this'] = savedThis;
        } else {
          delete this.variables['this'];
        }
      }
      
      throw e;
    }
  }

  interpretSync(statements) {
    for (const statement of statements) {
      this.executeSync(statement);
    }
  }

  executeSync(statement) {
    switch (statement.type) {
      case "VariableDeclaration":
        this.executeVariableDeclaration(statement);
        break;
      case "Print":
        const value = this.evaluate(statement.message);
        if (this.fastIO) {
          process.stdout.write(String(value) + '\n');
        } else {
          console.log(value);
        }
        break;
      case "If":
        this.executeSyncIf(statement);
        break;
      case "While":
        this.executeSyncWhile(statement);
        break;
      case "For":
        this.executeSyncFor(statement);
        break;
      case "Break":
        throw new BreakException();
      case "Continue":
        throw new ContinueException();
      case "Return":
        throw new ReturnException(statement.value ? this.evaluate(statement.value) : null);
      case "ExpressionStatement":
        this.evaluate(statement.expression);
        break;
      default:
        throw new Error(`Unsupported statement type in function: ${statement.type}`);
    }
  }

  executeSyncIf(statement) {
    const condition = this.evaluate(statement.condition);
    if (this.isTruthy(condition)) {
      this.interpretSync(statement.thenBranch);
    } else if (statement.elseBranch) {
      this.interpretSync(statement.elseBranch);
    }
  }

  executeSyncWhile(statement) {
    try {
      while (this.isTruthy(this.evaluate(statement.condition))) {
        try {
          this.interpretSync(statement.body);
        } catch (e) {
          if (e instanceof BreakException) {
            break;
          } else if (e instanceof ContinueException) {
            continue;
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      if (!(e instanceof BreakException) && !(e instanceof ContinueException)) {
        throw e;
      }
    }
  }

  executeSyncFor(statement) {
    if (statement.initializer) {
      this.executeSync(statement.initializer);
    }

    const condition = statement.condition || { type: "Literal", value: true };

    try {
      while (this.isTruthy(this.evaluate(condition))) {
        try {
          this.interpretSync(statement.body);
          
          if (statement.increment) {
            this.evaluate(statement.increment);
          }
        } catch (e) {
          if (e instanceof BreakException) {
            break;
          } else if (e instanceof ContinueException) {
            if (statement.increment) {
              this.evaluate(statement.increment);
            }
            continue;
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      if (!(e instanceof BreakException) && !(e instanceof ContinueException)) {
        throw e;
      }
    }
  }

  evaluate(expr) {
    switch (expr.type) {
      case "Literal":
        // Process escape sequences in strings
        if (typeof expr.value === 'string') {
          return expr.value
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\');
        }
        return expr.value;
      case "Variable":
        // Check variables first
        if (expr.name in this.variables) {
          return this.variables[expr.name];
        }
        // Then check if it's a class reference
        if (expr.name in this.classes) {
          return this.classes[expr.name];
        }
        // Then check if it's a struct reference
        if (expr.name in this.structs) {
          return this.structs[expr.name];
        }
        // Then check if it's a function reference
        if (expr.name in this.functions) {
          return this.functions[expr.name];
        }
        throw new Error(`Undefined variable: ${expr.name}`);
      case "This":
        if (!('this' in this.variables)) {
          throw new Error("'this' can only be used inside a class method");
        }
        return this.variables['this'];
      case "Assign":
        return this.evaluateAssign(expr);
      case "Binary":
        return this.evaluateBinary(expr);
      case "Unary":
        return this.evaluateUnary(expr);
      case "Grouping":
        return this.evaluate(expr.expression);
      case "Call":
        return this.evaluateCall(expr);
      case "Get":
        return this.evaluateGet(expr);
      case "New":
        return this.evaluateNew(expr);
      case "Array":
        return this.evaluateArray(expr);
      case "Index":
        return this.evaluateIndex(expr);
      default:
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
  }

  evaluateAssign(expr) {
    const value = this.evaluate(expr.value);
    
    if (expr.target.type === "Variable") {
      const name = expr.target.name;
      
      if (expr.operator === "=") {
        this.variables[name] = value;
      } else {
        if (!(name in this.variables)) {
          throw new Error(`Undefined variable: ${name}`);
        }
        
        const currentValue = this.variables[name];
        this.variables[name] = this.applyCompoundOp(currentValue, expr.operator, value);
      }
      
      return this.variables[name];
    } else if (expr.target.type === "Get") {
      const object = this.evaluate(expr.target.object);
      
      if (object instanceof JugaadInstance) {
        object.set(expr.target.name, value);
        return value;
      } else if (typeof object === 'object') {
        object[expr.target.name] = value;
        return value;
      }
      
      throw new Error("Can only set properties on objects");
    } else if (expr.target.type === "Index") {
      const object = this.evaluate(expr.target.object);
      const index = this.evaluate(expr.target.index);
      
      if (Array.isArray(object) || typeof object === 'object') {
        object[index] = value;
        return value;
      }
      
      throw new Error("Can only index arrays and objects");
    }
    
    throw new Error("Invalid assignment target");
  }

  applyCompoundOp(left, operator, right) {
    switch (operator) {
      case "+=": return left + right;
      case "-=": return left - right;
      case "*=": return left * right;
      case "/=": 
        if (right === 0) throw new Error("Division by zero");
        return left / right;
      case "%=": 
        if (right === 0) throw new Error("Modulo by zero");
        return left % right;
      case "&=": return this.toInt(left) & this.toInt(right);
      case "|=": return this.toInt(left) | this.toInt(right);
      case "^=": return this.toInt(left) ^ this.toInt(right);
      case "<<=": return this.toInt(left) << this.toInt(right);
      case ">>=": return this.toInt(left) >> this.toInt(right);
      case "**=": return Math.pow(left, right);
      default: throw new Error(`Unknown assignment operator: ${operator}`);
    }
  }

  evaluateBinary(expr) {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    if (expr.operator === "+" && (typeof left === "string" || typeof right === "string")) {
      return String(left) + String(right);
    }

    if (["+", "-", "*", "/", "%", "**"].includes(expr.operator)) {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new Error(`Operands must be numbers for operator: ${expr.operator}`);
      }

      switch (expr.operator) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/":
          if (right === 0) throw new Error("Division by zero");
          return left / right;
        case "%":
          if (right === 0) throw new Error("Modulo by zero");
          return left % right;
        case "**": return Math.pow(left, right);
      }
    }

    if ([">", ">=", "<", "<=", "==", "!="].includes(expr.operator)) {
      switch (expr.operator) {
        case ">": return left > right;
        case ">=": return left >= right;
        case "<": return left < right;
        case "<=": return left <= right;
        case "==": return left === right;
        case "!=": return left !== right;
      }
    }

    if (["&&", "||"].includes(expr.operator)) {
      switch (expr.operator) {
        case "&&": return this.isTruthy(left) && this.isTruthy(right);
        case "||": return this.isTruthy(left) || this.isTruthy(right);
      }
    }

    if (["&", "|", "^", "<<", ">>"].includes(expr.operator)) {
      const leftInt = this.toInt(left);
      const rightInt = this.toInt(right);

      switch (expr.operator) {
        case "&": return leftInt & rightInt;
        case "|": return leftInt | rightInt;
        case "^": return leftInt ^ rightInt;
        case "<<": return leftInt << rightInt;
        case ">>": return leftInt >> rightInt;
      }
    }

    throw new Error(`Unknown operator: ${expr.operator}`);
  }

  evaluateUnary(expr) {
    const right = this.evaluate(expr.right);

    switch (expr.operator) {
      case "!":
        return !this.isTruthy(right);
      case "-":
        if (typeof right !== "number") {
          throw new Error("Operand must be a number for unary minus");
        }
        return -right;
      case "~":
        return ~this.toInt(right);
      case "&":
        // Address-of operator (simulated with reference wrapper)
        return { __pointer__: true, value: right };
      case "*":
        // Dereference operator
        if (right && right.__pointer__) {
          return right.value;
        }
        throw new Error("Cannot dereference non-pointer value");
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  evaluateCall(expr) {
    // Special handling for method calls (object.method())
    if (expr.callee.type === "Get") {
      const object = this.evaluate(expr.callee.object);
      const methodName = expr.callee.name;
      const args = expr.arguments.map(arg => this.evaluate(arg));
      
      if (object instanceof JugaadInstance) {
        const method = object.get(methodName);
        if (method && method.type === 'FunctionDeclaration') {
          return this.executeFunctionSync(method, args, object);
        }
        throw new Error(`${methodName} is not a method`);
      }
      
      // Handle static method calls
      if (object instanceof JugaadClass) {
        const staticMethod = object.staticMethods.find(m => m.name === methodName);
        if (staticMethod) {
          return this.executeFunctionSync(staticMethod, args);
        }
        throw new Error(`Undefined static method: ${methodName}`);
      }
      
      throw new Error("Can only call methods on instances");
    }
    
    // Regular function calls
    const callee = this.evaluate(expr.callee);
    const args = expr.arguments.map(arg => this.evaluate(arg));

    // Handle function declarations
    if (typeof callee === 'object' && callee.type === 'FunctionDeclaration') {
      return this.executeFunctionSync(callee, args);
    }

    throw new Error("Can only call functions and methods");
  }

  evaluateGet(expr) {
    const object = this.evaluate(expr.object);

    // Handle instance property/method access
    if (object instanceof JugaadInstance) {
      return object.get(expr.name);
    }

    // Handle static method access on classes
    if (object instanceof JugaadClass) {
      const staticMethod = object.staticMethods.find(m => m.name === expr.name);
      if (staticMethod) {
        return staticMethod;
      }
      throw new Error(`Undefined static method: ${expr.name}`);
    }

    // Handle regular object property access
    if (typeof object === 'object' && object !== null) {
      if (expr.name in object) {
        return object[expr.name];
      }
      throw new Error(`Undefined property: ${expr.name}`);
    }

    throw new Error("Only objects have properties");
  }

  evaluateNew(expr) {
    const args = expr.arguments.map(arg => this.evaluate(arg));

    if (expr.className in this.classes) {
      const klass = this.classes[expr.className];
      return klass.instantiate(this, args);
    }

    if (expr.className in this.structs) {
      const struct = this.structs[expr.className];
      return struct.instantiate(this, args);
    }

    throw new Error(`Undefined class or struct: ${expr.className}`);
  }

  evaluateArray(expr) {
    return expr.elements.map(el => this.evaluate(el));
  }

  evaluateIndex(expr) {
    const object = this.evaluate(expr.object);
    const index = this.evaluate(expr.index);

    if (Array.isArray(object) || typeof object === 'object') {
      return object[index];
    }

    throw new Error("Can only index arrays and objects");
  }

  toInt(value) {
    if (typeof value !== "number") {
      throw new Error("Operand must be a number for bitwise operation");
    }
    return Math.trunc(value);
  }

  isTruthy(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.length > 0;
    return true;
  }
}

module.exports = Interpreter;