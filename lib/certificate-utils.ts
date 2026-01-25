
export interface CertificateTier {
  name: string;
  color: string;
  bg: string;
  border: string;
  iconColor: string;
  // Print specific colors (hex for HTML template)
  printColorHex: string;
  printBorderHex: string;
}

export interface CertificateContent {
  tier: CertificateTier;
  certText: string;
  statusLabel: string;
}

export function getCertificateTier(stars: number): CertificateTier {
  if (stars >= 10) return { 
      name: "Diamant", 
      color: "text-cyan-300", 
      bg: "bg-cyan-500/20", 
      border: "border-cyan-500/50",
      iconColor: "text-cyan-300",
      printColorHex: "#0e7490", // cyan-700
      printBorderHex: "#0e7490",
  };
  if (stars >= 6) return { 
      name: "Gull", 
      color: "text-yellow-400", 
      bg: "bg-yellow-500/20", 
      border: "border-yellow-500/50",
      iconColor: "text-yellow-400",
      printColorHex: "#ca8a04", // yellow-600
      printBorderHex: "#ca8a04",
  };
  if (stars >= 1) return { 
      name: "Sølv", 
      color: "text-slate-300", 
      bg: "bg-slate-500/20", 
      border: "border-slate-500/50",
      iconColor: "text-slate-300",
      printColorHex: "#475569", // slate-600
      printBorderHex: "#475569",
  };
  // Default to Standard (Green) for 0 stars
  return { 
      name: "Standard", 
      color: "text-emerald-300", 
      bg: "bg-emerald-500/20", 
      border: "border-emerald-500/50",
      iconColor: "text-emerald-300",
      printColorHex: "#047857", // emerald-700
      printBorderHex: "#047857",
  };
}

export function getCertificateContent(stars: number): CertificateContent {
  const tier = getCertificateTier(stars);
  
  let certText = "Har gjennomført et leieforhold med fremragende resultater og har oppnådd status som";
  let statusLabel = "VERIFISERT LEIETAKER";

  if (tier.name === "Sølv") {
    certText = "Denne leietakeren har gjennom eget initiativ og positive bidrag under leieforholdet oppnådd status som";
    statusLabel = "SØLV-LEIETAKER (VERIFISERT)";
  } else if (tier.name === "Gull") {
    certText = "Denne leietakeren har gjennom eget initiativ og ekstraordinære positive bidrag under leieforholdet oppnådd status som";
    statusLabel = "GULL-LEIETAKER (VERIFISERT)";
  } else if (tier.name === "Diamant") {
    certText = "Denne leietakeren har gjennom vedvarende initiativ og betydelige positive bidrag under leieforholdet oppnådd status som";
    statusLabel = "DIAMANT-LEIETAKER (VERIFISERT)";
  }

  return {
    tier,
    certText,
    statusLabel
  };
}
