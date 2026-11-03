# Self-hosted instances

Turn Diagit on for a self-hosted GitLab or GitHub Enterprise instance. Each domain needs your permission once.

**Requirements:** Diagit installed, and access to the instance in this browser.

## 1. Allow the domain

Open a model file or a merge request on your instance and click the Diagit icon in the browser toolbar. The browser asks whether Diagit may read the domain. Allow it.

You can also right-click the page and choose **Enable Diagit on this domain**.

## 2. Reload the page

Reload the page. Diagit now draws the model, as on github.com and gitlab.com.

## Add or remove a domain in the options

Open the options: click the Diagit icon on any page that is not a Git host, or open the extension's options from the browser's extension menu. Under **Self-hosted instances**, enter the address, choose **GitLab** or **GitHub**, and press **Add instance**. **Remove** takes a domain away again.

<figure class="shot">
  <img src="/shots/options.png" alt="Diagit's options page with the sections Self-hosted instances, with an address field, a host type and Add instance, and GitHub access for private repos, with Connect GitHub" />
  <figcaption>Diagit's options page</figcaption>
</figure>

## Troubleshooting

::: details "Permission was not granted."
The browser's permission dialog was closed or denied. Add the domain again and choose **Allow**.
:::

::: details "Enter a valid http(s) URL."
Enter the address with its scheme, for example `https://gitlab.example.com`.
:::

## Next steps

- [Privacy and permissions](./privacy): what Diagit does with the access to a domain.
- [Review a model change](./review-changes): the diff in your merge requests.
