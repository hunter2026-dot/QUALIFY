const ZAPI_INSTANCE = '3F300CD4BF50E1FD2D994EF3697ACB1C';
const ZAPI_TOKEN = '353794B30B7B07B8DD04E7EE';
const ZAPI_CLIENT_TOKEN = 'Ff09553cc6daa4598b0de53f3e9e933daS';
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`;
const zapiHeaders = { 'Client-Token': ZAPI_CLIENT_TOKEN, 'Content-Type': 'application/json' };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action } = req.query;
  try {
    if (action === 'qr') {
      const r = await fetch(`${ZAPI_BASE}/qr-code/image`, { headers: zapiHeaders });
      if (!r.ok) throw new Error('Z-API retornou ' + r.status);
      const buffer = await r.arrayBuffer();
      res.setHeader('Content-Type', 'image/png');
      return res.send(Buffer.from(buffer));
    }
    if (action === 'status') {
      const r = await fetch(`${ZAPI_BASE}/status`, { headers: zapiHeaders });
      return res.status(200).json(await r.json());
    }
    if (action === 'send') {
      const r = await fetch(`${ZAPI_BASE}/send-text`, { method: 'POST', headers: zapiHeaders, body: JSON.stringify(req.body) });
      return res.status(200).json(await r.json());
    }
    if (action === 'messages') {
      const r = await fetch(`${ZAPI_BASE}/chat-messages/${req.query.phone}?page=1&pageSize=50`, { headers: zapiHeaders });
      return res.status(200).json(await r.json());
    }
    return res.status(400).json({ error: 'action inválida' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
