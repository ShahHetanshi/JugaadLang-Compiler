const readline = require("readline");
const fs = require("fs");
const Tokenizer = require("./tokenizer");
const Parser = require("./parser");
const Interpreter = require("./interpreter");

async function run(code, interpreter, showDebug = false) {
  try {
    const tokens = Tokenizer.tokenize(code);
    if (showDebug) {
      console.log("Tokens:", tokens);
    }
    
    const parser = new Parser(tokens);
    const statements = parser.parse();
    
    if (showDebug) {
      console.log("AST:", JSON.stringify(statements, null, 2));
    }
    
    await interpreter.interpret(statements);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

function showHelp() {
  console.log(`
JugaadLang - A Hindi-Inspired Programming Language
==================================================

Usage:
  node cli.js              Start REPL mode
  node cli.js run <file>   Execute a JugaadLang file
  node cli.js help         Show this help message

Available Commands in REPL:
  .help     - Show help
  .exit     - Exit REPL
  .debug    - Toggle debug mode
  .clear    - Clear variables
  bye bhai  - Exit program

Examples:
  node cli.js run test.jl
  node cli.js run examples/factorial.jl

Language Syntax:
  bhai ye hai x = 10       - Declare variable
  bol bhai "Hello"         - Print
  sunao bhai name          - Input
  agar bhai (x > 5) {...}  - If statement
  jab tak bhai (x < 10) {...} - While loop
  bye bhai                 - Exit

For more information, see README.md
`);
}

// File execution mode
if (process.argv[2] === "run" && process.argv[3]) {
  const filename = process.argv[3];
  const interpreter = new Interpreter();
  
  try {
    if (fs.existsSync(filename)) {
      const code = fs.readFileSync(filename, "utf8");
      console.log(`\n--- Running ${filename} ---\n`);
      run(code, interpreter, false);
    } else {
      console.error(`File not found: ${filename}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error reading file:", error.message);
    process.exit(1);
  }
} else if (process.argv[2] === "help" || process.argv[2] === "--help" || process.argv[2] === "-h") {
  showHelp();
} else {
  // REPL mode
  console.log("JugaadLang REPL v1.0.0");
  console.log("Type '.help' for help, 'bye bhai' or '.exit' to exit\n");
  
  const interpreter = new Interpreter();
  let debugMode = false;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt("jugaadlang> ");
  rl.prompt();
  
  rl.on("line", async (input) => {
    const trimmed = input.trim();
    
    // REPL commands
    if (trimmed === ".exit") {
      console.log("Bye bhai!");
      process.exit(0);
    } else if (trimmed === ".help") {
      showHelp();
    } else if (trimmed === ".debug") {
      debugMode = !debugMode;
      console.log(`Debug mode: ${debugMode ? "ON" : "OFF"}`);
    } else if (trimmed === ".clear") {
      interpreter.variables = {};
      console.log("Variables cleared");
    } else if (trimmed === "") {
      // Empty line, just prompt again
    } else {
      await run(input, interpreter, debugMode);
    }
    
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nBye bhai!");
    process.exit(0);
  });
}