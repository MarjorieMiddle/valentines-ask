exports.handler = async (event) => {
    const server = (process.env.NTFY_SERVER || 'https://ntfy.sh').trim();
    let topic = (process.env.NTFY_TOPIC || '').trim();
    const legacyTopic = (process.env.PRIVATE_TOPIC_NAME || '').trim();
    if (!topic && legacyTopic) {
        topic = legacyTopic.replace(/^https?:\/\/[^/]+\//, '');
    }
    let message = (process.env.NTFY_MESSAGE || 'She said YES! 💘').trim();
    if (event && event.body) {
        try {
            const parsed = JSON.parse(event.body);
            if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) {
                message = parsed.message.trim();
            }
        } catch (error) {
            // ignore malformed JSON and keep default message
        }
    }
    const title = (process.env.NTFY_TITLE || 'Valentine Response').trim();
    const token = (process.env.NTFY_TOKEN || '').trim();

    if (!topic) {
        return {
            statusCode: 500,
            body: 'Missing NTFY_TOPIC',
        };
    }

    const url = `${server.replace(/\/$/, '')}/${topic}`;
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (title) {
        headers['Title'] = title;
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: message,
        });

        if (!response.ok) {
            const text = await response.text();
            return {
                statusCode: response.status,
                body: `ntfy error: ${text}`,
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: error.message || 'ntfy request failed',
        };
    }

    return {
        statusCode: 204,
        body: '',
    };
};
