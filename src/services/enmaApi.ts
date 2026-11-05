import { PlaySource } from '../types/api';

let wasmInstance: any = null;
let memoryBuffer: any = null;
let fnAlloc: string | null = null;
let fnRun: string | null = null;
let fnOutPtr: string | null = null;
let initPromise: Promise<boolean> | null = null;

async function initEnmaWasm(): Promise<boolean> {
  try {
    const [wasmRes, manifestRes] = await Promise.all([
      fetch('https://www.enma.lol/ada.wasm', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }),
      fetch('https://www.enma.lol/ada.manifest', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
    ]);

    if (!wasmRes.ok || !manifestRes.ok) return false;

    const [wasmBytes, manifest] = await Promise.all([
      wasmRes.arrayBuffer(),
      manifestRes.json()
    ]);

    const s = manifest.s;
    const decodeName = (arr: number[]) =>
      String.fromCharCode(...arr.map((val: number, idx: number) => val ^ (s >> (idx & 15)) & 255));

    fnRun = decodeName(manifest.r);
    fnAlloc = decodeName(manifest.i);
    fnOutPtr = decodeName(manifest.o);

    const { instance } = await WebAssembly.instantiate(wasmBytes, {
      env: { abort: () => {} }
    });

    wasmInstance = instance.exports;
    memoryBuffer = wasmInstance.memory;
    return true;
  } catch (err) {
    console.warn('[ENMA] Failed to initialize WASM decryptor:', err);
    return false;
  }
}

function ensureWasm(): Promise<boolean> {
  if (!initPromise) {
    initPromise = initEnmaWasm();
  }
  return initPromise;
}

export function decryptEnmaPayload(base64Str: string): string {
  if (!wasmInstance || !fnRun || !fnAlloc || !fnOutPtr || !memoryBuffer) {
    throw new Error('Enma WASM not initialized');
  }

  const binary = atob(base64Str.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const allocPtr = (wasmInstance[fnAlloc]() >>> 0);
  new Uint8Array(memoryBuffer.buffer, allocPtr, bytes.length).set(bytes);

  const outLen = (wasmInstance[fnRun](allocPtr, bytes.length) >>> 0);
  if (outLen === 0) throw new Error('Enma decrypt returned zero length');

  const outPtr = (wasmInstance[fnOutPtr]() >>> 0);
  const outBytes = new Uint8Array(memoryBuffer.buffer, outPtr, outLen).slice();
  return new TextDecoder().decode(outBytes);
}

/**
 * Returns the verified 5 streaming servers from enma.lol
 * These are deterministic embeds based on Anilist ID and episode number.
 */
export function getEnmaServers(
  anilistId: number | string,
  episodeNum: number,
  track: 'sub' | 'dub' = 'sub'
): PlaySource[] {
  const aid = String(anilistId);
  const ep = String(episodeNum);
  const t = track.toLowerCase();

  return [
    {
      kind: 'iframe',
      server: 'Enma (TryEmbed Ultra)',
      url: `https://tryembed.us.cc/embed/anime/${aid}/${ep}/${t}?lang-type=false&autoNext=false`,
      media_headers: {
        'Referer': 'https://www.enma.lol/',
        'Origin': 'https://www.enma.lol'
      }
    },
    {
      kind: 'iframe',
      server: 'Enma (4Animo HD)',
      url: `https://cdn.4animo.xyz/embed/hd-1/ani/${aid}/${ep}/${t}?k=1`,
      media_headers: {
        'Referer': 'https://www.enma.lol/',
        'Origin': 'https://www.enma.lol'
      }
    },
    {
      kind: 'iframe',
      server: 'Enma (Vidhawk)',
      url: `https://vidhawk.buzz/embed/ani/${aid}/${ep}/${t}`,
      media_headers: {
        'Referer': 'https://www.enma.lol/',
        'Origin': 'https://www.enma.lol'
      }
    },
    {
      kind: 'iframe',
      server: 'Enma (Megaplay Backup)',
      url: `https://megaplay.buzz/stream/ani/${aid}/${ep}/${t}?s=bcdn&k=1`,
      media_headers: {
        'Referer': 'https://megaplay.buzz/',
        'Origin': 'https://megaplay.buzz'
      }
    }
  ];
}

/**
 * Proactively attempts to fetch live decrypted stream from Enma API.
 * Returns intro/outro timestamps and tracks if available.
 */
export async function fetchLiveEnmaStream(
  anilistId: number | string,
  episodeNum: number,
  track: 'sub' | 'dub' = 'sub'
): Promise<PlaySource[] | null> {
  const ready = await ensureWasm();
  if (!ready) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const url = `https://api.enma.lol/api/stream?id=${anilistId}%3Fep%3D${episodeNum}&server=hd-1&type=${track}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Origin': 'https://www.enma.lol',
        'Referer': 'https://www.enma.lol/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const raw = await res.text();
    const json = JSON.parse(decryptEnmaPayload(raw));
    if (json?.success && json?.results?.streamingLink) {
      const link = json.results.streamingLink;
      const skip: any = {};
      if (link.intro) skip.intro = [link.intro.start, link.intro.end];
      if (link.outro) skip.outro = [link.outro.start, link.outro.end];

      const subtitles = (link.tracks || [])
        .filter((trk: any) => trk.kind === 'captions' || trk.kind === 'subtitles')
        .map((trk: any) => ({
          lang: trk.label || 'en',
          label: trk.label || 'English',
          url: trk.file,
          default: trk.default || false
        }));

      const baseList = getEnmaServers(anilistId, episodeNum, track);
      return baseList.map((src) => ({
        ...src,
        skip: skip.intro || skip.outro ? skip : undefined,
        subtitles: subtitles.length > 0 ? subtitles : undefined
      }));
    }
  } catch (err) {
    // Non-fatal, fallback to standard server templates
  }

  return null;
}
