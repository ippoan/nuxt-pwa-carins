import { describe, it, expect } from 'vitest'
import { mapIngestResponse, isSameOrigin } from '../../../server/utils/smb-ingest-logic'

describe('mapIngestResponse', () => {
  it('202 dry_run:true → accepted dryRun:true', () => {
    expect(mapIngestResponse(202, '{"status":"accepted","dry_run":true}')).toEqual({
      status: 202,
      body: { status: 'accepted', dryRun: true },
    })
  })
  it('202 dry_run:false → dryRun:false', () => {
    expect(mapIngestResponse(202, '{"status":"accepted","dry_run":false}').body).toEqual({
      status: 'accepted',
      dryRun: false,
    })
  })
  it('202 で dry_run 欠落 / null body → dryRun:false', () => {
    expect(mapIngestResponse(202, '{}').body).toEqual({ status: 'accepted', dryRun: false })
    expect(mapIngestResponse(202, 'null').body).toEqual({ status: 'accepted', dryRun: false })
  })
  it('202 で壊れた JSON → 502', () => {
    expect(mapIngestResponse(202, 'not json')).toEqual({ status: 502, body: { status: 'error' } })
  })
  it('409 → busy (body 不問)', () => {
    expect(mapIngestResponse(409, 'garbage')).toEqual({ status: 409, body: { status: 'busy' } })
  })
  it('500 / その他 → 502 で上流 body を返さない', () => {
    expect(mapIngestResponse(500, '{"status":"error","reason":"X"}')).toEqual({
      status: 502,
      body: { status: 'error' },
    })
    expect(mapIngestResponse(404, '')).toEqual({ status: 502, body: { status: 'error' } })
  })
})

describe('isSameOrigin', () => {
  it('一致', () => {
    expect(isSameOrigin('https://a.example', 'a.example', 'https')).toBe(true)
  })
  it('不一致', () => {
    expect(isSameOrigin('https://evil.example', 'a.example', 'https')).toBe(false)
    expect(isSameOrigin('http://a.example', 'a.example', 'https')).toBe(false)
  })
  it('Origin 欠落 / Host 欠落', () => {
    expect(isSameOrigin(undefined, 'a.example', 'https')).toBe(false)
    expect(isSameOrigin('https://a.example', undefined, 'https')).toBe(false)
  })
})
