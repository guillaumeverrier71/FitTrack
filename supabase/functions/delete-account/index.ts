import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    console.log('url:', supabaseUrl ? 'ok' : 'MISSING')
    console.log('service role:', serviceRoleKey ? 'ok' : 'MISSING')
    console.log('anon key:', anonKey ? 'ok' : 'MISSING')

    const authHeader = req.headers.get('Authorization')
    console.log('auth header:', authHeader ? 'present' : 'MISSING')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Identify user via their own token
    const userClient = createClient(supabaseUrl!, anonKey!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    console.log('user:', user?.id ?? 'null', 'error:', userError?.message ?? 'none')

    if (userError || !user) {
      return new Response(JSON.stringify({ error: userError?.message ?? 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete with service role
    const adminClient = createClient(supabaseUrl!, serviceRoleKey!)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    console.log('delete error:', deleteError?.message ?? 'none')

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('catch:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
