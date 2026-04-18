import { ADSENSE_BANNER_CONFIG } from "../config/ads";

function hasRealConfig(): boolean {
  return (
    ADSENSE_BANNER_CONFIG.enabled &&
    /^ca-pub-\d{10,}$/.test(ADSENSE_BANNER_CONFIG.client) &&
    /^\d{6,}$/.test(ADSENSE_BANNER_CONFIG.slot)
  );
}

export function initializeAdSenseBanner(): void {
  const shell = document.getElementById("ad-banner-shell");
  if (!(shell instanceof HTMLElement)) return;
  if (!hasRealConfig()) {
    shell.hidden = true;
    return;
  }

  shell.hidden = false;
  shell.innerHTML = "";

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_BANNER_CONFIG.client}`;
  script.crossOrigin = "anonymous";
  document.head.append(script);

  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.display = "block";
  ad.dataset.adClient = ADSENSE_BANNER_CONFIG.client;
  ad.dataset.adSlot = ADSENSE_BANNER_CONFIG.slot;
  ad.dataset.adFormat = "horizontal";
  ad.dataset.fullWidthResponsive = "false";
  shell.append(ad);

  script.addEventListener("load", () => {
    try {
      ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
    } catch {
      shell.hidden = true;
    }
  });
}
