export const dynamic = 'force-dynamic';

export async function GET() {
  // MapTiler browser keys are public, domain-restricted credentials.
  const key = process.env.MAPTILER_API_KEY?.trim() || process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim();
  if (!key) return Response.json({ error: 'Map configuration is unavailable.' }, { status: 503 });
  return Response.json({ key }, { headers: { 'Cache-Control': 'no-store' } });
}
