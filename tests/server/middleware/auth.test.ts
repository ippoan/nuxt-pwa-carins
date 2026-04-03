import { describe, it, expect } from 'vitest'
import { resolveAuthAction, getParentDomainFromHost, type AuthConfig, type AuthRequest } from '../../../server/middleware/auth-logic'

const defaultConfig: AuthConfig = {
  apiBackend: 'rust-alc-api',
  authWorkerUrl: 'https://auth.test',
}

function makeReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  const url = new URL(overrides.pathname ? `https://example.com${overrides.pathname}` : 'https://example.com/')
  if (overrides.searchParams) {
    for (const [k, v] of overrides.searchParams.entries()) {
      url.searchParams.set(k, v)
    }
  }
  return {
    pathname: url.pathname,
    origin: url.origin,
    hostname: overrides.hostname ?? url.hostname,
    searchParams: url.searchParams,
    cookie: overrides.cookie ?? undefined,
    lwDomainCookie: overrides.lwDomainCookie ?? undefined,
  }
}

describe('getParentDomainFromHost', () => {
  it('returns parent domain for 3+ parts', () => {
    expect(getParentDomainFromHost('sub.example.com')).toBe('.example.com')
    expect(getParentDomainFromHost('a.b.example.com')).toBe('.example.com')
  })

  it('returns undefined for 2-part hostname', () => {
    expect(getParentDomainFromHost('example.com')).toBeUndefined()
  })

  it('returns undefined for single part', () => {
    expect(getParentDomainFromHost('localhost')).toBeUndefined()
  })
})

describe('resolveAuthAction', () => {
  it('passes if backend is not rust-logi or rust-alc-api', () => {
    const action = resolveAuthAction({ apiBackend: 'other', authWorkerUrl: '' }, makeReq())
    expect(action.type).toBe('pass')
  })

  it('passes for /api/ paths', () => {
    const action = resolveAuthAction(defaultConfig, makeReq({ pathname: '/api/proxy/test' }))
    expect(action.type).toBe('pass')
  })

  it('passes if logi_auth_token cookie exists', () => {
    const action = resolveAuthAction(defaultConfig, makeReq({ cookie: 'valid-token' }))
    expect(action.type).toBe('pass')
  })

  it('passes if authWorkerUrl is empty', () => {
    const action = resolveAuthAction({ ...defaultConfig, authWorkerUrl: '' }, makeReq())
    expect(action.type).toBe('pass')
  })

  it('passes for ?lw_callback', () => {
    const req = makeReq()
    req.searchParams.set('lw_callback', '1')
    expect(resolveAuthAction(defaultConfig, req).type).toBe('pass')
  })

  it('passes for ?logout', () => {
    const req = makeReq()
    req.searchParams.set('logout', '')
    expect(resolveAuthAction(defaultConfig, req).type).toBe('pass')
  })

  it('passes for ?woff without lw', () => {
    const req = makeReq()
    req.searchParams.set('woff', '')
    expect(resolveAuthAction(defaultConfig, req).type).toBe('pass')
  })

  it('sets lw_domain cookie for ?woff&lw=ohishi', () => {
    const req = makeReq({ hostname: 'sub.example.com' })
    req.searchParams.set('woff', '')
    req.searchParams.set('lw', 'ohishi')
    const action = resolveAuthAction(defaultConfig, req)
    expect(action).toEqual({
      type: 'set-cookie-and-pass',
      name: 'lw_domain',
      value: 'ohishi',
      domain: '.example.com',
    })
  })

  it('redirects to LINE WORKS OAuth for ?lw=<domain>', () => {
    const req = makeReq({ hostname: 'sub.example.com' })
    req.searchParams.set('lw', 'ohishi')
    const action = resolveAuthAction(defaultConfig, req)
    expect(action.type).toBe('set-cookie-and-redirect')
    if (action.type === 'set-cookie-and-redirect') {
      expect(action.name).toBe('lw_domain')
      expect(action.value).toBe('ohishi')
      expect(action.domain).toBe('.example.com')
      expect(action.redirectUrl).toContain('https://auth.test/api/auth/lineworks/redirect?')
      expect(action.redirectUrl).toContain('domain=ohishi')
    }
  })

  it('redirects using stored lw_domain cookie', () => {
    const action = resolveAuthAction(defaultConfig, makeReq({ lwDomainCookie: 'saved' }))
    expect(action.type).toBe('redirect')
    if (action.type === 'redirect') {
      expect(action.redirectUrl).toContain('domain=saved')
    }
  })

  it('redirects to default auth login when no cookie or ?lw', () => {
    const action = resolveAuthAction(defaultConfig, makeReq())
    expect(action.type).toBe('redirect')
    if (action.type === 'redirect') {
      expect(action.redirectUrl).toContain('https://auth.mtamaramu.com/login?redirect_uri=')
    }
  })

  it('works with rust-logi backend too', () => {
    const action = resolveAuthAction({ apiBackend: 'rust-logi', authWorkerUrl: 'https://auth.test' }, makeReq())
    expect(action.type).toBe('redirect')
  })
})
