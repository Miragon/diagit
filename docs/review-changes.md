# Review a model change

See what changed in a `.bpmn` file as two diagrams side by side, with every added, removed, changed and moved element marked, instead of reading the XML diff.

<figure class="shot">
  <img src="/shots/pr-diff.png" alt="Diagit's Diff view: the base version of order.bpmn on the left, the head version on the right, with a legend that counts added, removed, changed and moved elements" />
  <figcaption>order.bpmn in a pull request, Diff view</figcaption>
</figure>

## Where the diff appears

Diagit adds its panel above the text diff of every changed `.bpmn` file on these pages:

| Host                          | Page                            |
| ----------------------------- | ------------------------------- |
| GitHub and GitHub Enterprise  | Pull request, **Files changed** |
| GitHub and GitHub Enterprise  | A single commit                 |
| GitLab and self-hosted GitLab | Merge request, **Changes**      |

The text diff below stays where it is. Diagit only adds to the page.

## Plain and Diff

**Diff** shows the version before the change on the left and after it on the right. **Plain** shows the model as it is after the change. The panel opens on **Diff** when the file has both versions, and on **Plain** when the file was added or deleted.

## Read the colours

Diagit compares the two versions element by element, by id:

| Colour | Marks   | Meaning                                                                                                        |
| ------ | ------- | -------------------------------------------------------------------------------------------------------------- |
| Green  | Added   | The element exists only in the new version.                                                                    |
| Red    | Removed | The element exists only in the old version.                                                                    |
| Blue   | Changed | Same id, but its content changed: name, type, flows, conditions or properties, including `zeebe:*` extensions. |
| Yellow | Moved   | Same id and content, only its position, size, label or line changed.                                           |

The legend above each side counts the elements in every category.

::: tip An element with a new id
Diagit matches elements by id. When a change gives an element a new id, it shows as removed on the left and added on the right.
:::

## Step through the changes

**Next** and **Prev** select one change after the other and zoom both sides to it. **All** clears the selection and fits both diagrams again. The **−**, **Fit** and **+** buttons zoom by hand.

## Limits

- The diff covers BPMN. DMN, Wardley Maps and the other notations are drawn in a pull request as on the file page, without before and after.
- Moving many elements, for example after an automatic layout, marks all of them as moved. Their content is unchanged.

## Next steps

- [Private repos on github.com](./private-repos): the one-time setup for private repositories.
- [Self-hosted instances](./self-hosted): the diff on your own GitLab or GitHub Enterprise.
