/**
 * Simple HTTP Server for Petrol Pump Rush
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const HOSTNAME = 'localhost';

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
    // Parse URL
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = path.join(__dirname, decodeURIComponent(parsedUrl.pathname));

    // Default to index.html if directory requested
    if (fs.existsSync(pathname) && fs.statSync(pathname).isDirectory()) {
        pathname = path.join(pathname, 'index.html');
    }

    // Get file extension
    const ext = path.extname(pathname).toLowerCase();

    // Read and serve file
    fs.readFile(pathname, (err, data) => {
        if (err) {
            // 404 Not Found
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>404 - Not Found</title></head>
                <body style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h1>404 - File Not Found</h1>
                    <p>The requested file was not found: ${parsedUrl.pathname}</p>
                    <p><a href="/">Go back to game</a></p>
                </body>
                </html>
            `);
        } else {
            // Success - Serve file with correct MIME type
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        }
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   ⛽ PETROL PUMP RUSH - Server Started! 🎮          ║
║                                                        ║
║   🌐 Open your browser to:                            ║
║      http://${HOSTNAME}:${PORT}                              ║
║                                                        ║
║   📁 Serving files from: ${__dirname}  ║
║                                                        ║
║   Press Ctrl+C to stop the server                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error(`Try running on a different port: PORT=3000 node server.js`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
