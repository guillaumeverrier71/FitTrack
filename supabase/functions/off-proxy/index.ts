import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const query = url.searchParams.get('q') ?? ''
    const lang = url.searchParams.get('lang') ?? 'fr'
    const barcode = url.searchParams.get('barcode') ?? ''

    const offUrl = barcode
      ? `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,nutriments,code`
      : `https://world.openfoodfacts.org/cgi/search.pl?action=process&search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&fields=product_name,nutriments,code&page_size=10&lc=${lang}&cc=${lang}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(offUrl, { signal: controller.signal })
    clearTimeout(timeout)

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, products: [] }), {
      status: 200, // Retourner 200 avec liste vide plutôt que 500
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
