import { apiRequest } from "@/lib/api/client";
import type { CatalogService, Category, Page, RequirementField } from "@/types/domain";

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

export function listCategories(params?: { page?: number; pageSize?: number }): Promise<Page<Category>> {
  return apiRequest<Page<Category>>("/api/v1/services/categories", { query: params });
}

/**
 * The fields a customer will be asked to fill in when requesting this
 * service — owned entirely by servora-services (service_requirement_fields).
 * This is request-form metadata, not a provider qualification record: there
 * is no field on servora-provider's provider_services table to store a
 * provider's own answers to these, so Provider Web only ever renders them
 * read-only, as a preview of what booking this service will ask a customer.
 */
export function getServiceRequirements(idOrSlug: string): Promise<{ fields: RequirementField[] }> {
  return apiRequest<{ fields: RequirementField[] }>(`/api/v1/services/catalog/${idOrSlug}/requirements`);
}
