import dns from "node:dns/promises";
import net from "node:net";

// A quick, read-only look at a business's homepage: does it load, over HTTPS, with a mobile viewport, a title and a
// meta description? The URL comes from a listing (and ultimately the browser), so requests are restricted to public
// http(s) hosts to stop the server being used to reach internal addresses (SSRF).

export type WebsiteCheck =
  | {
      checked: true;
      reachable: true;
      finalUrl: string;
      https: boolean;
      mobileViewport: boolean;
      title: string | null;
      metaDescription: string | null;
      responseMs: number;
      /** Links found in the homepage HTML. Sites that add links with JavaScript after loading can be under-counted. */
      whatsappLink: boolean;
      phoneLink: boolean;
      bookingLink: boolean;
      orderingLink: boolean;
      socialLinks: string[];
      /** Latest year in a copyright notice (e.g. "© 2019"), or null if none was found. */
      copyrightYear: number | null;
    }
  | { checked: true; reachable: false; reason: string }
  | { checked: false; reason: string };

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 400_000;
const MAX_REDIRECTS = 3;

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("not an http(s) address");
  if (url.username || url.password) throw new Error("addresses with credentials aren't checked");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("non-standard port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("not a public address");
  return url;
}

async function readLimited(response: globalThis.Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();

function metaContent(html: string, name: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (new RegExp(`(name|property)\\s*=\\s*["']?${name}["']?`, "i").test(tag)) {
      const content = tag.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i);
      const value = content?.[1] ?? content?.[2];
      if (value !== undefined) return decodeEntities(value).slice(0, 300) || null;
    }
  }
  return null;
}

const SOCIAL_SITES: [string, RegExp][] = [
  ["Instagram", /instagram\.com\//i],
  ["Facebook", /(facebook\.com|fb\.com|fb\.me)\//i],
  ["YouTube", /(youtube\.com|youtu\.be)\//i],
  ["LinkedIn", /linkedin\.com\//i],
  ["X (Twitter)", /(twitter\.com|x\.com)\//i],
];
// Booking and ordering: platform domains plus common link wording.
const BOOKING = /(calendly\.com|practo\.com|fresha\.com|setmore\.com|booksy\.com|zocdoc\.com|simplybook|appointy|book[ -]?(now|online|an? appointment)|appointment|\breserv(e|ations?)\b|schedule a visit)/i;
const ORDERING = /(swiggy\.com|zomato\.com|order[ -]?(now|online)|online[ -]?order|magicpin|dunzo|ubereats|deliveroo|doordash|menu\/order)/i;

function linkSignals(html: string) {
  const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) ?? [];
  const hrefs = anchors.map((a) => a.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? "");
  const linkText = anchors.map((a) => a.replace(/<[^>]+>/g, " ")).join(" ");
  const everything = `${hrefs.join(" ")} ${linkText}`;
  return {
    whatsappLink: hrefs.some((h) => /(wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|web\.whatsapp\.com)/i.test(h)),
    phoneLink: hrefs.some((h) => /^tel:/i.test(h.trim())),
    bookingLink: BOOKING.test(everything),
    orderingLink: ORDERING.test(everything),
    socialLinks: SOCIAL_SITES.filter(([, pattern]) => hrefs.some((h) => pattern.test(h))).map(([name]) => name),
  };
}

function copyrightYear(html: string): number | null {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&copy;|&#169;/gi, "©");
  const now = new Date().getFullYear();
  let latest: number | null = null;
  for (const match of text.matchAll(/(?:©|copyright)\s*(?:\(c\)\s*)?((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi)) {
    const year = Math.max(Number(match[1]), match[2] ? Number(match[2]) : 0);
    if (year <= now && (latest === null || year > latest)) latest = year;
  }
  return latest;
}

export async function checkWebsite(listedUrl: string): Promise<WebsiteCheck> {
  let url: URL;
  try {
    url = await assertPublicHttpUrl(/^https?:\/\//i.test(listedUrl) ? listedUrl : `https://${listedUrl}`);
  } catch (error) {
    return { checked: false, reason: `Not checked: ${(error as Error).message}.` };
  }

  const started = Date.now();
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "LeadScout-AI/0.1 (website check for an opportunity review)", Accept: "text/html,*/*;q=0.5" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        url = await assertPublicHttpUrl(new URL(response.headers.get("location")!, url).toString());
        continue;
      }
      if (!response.ok) return { checked: true, reachable: false, reason: `The homepage returned HTTP ${response.status}.` };
      const html = await readLimited(response);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      return {
        checked: true,
        reachable: true,
        finalUrl: url.toString(),
        https: url.protocol === "https:",
        mobileViewport: Boolean(metaContent(html, "viewport")),
        title: title ? decodeEntities(title).slice(0, 200) || null : null,
        metaDescription: metaContent(html, "description"),
        responseMs: Date.now() - started,
        ...linkSignals(html),
        copyrightYear: copyrightYear(html),
      };
    }
    return { checked: true, reachable: false, reason: "The homepage redirected too many times." };
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code ?? (error as Error).name;
    return { checked: true, reachable: false, reason: code === "TimeoutError" ? "The homepage didn't respond within 8 seconds." : `The homepage couldn't be loaded (${code}).` };
  }
}
