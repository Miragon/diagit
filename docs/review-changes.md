# Review a model change

See what changed in a `.bpmn` file as two diagrams side by side, with every added, removed, changed and moved element marked, instead of reading the XML diff.

<figure class="shot">
  <img src="/shots/pr-diff.png" alt="Diagit's Diff view of order.bpmn: the Before version on the left, the After version on the right, and a toolbar with a legend that counts added, removed, changed and moved elements, the Prev, Next and All buttons and the number of changes" />
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

**Diff** shows the version before the change on the left, labelled **Before**, and after it on the right, labelled **After**. **Plain** shows the model as it is after the change. The panel opens on **Diff** when the file has both versions, and on **Plain** when the file was added or deleted.

## Read the colours

Diagit compares the two versions element by element, by id:

| Colour | Marks   | Meaning                                                                                                        |
| ------ | ------- | -------------------------------------------------------------------------------------------------------------- |
| Green  | Added   | The element exists only in the new version.                                                                    |
| Red    | Removed | The element exists only in the old version.                                                                    |
| Blue   | Changed | Same id, but its content changed: name, type, flows, conditions or properties, including `zeebe:*` extensions. |
| Yellow | Moved   | Same id and content, only its position, size, label or line changed.                                           |

The legend in the toolbar counts the elements in every category.

::: tip An element with a new id
Diagit matches elements by id. When a change gives an element a new id, it shows as removed on the left and added on the right.
:::

## Step through the changes

**Next** and **Prev** in the toolbar select one change after the other and zoom both sides to it. Next to them Diagit shows which change is selected, for example "2 of 7", or how many changes there are when none is selected. **All** clears the selection and fits both diagrams again. The **−**, **Fit** and **+** buttons zoom by hand.

## Limits

- The diff covers BPMN. DMN, Wardley Maps and the other notations are drawn in a pull request as on the file page, without before and after.
- Moving many elements, for example after an automatic layout, marks all of them as moved. Their content is unchanged.

## Next steps

- [Private repos on github.com](./private-repos): the one-time setup for private repositories.
- [Self-hosted instances](./self-hosted): the diff on your own GitLab or GitHub Enterprise.
