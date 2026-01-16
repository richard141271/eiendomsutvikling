
const FIKEN_API_URL = "https://fiken.no/api/v1";

interface FikenCompany {
  name: string;
  slug: string;
  organizationNumber: string;
}

interface FikenContact {
  name: string;
  email: string;
  address?: string;
  city?: string;
  postCode?: string;
  customerNumber?: string;
}

interface FikenInvoiceLine {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  description: string;
  comment?: string;
  vatType?: string; // e.g., "HIGH", "NONE", "EXEMPT"
}

interface FikenInvoice {
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  lines: FikenInvoiceLine[];
  customer: {
    url?: string; // Link to existing contact
  };
  bankAccountUrl?: string;
  invoiceText?: string;
}

export class FikenClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = FIKEN_API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Basic ${btoa(this.token + ":")}`, // Basic Auth with token as username
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fiken API Error (${response.status}): ${errorText}`);
      throw new Error(`Fiken API request failed: ${response.status} ${response.statusText}`);
    }

    // Some endpoints might return 201 Created with Location header but no body, or just check content-type
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response;
  }

  async getCompanies(): Promise<FikenCompany[]> {
    const data = await this.request("/companies");
    // Fiken returns { _embedded: { companies: [...] } }
    return data._embedded?.companies || [];
  }

  async getBankAccounts(companySlug: string) {
    const data = await this.request(`/companies/${companySlug}/bank-accounts`);
    return data._embedded?.bankAccounts || [];
  }

  async getContact(companySlug: string, email: string) {
    // Search for contact by email
    const data = await this.request(`/companies/${companySlug}/contacts?email=${encodeURIComponent(email)}`);
    return data._embedded?.contacts?.[0] || null;
  }

  async createContact(companySlug: string, contact: FikenContact) {
    // First check if exists
    const existing = await this.getContact(companySlug, contact.email);
    if (existing) return existing.href;

    const payload = {
      name: contact.name,
      email: contact.email,
      address: {
        address1: contact.address,
        postalPlace: contact.city,
        postalCode: contact.postCode,
        country: "Norway"
      },
      customerNumber: contact.customerNumber
    };

    const response = await this.request(`/companies/${companySlug}/contacts`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    // If we get a Response object (not JSON), check Location header
    if (response instanceof Response) {
        if (response.status === 201) {
            return response.headers.get("Location");
        }
        throw new Error("Failed to create contact");
    }
    
    // If it returned JSON (some endpoints do), try to find the link
    // But Fiken usually returns 201 with Location for creation.
    return response?.href; // Fallback
  }

  async createInvoice(companySlug: string, invoice: FikenInvoice) {
    return this.request(`/companies/${companySlug}/create-invoice-service`, {
      method: "POST",
      body: JSON.stringify(invoice)
    });
  }
}

// Helper to get client from user settings (requires DB access, so maybe keep this separate or pass token)
