export interface AdSenseBannerConfig {
  enabled: boolean;
  client: string;
  slot: string;
}

export interface AdSenseAutoAdsConfig {
  enabled: boolean;
  client: string;
}

// Website ads are best handled with AdSense.
// - Banner is the manual bottom slot used in-game.
// - Auto ads are optional and can provide anchor/vignette behavior on page navigations
//   such as a full world reset. Final vignette frequency and triggers are controlled in
//   your AdSense dashboard.
export const ADSENSE_BANNER_CONFIG: AdSenseBannerConfig = {
  enabled: false,
  client: "ca-pub-XXXXXXXXXXXXXXXX",
  slot: "0000000000",
};

export const ADSENSE_AUTO_ADS_CONFIG: AdSenseAutoAdsConfig = {
  enabled: false,
  client: "ca-pub-XXXXXXXXXXXXXXXX",
};
