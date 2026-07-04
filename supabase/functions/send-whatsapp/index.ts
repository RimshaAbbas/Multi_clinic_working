// supabase/functions/send-whatsapp/index.ts
//
// Supabase Edge Function — sends a real WhatsApp message via UltraMsg API.
//
// HOW TO DEPLOY:
//   1. Install Supabase CLI:  npm install -g supabase
//   2. Login:                 supabase login
//   3. Link project:          supabase link --project-ref jwyywicdrhcrhbglhohg
//   4. Deploy:                supabase functions deploy send-whatsapp
//   5. Set secrets:
//        supabase secrets set ULTRAMSG_INSTANCE_ID=your_instance_id
//        supabase secrets set ULTRAMSG_TOKEN=your_token
//
// HOW TO GET ULTRAMSG CREDENTIALS (FREE):
//   1. Go to https://ultramsg.com  → Sign up (free trial)
//   2. Create a WhatsApp instance
//   3. Scan the QR code with your WhatsApp phone
//   4. Copy your Instance ID and Token from the dashboard
//
// This function is called by:
//   - The sms_log Postgres trigger (via pg_net HTTP request) for lab results
//   - The frontend directly (for booking confirmations)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { phone, message } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'phone and message are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const instanceId = Deno.env.get('ULTRAMSG_INSTANCE_ID')
    const token      = Deno.env.get('ULTRAMSG_TOKEN')

    if (!instanceId || !token) {
      return new Response(
        JSON.stringify({
          success: false,
          error:   'ULTRAMSG_INSTANCE_ID or ULTRAMSG_TOKEN not configured. ' +
                   'Run: supabase secrets set ULTRAMSG_INSTANCE_ID=xxx ULTRAMSG_TOKEN=yyy'
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number — UltraMsg needs country code without +
    // e.g. +92 300 1234567 → 923001234567
    const formattedPhone = phone
      .replace(/\s/g, '')     // remove spaces
      .replace(/[^\d+]/g, '') // remove non-digits except +
      .replace(/^\+/, '')     // remove leading +

    // Send via UltraMsg REST API
    const response = await fetch(
      `https://api.ultramsg.com/${instanceId}/messages/chat`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          token,
          to:   formattedPhone,
          body: message,
        }),
      }
    )

    const result = await response.json()

    if (result.sent === 'true' || result.id) {
      return new Response(
        JSON.stringify({ success: true, messageId: result.id }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'UltraMsg returned failure', raw: result }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
