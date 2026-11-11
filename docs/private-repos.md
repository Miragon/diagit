# Private repos on github.com

Connect Diagit to GitHub once, so it can show the diff in pull requests and commits of private repositories on github.com. Diagrams on file pages work without this step, with the login you already have.

**Requirements:** a GitHub account with access to the repositories.

::: tip Not needed everywhere
Public repositories, GitLab and GitHub Enterprise work without this step. Diagit reads them with the login you already have in the browser. A self-hosted GitLab or GitHub Enterprise needs its domain allowed once instead, see [Self-hosted instances](./self-hosted).
:::

## Why this step exists

On github.com, the data of a pull request comes from `api.github.com`. Your login cookie for github.com does not reach that address, so Diagit needs its own read access for private repositories.

## 1. Install the GitHub App

Open Diagit's options and follow **install the GitHub App**, or go to [github.com/apps/miragon-diagit](https://github.com/apps/miragon-diagit/installations/new). Choose the accounts and repositories Diagit may read. It gets read-only access to those repositories and no others.

## 2. Connect GitHub

Back in the options, press **Connect GitHub**. Diagit shows a code. Open `github.com/login/device`, enter the code and confirm. The options then show **Connected as @your-login**.

## Troubleshooting

::: details The diff shows "GitHub returned 403"
Either the anonymous rate limit of `api.github.com` is used up, which can happen in public repositories when you are not connected, or your organisation uses SSO and has not authorised the app. Connect GitHub as described above, and, if your organisation uses SSO, authorise the app for it.
:::

::: details The options say the GitHub connection expired
GitHub no longer renews the connection, because its refresh token ran out or the app's authorisation was revoked. Diagit then removes the tokens from this browser. Press **Connect GitHub** again.
:::

## Disconnect

**Disconnect** removes the access token and its refresh token from this browser. To remove the app itself, uninstall it and revoke its authorisation in your GitHub settings (**Uninstall on GitHub**).

## Next steps

- [Privacy and permissions](./privacy): where the token is stored and where it is sent.
- [Review a model change](./review-changes): the diff in your private pull requests.
