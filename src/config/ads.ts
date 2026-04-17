export interface AdSenseBannerConfig {
  enabled: boolean;
  client: string;
  slot: string;
}

// Fill these in after your AdSense account is approved and you create an ad unit.
// Until then, leave enabled false so the game ships cleanly with no blank ad box.
export const ADSENSE_BANNER_CONFIG: AdSenseBannerConfig = {
  enabled: false,
  client: "ca-pub-XXXXXXXXXXXXXXXX",
  slot: "0000000000",
};
