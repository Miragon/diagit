import { describe, expect, it } from 'vitest'
import { FetchScope } from '../src/background/FetchScope'

const scope = new FetchScope()

describe('FetchScope.grantFor (which urls a page may have fetched)', () => {
  it('allows the origin of the page without auth', () => {
    expect(scope.grantFor('https://github.com', 'https://github.com/o/r/raw/main/a.bpmn')).toEqual({
      withAuth: false,
    })
    expect(
      scope.grantFor(
        'https://gitlab.com',
        'https://gitlab.com/api/v4/projects/g%2Fp/merge_requests/2',
      ),
    ).toEqual({ withAuth: false })
  })

  it('allows a github.com page to call api.github.com with auth', () => {
    expect(
      scope.grantFor('https://github.com', 'https://api.github.com/repos/o/r/pulls/1'),
    ).toEqual({ withAuth: true })
  })

  it('allows an Enterprise or self-hosted page its own API, never with auth', () => {
    expect(
      scope.grantFor('https://ghe.corp.example', 'https://ghe.corp.example/api/v3/repos/o/r'),
    ).toEqual({ withAuth: false })
    expect(
      scope.grantFor('http://localhost:4567', 'http://localhost:4567/api/v3/repos/octo/flows'),
    ).toEqual({ withAuth: false })
  })

  it('refuses other origins', () => {
    expect(scope.grantFor('https://gitlab.com', 'https://api.github.com/repos/o/r')).toBeNull()
    expect(
      scope.grantFor('https://ghe.corp.example', 'https://api.github.com/repos/o/r'),
    ).toBeNull()
    expect(scope.grantFor('https://github.com', 'https://evil.example/steal')).toBeNull()
    expect(
      scope.grantFor('https://github.com', 'https://raw.githubusercontent.com/o/r/a'),
    ).toBeNull()
    expect(scope.grantFor('https://github.com', 'https://api.github.com.evil.example/x')).toBeNull()
    expect(scope.grantFor('http://localhost:4567', 'http://localhost:9999/api/v3')).toBeNull()
    expect(scope.grantFor('https://github.com', 'http://github.com/o/r/raw/a')).toBeNull()
  })

  it('refuses malformed and non-web urls', () => {
    expect(scope.grantFor('https://github.com', 'not a url')).toBeNull()
    expect(scope.grantFor('https://github.com', '/o/r/raw/a.bpmn')).toBeNull()
    expect(scope.grantFor('null', 'data:text/plain,x')).toBeNull()
    expect(scope.grantFor('null', 'file:///etc/passwd')).toBeNull()
  })
})

describe('FetchScope.allowsResponseFrom (where a redirected fetch may end up)', () => {
  it('allows every url the page may fetch', () => {
    expect(scope.allowsResponseFrom('https://gitlab.com', 'https://gitlab.com/g/renamed')).toBe(
      true,
    )
    expect(
      scope.allowsResponseFrom('https://github.com', 'https://api.github.com/repositories/1'),
    ).toBe(true)
  })

  it('allows a github.com page to end up on raw.githubusercontent.com', () => {
    expect(
      scope.allowsResponseFrom(
        'https://github.com',
        'https://raw.githubusercontent.com/o/r/main/a.bpmn?token=abc',
      ),
    ).toBe(true)
  })

  it('refuses raw.githubusercontent.com for other pages and any other origin', () => {
    expect(
      scope.allowsResponseFrom('https://gitlab.com', 'https://raw.githubusercontent.com/o/r/a'),
    ).toBe(false)
    expect(scope.allowsResponseFrom('https://github.com', 'https://evil.example/x')).toBe(false)
    expect(scope.allowsResponseFrom('https://github.com', '')).toBe(false)
  })
})
