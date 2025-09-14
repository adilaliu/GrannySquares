"use client";

/**
 * Client-side API utilities for standardized response handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiListResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Standardized API request handler that handles common error patterns
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, error: "Network error occurred" };
  }
}

/**
 * Helper for GET requests
 */
export async function apiGet<T = any>(
  url: string,
  params?: Record<string, string | number | boolean>,
): Promise<ApiResponse<T>> {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const urlWithParams = params ? `${url}?${searchParams.toString()}` : url;

  return apiRequest(urlWithParams, { method: "GET" });
}

/**
 * Helper for POST requests
 */
export async function apiPost<T = any>(
  url: string,
  body?: any,
): Promise<ApiResponse<T>> {
  return apiRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for PUT requests
 */
export async function apiPut<T = any>(
  url: string,
  body?: any,
): Promise<ApiResponse<T>> {
  return apiRequest(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest(url, { method: "DELETE" });
}
