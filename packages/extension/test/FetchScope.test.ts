import { describe, expect, it } from 'vitest'
import { FetchScope } from '../src/background/FetchScope'

const scope = new FetchScope()

describe('FetchScope.grantFor (which urls a page may have fetched)', () => {
  it('allows the origin of the page without auth', () => {
    expect(
      scope.grantFor(
        'https://github.com/o/r/blob/main/a.bpmn',
        'https://github.com/o/r/raw/main/a.bpmn',
      ),
    ).toEqual({ withAuth: false })
    expect(
      scope.grantFor(
        'https://gitlab.com/g/p/-/merge_requests/2',
        'https://gitlab.com/api/v4/projects/g%2Fp/merge_requests/2',
      ),
    ).toEqual({ withAuth: false })
  })

  it('allows a github.com page to call api.github.com with auth', () => {
    expect(
      scope.grantFor(
        'https://github.com/o/r/pull/1/files',
        'https://api.github.com/repos/o/r/pulls/1',
      ),
    ).toEqual({ withAuth: true })
  })

  it('allows an Enterprise or self-hosted page its own API, never with auth', () => {
    expect(
      scope.grantFor(
        'https://ghe.corp.example/o/r/pull/1',
        'https://ghe.corp.example/api/v3/repos/o/r',
      ),
    ).toEqual({ withAuth: false })
    expect(
      scope.grantFor(
        'http://localhost:4567/octo/flows/pull/1',
        'http://localhost:4567/api/v3/repos/octo/flows',
      ),
    ).toEqual({ withAuth: false })
  })

  it('refuses other origins', () => {
    expect(scope.grantFor('https://gitlab.com/g/p', 'https://api.github.com/repos/o/r')).toBeNull()
    expect(
      scope.grantFor('https://ghe.corp.example/o/r', 'https://api.github.com/repos/o/r'),
    ).toBeNull()
    expect(scope.grantFor('https://github.com/o/r', 'https://evil.example/steal')).toBeNull()
    expect(
      scope.grantFor('https://github.com/o/r', 'https://raw.githubusercontent.com/o/r/a'),
    ).toBeNull()
    expect(
      scope.grantFor('https://github.com/o/r', 'https://api.github.com.evil.example/x'),
    ).toBeNull()
    expect(scope.grantFor('http://localhost:4567/o/r', 'http://localhost:9999/api/v3')).toBeNull()
    expect(scope.grantFor('https://github.com/o/r', 'http://github.com/o/r/raw/a')).toBeNull()
  })

  it('refuses malformed and non-web urls', () => {
    expect(scope.grantFor('https://github.com/o/r', 'not a url')).toBeNull()
    expect(scope.grantFor('https://github.com/o/r', '/o/r/raw/a.bpmn')).toBeNull()
    expect(scope.grantFor('not a url', 'https://github.com/o/r')).toBeNull()
    expect(scope.grantFor('about:blank', 'data:text/plain,x')).toBeNull()
    expect(scope.grantFor('file:///etc/a', 'file:///etc/passwd')).toBeNull()
  })
})
