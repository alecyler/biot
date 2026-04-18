import { ADSENSE_AUTO_ADS_CONFIG, ADSENSE_BANNER_CONFIG } from "../config/ads";

function hasClient(value: string): boolean {
  return /^ca-pub-\d{10,}$/.test(value);
}

function ensureAdSenseScript(client: string): HTMLScriptElement | null {
  if (!hasClient(client)) return null;
  const existing = document.querySelector(`script[data-adsense-client="${client}"]`);
  if (existing instanceof HTMLScriptElement) return existing;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = "anonymous";
  script.dataset.adsenseClient = client;
  document.head.append(script);
  return script;
}

function initializeAutoAds(): void {
  if (!ADSENSE_AUTO_ADS_CONFIG.enabled || !hasClient(ADSENSE_AUTO_ADS_CONFIG.client)) return;
  ensureAdSenseScript(ADSENSE_AUTO_ADS_CONFIG.client);
  try {
    ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({
      google_ad_client: ADSENSE_AUTO_ADS_CONFIG.client,
      enable_page_level_ads: true,
    });
  } catch {
    // Ignore auto-ads bootstrap failures.
  }
}

function hasRealBannerConfig(): boolean {
  return (
    ADSENSE_BANNER_CONFIG.enabled &&
    hasClient(ADSENSE_BANNER_CONFIG.client) &&
    /^\d{6,}$/.test(ADSENSE_BANNER_CONFIG.slot)
  );
}

function initializeBanner(): void {
  const shell = document.getElementById("ad-banner-shell");
  if (!(shell instanceof HTMLElement)) return;
  if (!hasRealBannerConfig()) {
    shell.hidden = true;
    return;
  }

  shell.hidden = false;
  shell.innerHTML = "";

  const script = ensureAdSenseScript(ADSENSE_BANNER_CONFIG.client);
  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.display = "block";
  ad.dataset.adClient = ADSENSE_BANNER_CONFIG.client;
  ad.dataset.adSlot = ADSENSE_BANNER_CONFIG.slot;
  ad.dataset.adFormat = "horizontal";
  ad.dataset.fullWidthResponsive = "false";
  shell.append(ad);

  const pushBanner = (): void => {
    try {
      ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
    } catch {
      shell.hidden = true;
    }
  };

  if (script?.dataset.loaded === "1") {
    pushBanner();
  } else if (script) {
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      pushBanner();
    }, { once: true });
  }
}

export function initializeAds(): void {
  initializeAutoAds();
  initializeBanner();
}


export function initializeAdSenseBanner(): void {
  initializeAds();
}
