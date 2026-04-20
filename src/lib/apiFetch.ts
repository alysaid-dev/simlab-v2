/**
 * Drop-in pengganti `fetch` yang meng-akali Cloudflare WAF.
 *
 * Cloudflare di depan `statistics.uii.ac.id` memblokir method PATCH (403 HTML,
 * request tidak pernah sampai ke backend). DELETE belum terkonfirmasi diblok,
 * tapi diberi treatment yang sama untuk amannya. Helper mengirim method
 * terdampak sebagai POST dengan header `X-HTTP-Method-Override`; middleware
 * backend membaca header itu dan mengembalikan req.method sebelum routing.
 *
 * Method lain diteruskan apa adanya.
 */
const OVERRIDE_METHODS = new Set(["PATCH", "DELETE", "PUT"]);

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase();
  if (!method || !OVERRIDE_METHODS.has(method)) {
    return fetch(input, init);
  }
  const headers = new Headers(init?.headers);
  headers.set("X-HTTP-Method-Override", method);
  return fetch(input, { ...init, method: "POST", headers });
}
