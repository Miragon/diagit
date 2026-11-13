# Supported notations

Every notation Diagit draws, the file endings it recognises and where you see it.

| Notation        | File endings       | File page | PR / MR diff |
| --------------- | ------------------ | --------- | ------------ |
| BPMN            | `.bpmn`            | yes       | yes          |
| DMN             | `.dmn`             | yes       | not yet      |
| Wardley Map     | `.owm`, `.wmap`    | yes       | not yet      |
| Team Topologies | `.tt`, `.ttm.json` | yes       | not yet      |
| Event Storming  | `.storm`           | yes       | not yet      |
| Context Map     | `.cm`, `.cm.json`  | yes       | not yet      |
| Value Chain     | `.vc`, `.vc.json`  | yes       | not yet      |
| Excalidraw      | `.excalidraw`      | yes       | not yet      |

Diagit recognises a file only by its ending. A Value Chain stored as `value.json` stays text; `value.vc.json` is drawn.

BPMN and DMN render with [bpmn-js](https://github.com/bpmn-io/bpmn-js) and [dmn-js](https://github.com/bpmn-io/dmn-js) from bpmn.io. Wardley Maps, Team Topologies, Event Storming, Context Maps and Value Chains use the renderers of the Miragon modelers. Excalidraw files use Excalidraw's own export code.

## How they look

Each picture is the test file of that notation in Diagit's viewer.

<div class="diagram-pair">
  <figure class="diagram">
    <img src="/shots/notations/bpmn-plain.png" alt="A BPMN order process with a gateway, a payment step with a 3-day reminder and a rejection path" />
    <figcaption>BPMN · order.bpmn</figcaption>
  </figure>
  <figure class="diagram">
    <img src="/shots/notations/event-storming.png" alt="An Event Storming board for an order checkout, from Customer and Place Order to Order Shipped" />
    <figcaption>Event Storming · .storm</figcaption>
  </figure>
</div>

<div class="diagram-pair">
  <figure class="diagram">
    <img src="/shots/notations/wardley.png" alt="A Wardley Map of a tea shop, from Business and Public down to Kettle and Power" />
    <figcaption>Wardley Map · .owm</figcaption>
  </figure>
  <figure class="diagram">
    <img src="/shots/notations/team-topologies.png" alt="A Team Topologies diagram with stream-aligned teams, an enabling team and a platform" />
    <figcaption>Team Topologies · .tt</figcaption>
  </figure>
</div>

<div class="diagram-pair">
  <figure class="diagram">
    <img src="/shots/notations/context-map.png" alt="A Context Map of a conference planner with core, supporting and generic subdomains and their relationships" />
    <figcaption>Context Map · .cm</figcaption>
  </figure>
  <figure class="diagram">
    <img src="/shots/notations/value-chain.png" alt="A Value Chain from Inbound Logistics through Operations to Service" />
    <figcaption>Value Chain · .vc.json</figcaption>
  </figure>
</div>

## Open a file from your disk

Diagit has its own viewer page for files that are not in a repository. Drop a file on it or press **Open file…**. The file is read in the browser and never leaves your machine.

<figure class="shot">
  <img src="/shots/standalone-viewer.png" alt="Diagit's Diagram Viewer page with an Event Storming board opened from disk and an Open file button at the top right" />
  <figcaption>Diagit's Diagram Viewer with a local .storm file</figcaption>
</figure>

When Diagit cannot find where to show its view on a file page, for example after GitHub or GitLab changed their layout, it says so in a notice at the bottom right. **Open in Diagit** in that notice opens the file in this viewer. Diagit reads it with the login you already have in the browser, and only from GitHub, GitLab and the domains you allowed.

To open the viewer, click the Diagit icon in the browser toolbar and then **Open a file** on Diagit's options page. You can also open it by address:

| Browser | Address                                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Chrome  | `chrome-extension://bjphfmmlciflmdcnpfpbnkmgnkiabfdh/viewer.html`                                                          |
| Edge    | `extension://pphcelcgicmpdkkbginmkdogceepigen/viewer.html`                                                                 |
| Firefox | `moz-extension://<Internal UUID>/viewer.html`, the UUID is listed for Diagit under `about:debugging#/runtime/this-firefox` |

## Next steps

- [Review a model change](./review-changes): the diff for BPMN.
- [Getting started](./getting-started): install Diagit and open a first model.
