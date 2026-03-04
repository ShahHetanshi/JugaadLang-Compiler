// server.js - Web server for Jugaad Lang IDE with WebSocket support
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('ws');
const Tokenizer = require('./tokenizer');
const Parser = require('./parser');
const Interpreter = require('./interpreter');

const PORT = 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json'
};

// Prevent server crash
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

// Create HTTP server
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve index.html for root path
    if (req.url === '/' || req.url === '/index.html') {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        
        fs.readFile(indexPath, (err, content) => {
            if (err) {
                console.error('❌ Error loading index.html:', err.message);
                res.writeHead(500);
                res.end('Error loading page');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    // Serve static files
    const filePath = path.join(__dirname, 'public', req.url);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

// Create WebSocket server
const wss = new Server({ server });

wss.on('connection', (ws) => {
    console.log('🔌 Client connected');
    let currentInputResolver = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'execute') {
                console.log('\n📥 Executing code...');
                const code = data.code;
                
                const outputs = [];
                const originalLog = console.log;
                
                console.log = (...args) => {
                    const msg = args.map(arg => String(arg)).join(' ');
                    outputs.push(msg);
                    ws.send(JSON.stringify({ type: 'output', data: msg }));
                    originalLog('[OUTPUT]', msg);
                };

                try {
                    const tokens = Tokenizer.tokenize(code);
                    const parser = new Parser(tokens);
                    const ast = parser.parse();
                    
                    const interpreter = new Interpreter();
                    
                    // Override executeInput to work with WebSocket
                    interpreter.executeInput = async function(statement) {
                        return new Promise((resolve) => {
                            currentInputResolver = resolve;
                            ws.send(JSON.stringify({ 
                                type: 'input_request', 
                                variable: statement.variable 
                            }));
                        }).then((value) => {
                            // Parse the input value
                            let parsedValue = value.trim();
                            if (!isNaN(parsedValue) && parsedValue !== '') {
                                parsedValue = parseFloat(parsedValue);
                            }
                            this.variables[statement.variable] = parsedValue;
                        });
                    };
                    
                    await interpreter.interpret(ast);
                    
                    console.log = originalLog;
                    ws.send(JSON.stringify({ type: 'done', success: true }));
                    
                } catch (error) {
                    console.log = originalLog;
                    console.error('❌ Error:', error.message);
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: error.message 
                    }));
                }
            } else if (data.type === 'input_response') {
                if (currentInputResolver) {
                    currentInputResolver(data.value);
                    currentInputResolver = null;
                }
            }
        } catch (error) {
            console.error('❌ WebSocket error:', error.message);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: error.message 
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Jugaad Lang IDE Server running at http://localhost:${PORT}`);
    console.log(`📂 Open your browser and visit http://localhost:${PORT}`);
    console.log(`💡 Press Ctrl+C to stop the server`);
    console.log(`✅ WebSocket enabled - Interactive input supported!`);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down Jugaad Lang IDE server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});