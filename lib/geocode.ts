const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function detectSuburb(direccion: string): Promise<string | null> {
  await waitForRateLimit();

  const query = `${direccion}, Bahía Blanca`;
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DeliveryApp/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const addr = data[0].address;
    const suburb = addr.suburb ?? addr.neighbourhood ?? addr.city_district ?? null;
    return suburb ? String(suburb).trim() : null;
  } catch {
    return null;
  }
}
