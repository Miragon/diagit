# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately via GitHub's **Security Advisories** ("Report a vulnerability")
on this repository, with a description, reproduction steps, and impact. We aim to
acknowledge within 3 business days and to ship a fix or mitigation as quickly as
the severity warrants. Please give a reasonable window to address the issue
before any public disclosure.

## Scope

This is a client-side browser extension. It ships no remote code (all
dependencies, including bpmn-js, are bundled) and requests the minimum
permissions needed. Relevant concerns include: content-script injection,
permission escalation, and handling of untrusted `.bpmn` XML.

## Known limitations

These are accepted risks, not vulnerabilities:

- **Device-code phishing.** Connecting GitHub uses the device flow with a public
  client ID, so anyone can start a code prompt in Diagit's name and ask you to
  enter it. The impact is limited: the GitHub App is read-only (contents,
  metadata, pull requests) and only reaches repositories it is installed on.
  Only enter a code you requested yourself from the Diagit options page.
- **Token storage.** The GitHub access token is stored unencrypted in the
  browser's extension storage (`storage.local`), which the extension's own
  contexts, including its content scripts, can read. It is never sent anywhere
  but `api.github.com`.
- **Self-hosted over `http:`.** Self-hosted instances can be added with an
  `http:` address. Diagit's requests to it then carry your session cookies
  unencrypted, as the page itself does. Use `https:`.
