// Cloudflare Pages Function : sitemap XML automatique des recettes publiées.
const SITE = 'https://le-geste-du-chef.pages.dev';
const SUPABASE_URL = 'https://xlnjmhkuhjqunwvkkykh.supabase.co';
// Clé publique (publishable), identique à celle du JavaScript du site.
const SUPABASE_PUBLIC_KEY = 'sb_publishable_cxU-UsbHYO9S6RtVHEXbJw_-Y42Tryt';

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  })[char]);
}

export async function onRequestGet() {
  try {
    const ids = [];
    const pageSize = 1000;
    for (let start = 0; ; start += pageSize) {
      const endpoint = `${SUPABASE_URL}/rest/v1/recettes?select=id&publie=eq.true&order=date_creation.desc&limit=${pageSize}&offset=${start}`;
      const response = await fetch(endpoint, {
        headers: { apikey: SUPABASE_PUBLIC_KEY, Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Supabase: ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('Réponse inattendue de Supabase');
      ids.push(...batch.map(row => row.id).filter(Boolean));
      if (batch.length < pageSize) break;
      if (start >= 99000) throw new Error('Limite de pagination atteinte');
    }

    const pages = [
      '/', '/recettes.html', '/materiel.html',
      '/mentions-legales.html', '/politique-confidentialite.html'
    ];
    const urls = pages.map(path => `${SITE}${path}`);
    urls.push(...ids.map(id => `${SITE}/recette.html?id=${encodeURIComponent(id)}`));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600'
      }
    });
  } catch (error) {
    console.error('Erreur sitemap :', error);
    return new Response('Sitemap temporairement indisponible', { status: 503 });
  }
}
