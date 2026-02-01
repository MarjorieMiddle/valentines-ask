const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const htmlPath = path.join(__dirname, 'index.html');

function loadDotEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        return;
    }
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return;
        }
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) {
            return;
        }
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        value = value.replace(/^"(.*)"$/, '$1');
        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
}

loadDotEnv();

function getEnv(name) {
    return (process.env[name] || '').trim();
}

async function sendNotification() {
    const server = getEnv('NTFY_SERVER') || 'https://ntfy.sh';
    let topic = getEnv('NTFY_TOPIC');
    const legacyTopic = getEnv('PRIVATE_TOPIC_NAME');
    if (!topic && legacyTopic) {
        topic = legacyTopic.replace(/^https?:\/\/[^/]+\//, '');
    }
    const message = getEnv('NTFY_MESSAGE') || 'She said YES! 💘';
    const title = getEnv('NTFY_TITLE') || 'Valentine Response';
    const token = getEnv('NTFY_TOKEN');

    if (!topic) {
        throw new Error('Missing NTFY_TOPIC. Set a private topic name.');
    }

    const url = `${server.replace(/\/$/, '')}/${topic}`;
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (title) {
        headers['Title'] = title;
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: message,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`ntfy error ${response.status}: ${text}`);
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        fs.readFile(htmlPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Failed to load page.');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/sms') {
        try {
            await sendNotification();
            res.writeHead(204);
            res.end();
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(error.message || 'SMS failed');
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
