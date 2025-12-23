export class FikenService {
  private apiUrl: string;
  private token: string | null;

  constructor() {
    this.apiUrl = process.env.FIKEN_API_URL || "https://api.fiken.no/api/v1";
    this.token = null; // Should be retrieved from DB per user/company
  }

  // Set token for the current instance (e.g. from user session)
  setToken(token: string) {
    this.token = token;
  }

  async getCompany(companySlug: string) {
    return this.request(`/companies/${companySlug}`);
  }

  async createCustomer(companySlug: string, customerData: any) {
    return this.request(`/companies/${companySlug}/contacts`, {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  async createInvoice(companySlug: string, invoiceData: any) {
    // Logic to create invoice (factura)
    return this.request(`/companies/${companySlug}/createInvoice`, {
      method: "POST",
      body: JSON.stringify(invoiceData),
    });
  }

  async getInvoiceStatus(invoiceId: string) {
    // Logic to check payment status
    // Note: Fiken API might require traversing links.
    // This is a simplified placeholder.
    return this.request(`/invoices/${invoiceId}`);
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (!this.token) {
      throw new Error("Fiken API token not set");
    }

    const headers = {
      "Authorization": `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Fiken API error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const fikenService = new FikenService();
