# Privacy and permissions

What Diagit reads, what it stores and where anything goes. In short: it collects no data, and file contents only travel between your browser and the Git host you are viewing.

## What Diagit reads

- **Model files on pages you open.** On a supported Git host, Diagit reads the content of the model files on the page, with the login you already have in the browser. That is how private repositories on GitLab and GitHub Enterprise work.
- **Pull request and commit data.** For a diff it reads which files changed and their two versions, from the same host. On github.com, the list of changed files comes from `api.github.com`, without a token for public repositories.
- **Local files** in the viewer page are read in the browser and never sent anywhere.

Diagit has no server. There are no analytics and no tracking.

## What Diagit stores

Everything stays in your browser's extension storage:

| Stored                                     | Why                                | Removed by                    |
| ------------------------------------------ | ---------------------------------- | ----------------------------- |
| Self-hosted domains you allow              | To know where to draw models       | **Remove** in the options     |
| A GitHub access token, only if you connect | Private repositories on github.com | **Disconnect** in the options |

The token is sent only to `api.github.com`, and only for the data of pull requests and commits.

## Permissions

| Permission                                                        | Used for                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Access to `github.com`, `gitlab.com`, `raw.githubusercontent.com` | Read and draw model files on these sites                                       |
| Access to `api.github.com`                                        | Pull request and commit data on github.com, with the token if you connected    |
| Access to a self-hosted domain                                    | Only after you allow that domain                                               |
| `scripting`, `storage`                                            | Draw the viewer on the page; remember your domains and the token               |
| `contextMenus`, `activeTab`                                       | **Enable Diagit on this domain** from the toolbar icon or the right-click menu |

## Where this is decided

The full privacy policy is [PRIVACY.md](https://github.com/Miragon/diagit/blob/main/PRIVACY.md) in the repository, and the code is open under the MIT License.

## Next steps

- [Private repos on github.com](./private-repos): the optional GitHub connection.
- [Self-hosted instances](./self-hosted): allow and remove domains.
