import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function normalizePhone(raw) {
  if (!raw) return null;
  return raw.replace(/\D/g, '').replace(/@.*$/, '').replace(/^0+/, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const body = req.body;

    // Z-API payload structure
    const isFromMe = body.fromMe === true;
    const phoneRaw = body.phone || body.from || body.chatId || '';
    const phone = normalizePhone(phoneRaw);
    const text = body.text?.message || body.caption || body.body || body.message || '';
    const timestamp = body.momment
      ? new Date(body.momment * 1000).toISOString()
      : new Date().toISOString();
    const tipo = body.type || 'texto';

    if (!phone || !text) return res.status(200).json({ ok: true, skipped: true });

    // Acha lead pelo telefone
    const { data: leads } = await db
      .from('leads')
      .select('id')
      .or(`telefone.eq.${phone},telefone.eq.+${phone},telefone.eq.55${phone}`)
      .limit(1);

    let leadId;

    if (leads && leads.length > 0) {
      leadId = leads[0].id;
    } else {
      // Cria lead automaticamente
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

      if (errLead) {
        console.error('Erro ao criar lead:', errLead);
        return res.status(200).json({ ok: false, error: errLead.message });
      }
      leadId = novoLead.id;
    }

    // Salva mensagem
    const { error: errMsg } = await db.from('mensagens').insert({
      lead_id: leadId,
      direcao: isFromMe ? 'enviada' : 'recebida',
      conteudo: text,
      tipo,
      timestamp_wa: timestamp
    });

    if (errMsg) {
      console.error('Erro ao salvar mensagem:', errMsg);
      return res.status(200).json({ ok: false, error: errMsg.message });
    }

    return res.status(200).json({ ok: true, leadId });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
