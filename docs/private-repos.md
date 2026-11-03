# Private repos on github.com

Connect Diagit to GitHub once, so it can show diagrams and diffs in private repositories on github.com.

**Requirements:** a GitHub account with access to the repositories.

::: tip Not needed everywhere
Public repositories, GitLab and GitHub Enterprise work without this step. Diagit reads them with the login you already have in the browser.
:::

## Why this step exists

On github.com, the data of a pull request comes from `api.github.com`. Your login cookie for github.com does not reach that address, so Diagit needs its own read access for private repositories.

## 1. Install the GitHub App

Open Diagit's options and follow **install the GitHub App**, or go to [github.com/apps/miragon-diagit](https://github.com/apps/miragon-diagit/installations/new). Choose the accounts and repositories Diagit may read. It gets read-only access to those repositories and no others.

## 2. Connect GitHub

Back in the options, press **Connect GitHub**. Diagit shows a code. Open `github.com/login/device`, enter the code and confirm. The options then show **Connected as @your-login**.

## Disconnect

**Disconnect** removes the access token from this browser. To remove the app itself, uninstall it and revoke its authorisation in your GitHub settings (**Uninstall on GitHub**).

## Next steps

- [Privacy and permissions](./privacy): where the token is stored and where it is sent.
- [Review a model change](./review-changes): the diff in your private pull requests.
