const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false }, realtime: { transport: ws } }
);
function normalizePhone(raw) {
  if (!raw) return null;
  return raw.replace(/\D/g, '').replace(/@.*$/, '').replace(/^0+/, '');
}
module.exports = async function handler(req, res) {
  console.log('BODY:', JSON.stringify(req.body));
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  try {
    const body = req.body;
    const isFromMe = body.fromMe === true;
    const phoneRaw = body.phone || body.from || body.chatId || '';
    const phone = normalizePhone(phoneRaw);
    const text = body.text?.message || body.caption || body.body || body.message || '';
    const timestamp = body.momment
      ? new Date(body.momment * 1000).toISOString()
      : new Date().toISOString();
    console.log('PHONE:', phone, 'TEXT:', text);
    if (!phone || !text) return res.status(200).json({ ok: true, skipped: true, phone, text });
    const { data: leads, error: errBusca } = await db
      .from('leads')
      .select('id')
      .or(`telefone.eq.${phone},telefone.eq.+${phone},telefone.eq.55${phone}`)
      .limit(1);
    console.log('LEADS:', JSON.stringify(leads), 'ERR:', JSON.stringify(errBusca));
    let leadId;
    if (leads && leads.length > 0) {
      leadId = leads[0].id;
    } else {
      const { data: novoLead, error: errLead } = await db
        .from('leads')
        .insert({
          nome: phone,
          telefone: phone,
          fonte: 'Orgânico',
          etapa: 'Novo Lead',
          funil: 'Prospecção',
          temperatura: 'Frio',
          origem_lead: 'whatsapp'
        })
        .select('id')
        .single();
      console.log('NOVO LEAD:', JSON.stringify(novoLead), 'ERR:', JSON.stringify(errLead));
      if (errLead) return res.status(200).json({ ok: false, error: errLead.message });
      leadId = novoLead.id;
    }
    const { error: errMsg } = await db.from('mensagens').insert({
      lead_id: leadId,
      direcao: isFromMe ? 'enviada' : 'recebida',
      conteudo: text,
      tipo: body.type || 'texto',
      timestamp_wa: timestamp
    });
    console.log('MSG ERR:', JSON.stringify(errMsg));
    return res.status(200).json({ ok: true, leadId });
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
