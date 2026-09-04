import { apiRequest } from "@/lib/api/client";
import type { CatalogService, Page } from "@/types/domain";

/**
 * Typed wrappers for servora-services' public read-only catalog contract,
 * reached through the API Gateway at /api/v1/services/*. These are the
 * only calls this app makes into the catalog — provider-owned data (which
 * services a provider offers, and at what price) lives entirely in
 * servora-provider and is never duplicated here.
 */

export function listCatalogServices(params?: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  categorySlug?: string;
}): Promise<Page<CatalogService>> {
  return apiRequest<Page<CatalogService>>("/api/v1/services/catalog", { query: params });
}

export function getCatalogService(idOrSlug: string): Promise<CatalogService> {
  return apiRequest<CatalogService>(`/api/v1/services/catalog/${idOrSlug}`);
}
