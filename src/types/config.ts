export interface GscConfig {
  default_site?: string;
}

export interface BingConfig {
  api_key?: string;
  default_site?: string;
}

export interface OutputConfig {
  max_rows?: number;
  date_format?: "iso" | "human";
}

export interface Config {
  gsc?: GscConfig;
  bing?: BingConfig;
  output?: OutputConfig;
}
