import { createClient } from '@supabase/supabase-js';

const db = createClient(
  'https://ehcvdzdvlmzjgpcbiadt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoY3ZkemR2bG16amdwY2JpYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDM4MjMsImV4cCI6MjA5NzY3OTgyM30.e2FUKdjCLMStqzA9M4gKoWy90wSOCj9fkJFd6fGpy1E',
  { auth: { persistSession: false } }
);

function normalizePhone(raw) {
  if (!raw) return null;
  return raw.replace(/\D/g, '').replace(/@.*$/, '').replace(/^0+/, '');
}

export default async function handler(req, res) {
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
          temperatura: 'Frio'
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
    console.log('EXCEPTION:', e.message, e.stack);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
