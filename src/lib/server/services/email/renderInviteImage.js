import { chromium } from 'playwright';

let _browserPromise;

async function getBrowser() {
  if (!_browserPromise) {
    _browserPromise = chromium.launch({ headless: true });
  }
  return _browserPromise;
}

function withCacheBust(url, attempt) {
  const u = new URL(url);
  u.searchParams.set('cb', `${Date.now()}-${attempt}`);
  return u.toString();
}

/**
 * Espera a que:
 * - #invite-frame exista
 * - fuentes terminen (document.fonts.ready)
 * - imágenes <img> y <svg image> se intenten cargar
 * Devuelve { failedUrls, totalUrls } para decidir reintento.
 */
async function waitForInviteAssets(page) {
  const frame = page.locator('#invite-frame');
  await frame.waitFor({ state: 'visible', timeout: 20000 });

  const result = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // 1) fuentes
    try {
      // @ts-ignore
      if (document.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    } catch {}

    const getSvgHref = (el) =>
      el.getAttribute('href') ||
      el.getAttribute('xlink:href') ||
      el.getAttribute('src');

    // 2) recolecta URLs
    const urls = new Set();

    // <img>
    for (const img of Array.from(document.querySelectorAll('img'))) {
      const src = img.currentSrc || img.getAttribute('src') || '';
      if (src) urls.add(src);
    }

    // <svg><image>
    for (const im of Array.from(document.querySelectorAll('svg image'))) {
      const href = getSvgHref(im);
      if (href) urls.add(href);
    }

    const urlList = Array.from(urls);

    // 3) intenta cargarlas con Image()
    const failed = [];
    await Promise.all(
      urlList.map(
        (url) =>
          new Promise((resolve) => {
            const i = new Image();

            // si ya estaba en cache y completa, cuenta como ok
            i.onload = () => resolve(true);
            i.onerror = () => {
              failed.push(url);
              resolve(false);
            };

            i.src = url;
          })
      )
    );

    // 4) pequeño buffer para que pinte el SVG/foreignObject
    await sleep(300);

    return { failedUrls: failed, totalUrls: urlList.length };
  });

  return result;
}

async function takeInviteScreenshot(page) {
  const frame = page.locator('#invite-frame');
  // JPEG para correo (ligero)
  return await frame.screenshot({ type: 'jpeg', quality: 78 });
}

/**
 * Renderiza la invitación como JPG.
 * Reintenta si detecta imágenes que no cargaron.
 */
export async function renderInviteJpg({ renderUrl }) {
  const browser = await getBrowser();

  const page = await browser.newPage({
    viewport: { width: 1400, height: 1800 },
    deviceScaleFactor: 1.5
  });

  // Config reintentos
  const MAX_ATTEMPTS = 2; // puedes subir a 3 si quieres
  const WAIT_BEFORE_RETRY_MS = 800;

  try {
    let lastAssetReport = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const url = withCacheBust(renderUrl, attempt);

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // espera assets y detecta fallos
      lastAssetReport = await waitForInviteAssets(page);

      const failedCount = lastAssetReport?.failedUrls?.length || 0;
      const total = lastAssetReport?.totalUrls || 0;

      // ✅ si no falló nada (o no hay urls), tomamos screenshot
      if (failedCount === 0 || total === 0) {
        return await takeInviteScreenshot(page);
      }

      // Si fallaron imágenes y aún hay intentos, reintenta
      if (attempt < MAX_ATTEMPTS) {
        await page.waitForTimeout(WAIT_BEFORE_RETRY_MS);
        continue;
      }

      // Último intento: de todos modos sacamos screenshot (mejor algo que nada)
      return await takeInviteScreenshot(page);
    }

    // fallback (no debería llegar)
    return await takeInviteScreenshot(page);
  } finally {
    await page.close();
  }
}
