const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [],
  style: [
    {
      selector: 'node',
      style: {
        'background-color': '#0074D9',
        'label': 'data(id)',
        'color': '#fff',
        'text-valign': 'center',
        'text-halign': 'center'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#aaa',
        'target-arrow-color': '#aaa',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(capacity)'
      }
    },
    {
      selector: '.maxflow-path',
      style: {
        'line-color': '#FF851B',
        'target-arrow-color': '#FF851B',
        'width': 4
      }
    },
    {
      selector: '.saturated',
      style: {
        'line-color': '#FF4136',
        'target-arrow-color': '#FF4136',
        'width': 5
      }
    },
    {
      selector: '.flow-node',
      style: {
        'background-color': '#2ECC40'
      }
    },
    {
      selector: '.sink',
      style: {
        'background-color': '#FF4136'
      }
    }
  ],
  layout: {
    name: 'breadthfirst',
    directed: true,
    padding: 30
  }
});

// Sample graph
cy.add([
  { data: { id: 'A' } },
  { data: { id: 'B' } },
  { data: { id: 'C' } },
  { data: { id: 'D' } },
  { data: { id: 'E' } },
  { data: { source: 'A', target: 'B', capacity: '10' } },
  { data: { source: 'A', target: 'C', capacity: '5' } },
  { data: { source: 'B', target: 'C', capacity: '15' } },
  { data: { source: 'B', target: 'D', capacity: '1' } },
  { data: { source: 'C', target: 'D', capacity: '10' } },
  { data: { source: 'B', target: 'E', capacity: '25' } },
  { data: { source: 'E', target: 'D', capacity: '2' } }
]);

cy.layout({
  name: 'breadthfirst',
  directed: true,
  padding: 30
}).run();

cy.fit();

function calculateMaxFlow() {
  const elements = cy.elements().jsons();
  const nodes = elements.filter(e => e.group === 'nodes');
  const edges = elements.filter(e => e.group === 'edges');

  const allNodeIds = nodes.map(n => n.data.id);
  const incoming = new Set(edges.map(e => e.data.target));
  const outgoing = new Set(edges.map(e => e.data.source));

  const source = allNodeIds.find(id => !incoming.has(id));
  const sink = allNodeIds.find(id => !outgoing.has(id));

  if (!source || !sink) {
    alert('Source/sink not found');
    return;
  }

  cy.nodes().removeClass('flow-node sink');
  cy.edges().removeClass('maxflow-path saturated');

  cy.getElementById(sink).addClass('sink');

  fetch('http://localhost:3000/maxflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, edges, source, sink })
  })
    .then(res => res.json())
    .then(data => {
      alert('Max Flow: ' + data.maxFlow);

      data.flowEdges.forEach(edge => {
        const cyEdge = cy.edges().filter(e =>
          e.data('source') === edge.from && e.data('target') === edge.to
        );
        cyEdge.forEach(e => {
          const capacity = e.data('capacity');
          e.data('label', `${edge.flow}/${capacity}`);
        });
      });

      data.flowPathEdges.forEach(segment => {
        cy.edges().filter(e =>
          e.data('source') === segment.from && e.data('target') === segment.to
        ).addClass('maxflow-path');
      });

      data.saturatedEdges.forEach(segment => {
        cy.edges().filter(e =>
          e.data('source') === segment.from && e.data('target') === segment.to
        ).addClass('saturated');
      });

      data.flowPathNodes.forEach(id => {
        cy.getElementById(id).addClass('flow-node');
      });
    })
    .catch(err => {
      alert("Network or server error: " + err.message);
    });
}
