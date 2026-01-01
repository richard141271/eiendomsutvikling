export async function fetchCityFromPostalCode(postalCode: string): Promise<string | null> {
  if (!postalCode || postalCode.length !== 4) return null;

  try {
    // Using Bring's public API which is very reliable for Norwegian postal codes
    // It returns JSON: { "result": "HALDEN", "valid": true, ... }
    const response = await fetch(`https://api.bring.com/shippingguide/api/postalCode.json?pnr=${postalCode}&country=NO`);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.valid && data.result) {
        // Bring returns uppercase, we might want to capitalize nicely (e.g. "HALDEN" -> "Halden")
        // But official names are often uppercase. Let's keep it or Title Case it.
        // Let's do Title Case for better UI.
        return toTitleCase(data.result);
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching postal code:", error);
    return null;
  }
}

function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}
