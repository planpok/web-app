const FALLBACK_API_BASE_URL = 'http://localhost:3000/api';
const DEFAULT_API_PORT = '3000';

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl && configuredBaseUrl !== 'undefined') {
    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}/api`;
  }

  return FALLBACK_API_BASE_URL;
}

export function getSocketServerUrl(): string {
  const apiUrl = new URL(getApiBaseUrl());
  return apiUrl.origin;
}
