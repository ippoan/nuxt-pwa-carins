import { describe, it, expect } from 'vitest'
import {
  extractTenantIdFromAuth,
  buildProxyHeaders,
  isDownloadPath,
  isBinaryResponse,
} from '../../../../server/utils/proxy-logic'

function fakeJwt(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.sig`
}

describe('extractTenantIdFromAuth', () => {
  it('returns empty for undefined', () => {
    expect(extractTenantIdFromAuth(undefined)).toEqual({})
  })

  it('extracts tenant_id from JWT', () => {
    const jwt = fakeJwt({ tenant_id: 'tenant-123' })
    const result = extractTenantIdFromAuth(`Bearer ${jwt}`)
    expect(result.authorization).toBe(`Bearer ${jwt}`)
    expect(result.tenantId).toBe('tenant-123')
  })

  it('falls back to org claim', () => {
    const jwt = fakeJwt({ org: 'org-456' })
    const result = extractTenantIdFromAuth(`Bearer ${jwt}`)
    expect(result.tenantId).toBe('org-456')
  })

  it('tenant_id takes precedence over org', () => {
    const jwt = fakeJwt({ tenant_id: 'tenant', org: 'org' })
    const result = extractTenantIdFromAuth(`Bearer ${jwt}`)
    expect(result.tenantId).toBe('tenant')
  })

  it('handles invalid JWT gracefully', () => {
    const result = extractTenantIdFromAuth('Bearer invalid-jwt')
    expect(result.authorization).toBe('Bearer invalid-jwt')
    expect(result.tenantId).toBeUndefined()
  })
})

describe('buildProxyHeaders', () => {
  it('sets Content-Type', () => {
    const headers = buildProxyHeaders('application/json', undefined, undefined)
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('sets Authorization and X-Tenant-ID from JWT', () => {
    const jwt = fakeJwt({ tenant_id: 'tid' })
    const headers = buildProxyHeaders(undefined, `Bearer ${jwt}`, undefined)
    expect(headers['Authorization']).toBe(`Bearer ${jwt}`)
    expect(headers['X-Tenant-ID']).toBe('tid')
  })

  it('explicit X-Tenant-ID overrides JWT', () => {
    const jwt = fakeJwt({ tenant_id: 'from-jwt' })
    const headers = buildProxyHeaders(undefined, `Bearer ${jwt}`, 'explicit')
    expect(headers['X-Tenant-ID']).toBe('explicit')
  })

  it('returns empty headers when no inputs', () => {
    const headers = buildProxyHeaders(undefined, undefined, undefined)
    expect(headers).toEqual({})
  })
})

describe('isDownloadPath', () => {
  it('returns true for download paths', () => {
    expect(isDownloadPath('files/uuid/download')).toBe(true)
  })

  it('returns false for non-download paths', () => {
    expect(isDownloadPath('files')).toBe(false)
  })
})

describe('isBinaryResponse', () => {
  it('returns true for non-JSON content type', () => {
    expect(isBinaryResponse('image/png')).toBe(true)
    expect(isBinaryResponse('application/octet-stream')).toBe(true)
  })

  it('returns false for JSON content type', () => {
    expect(isBinaryResponse('application/json')).toBe(false)
    expect(isBinaryResponse('application/json; charset=utf-8')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isBinaryResponse(null)).toBe(false)
    expect(isBinaryResponse(undefined)).toBe(false)
  })
})
