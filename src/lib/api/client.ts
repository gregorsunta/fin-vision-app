import { authStore } from '../stores/auth';
import { get } from 'svelte/store';

const API_BASE_URL = '/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken } = get(authStore);
    
    const headers: HeadersInit = {
      ...options.headers,
    };

    // Add Authorization header if we have an access token
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add Content-Type for JSON bodies
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    // Handle 401 - token expired
    if (response.status === 401 && accessToken) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the original request
        const { accessToken: newToken } = get(authStore);
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        return this.handleResponse<T>(retryResponse);
      }
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'An error occurred', data.details);
      }
      
      return data;
    }

    if (!response.ok) {
      throw new ApiError(response.status, 'An error occurred');
    }

    return response as any;
  }

  // Auth endpoints
  async register(email: string, password: string) {
    return this.request<{
      userId: number;
      email: string;
      apiKey: string;
      message: string;
    }>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken() {
    try {
      const data = await this.request<{ accessToken: string }>('/auth/refresh-token', {
        method: 'POST',
      });
      authStore.setAccessToken(data.accessToken);
      return true;
    } catch (error) {
      authStore.logout();
      return false;
    }
  }

  async logout() {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  // Receipt endpoints
  async uploadReceipt(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { accessToken } = get(authStore);
    
    const response = await fetch(`${API_BASE_URL}/image/split-and-analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
      credentials: 'include',
    });

    return this.handleResponse<{
      uploadId: number;
      message: string;
      originalImageUrl: string;
      markedImageUrl?: string;
      successful_receipts: Array<{
        receiptId: number;
        imageUrl: string;
        data: {
          merchantName: string;
          total: number;
          tax: number;
          transactionDate: string;
          keywords: string[];
          items: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
            keywords: string[];
          }>;
        };
      }>;
      failed_receipts: Array<{
        receiptId: number;
        imageUrl: string;
        error: string;
      }>;
    }>(response);
  }

  async downloadCSV() {
    const { accessToken } = get(authStore);
    
    const response = await fetch(`${API_BASE_URL}/users/me/receipts/export-csv`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(response.status, data.error || data.message || 'Failed to export CSV');
    }

    return response.blob();
  }

  async getImageUrl(filename: string): Promise<string> {
    const { accessToken } = get(authStore);
    
    const response = await fetch(`${API_BASE_URL}/files/${filename}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to load image');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // Receipt retrieval endpoints
  async getUpload(uploadId: number) {
    return this.request<{
      uploadId: number;
      status: string;
      images: {
        original: string;
        marked?: string;
        splitReceipts: string[];
      };
      statistics: {
        totalDetected: number;
        successful: number;
        failed: number;
        processing: number;
      };
      message: string;
      receipts: {
        successful: Array<any>;
        failed: Array<any>;
        processing: Array<any>;
        all: Array<any>;
      };
      errors?: string[];
    }>(`/receipts/${uploadId}`, {
      method: 'GET',
    });
  }

  async getReceipt(uploadId: number, receiptId: number) {
    return this.request<{
      id: number;
      uploadId: number;
      imageUrl: string;
      status: string;
      storeName: string;
      totalAmount: string;
      taxAmount?: string;
      transactionDate?: string;
      keywords?: string[];
      lineItems: Array<{
        id: number;
        description: string;
        amount: string;
        unit: string;
        pricePerUnit: string;
        totalPrice: string;
        keywords?: string[];
      }>;
      error?: string;
    }>(`/receipts/${uploadId}/receipt/${receiptId}`, {
      method: 'GET',
    });
  }

  async getAllUploads() {
    // This endpoint might not exist yet, but we'll need it for the history page
    // For now, we'll track uploads in the queue store
    return this.request<Array<{
      uploadId: number;
      createdAt: string;
      status: string;
      statistics: {
        totalDetected: number;
        successful: number;
        failed: number;
        processing: number;
      };
    }>>('/uploads', {
      method: 'GET',
    }).catch(() => {
      // If endpoint doesn't exist, return empty array
      return [];
    });
  }

  async reprocessReceipt(uploadId: number) {
    return this.request<{
      uploadId: number;
      message: string;
      statusUrl: string;
    }>(`/receipts/${uploadId}/reprocess`, {
      method: 'POST',
    });
  }

  async reprocessSingleReceipt(uploadId: number, receiptId: number) {
    return this.request<{
      uploadId: number;
      receiptId: number;
      message: string;
      statusUrl: string;
    }>(`/receipts/${uploadId}/receipt/${receiptId}/reprocess`, {
      method: 'POST',
    });
  }

  async getUserUploads(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'status';
    sortOrder?: 'asc' | 'desc';
    status?: 'processing' | 'completed' | 'partly_completed' | 'failed';
  }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.status) params.append('status', options.status);

    const queryString = params.toString();
    const url = `/users/me/uploads${queryString ? `?${queryString}` : ''}`;

    return this.request<{
      uploads: Array<{
        uploadId: number;
        fileName: string;
        status: string;
        hasReceipts: boolean;
        createdAt: string;
        updatedAt: string;
        statistics: {
          totalDetected: number;
          successful: number;
          failed: number;
          processing: number;
        };
        images: {
          original: string;
          marked: string | null;
        };
      }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(url, {
      method: 'GET',
    });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
