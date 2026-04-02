const FALLBACK_API_BASE_URL = 'http://localhost:3000/api';

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL;
}

export function getSocketServerUrl(): string {
  const apiUrl = new URL(getApiBaseUrl());
  return apiUrl.origin;
}
