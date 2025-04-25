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
        'text-halign': 'center',
        'width': 50,
        'height': 50
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
      selector: '.flow-edge',
      style: {
        'label': 'data(label)'
      }
    },
    {
      selector: '.maxflow-path',
      style: {
        'line-color': '#FF851B',
        'target-arrow-color': '#FF851B',
        'width': 6,
        'z-index': 10
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
      selector: '.bottleneck',
      style: {
        'line-color': '#9400D3',  // Purple color for bottleneck edges
        'target-arrow-color': '#9400D3',
        'line-style': 'dashed',
        'opacity': 0.7
      }
    },
    {
      selector: '.flow-node',
      style: {
        'background-color': '#2ECC40'
      }
    },
    {
      selector: '.max-path-node',
      style: {
        'background-color': '#FF851B',
        'border-width': 3,
        'border-color': '#FF4136'
      }
    },
    {
      selector: '.critical-node',
      style: {
        'background-color': '#FFDC00',  // Yellow for critical nodes
        'border-width': 4,
        'border-color': '#FF851B',
        'width': 65,
        'height': 65
      }
    },
    {
      selector: '.source',
      style: {
        'background-color': '#3D9970',
        'width': 60,
        'height': 60
      }
    },
    {
      selector: '.sink',
      style: {
        'background-color': '#FF4136',
        'width': 60,
        'height': 60
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
  
  // Find source and sink
  const allNodeIds = nodes.map(n => n.data.id);
  const incoming = new Set(edges.map(e => e.data.target));
  const outgoing = new Set(edges.map(e => e.data.source));
  
  let source = allNodeIds.find(id => !incoming.has(id));
  let sink = allNodeIds.find(id => !outgoing.has(id));
  
  // If automatic detection fails, let the user select source and sink
  if (!source || !sink) {
    source = prompt("Enter source node ID:", allNodeIds[0]);
    if (!source || !allNodeIds.includes(source)) {
      alert("Invalid source node");
      return;
    }
    
    sink = prompt("Enter sink node ID:", allNodeIds[allNodeIds.length-1]);
    if (!sink || !allNodeIds.includes(sink)) {
      alert("Invalid sink node");
      return;
    }
  }
  
  // Reset styles
  cy.nodes().removeClass('flow-node source sink max-path-node critical-node');
  cy.edges().removeClass('maxflow-path saturated flow-edge bottleneck');
  
  // Mark source and sink
  cy.getElementById(source).addClass('source');
  cy.getElementById(sink).addClass('sink');
  
  const loadingMsg = document.createElement('div');
  loadingMsg.textContent = 'Calculating max flow...';
  loadingMsg.style.position = 'absolute';
  loadingMsg.style.top = '60px';
  loadingMsg.style.left = '50%';
  loadingMsg.style.transform = 'translateX(-50%)';
  loadingMsg.style.padding = '10px 20px';
  loadingMsg.style.backgroundColor = 'rgba(0,0,0,0.7)';
  loadingMsg.style.color = 'white';
  loadingMsg.style.borderRadius = '5px';
  loadingMsg.style.zIndex = '1000';
  document.body.appendChild(loadingMsg);
  
  fetch('http://localhost:3000/maxflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, edges, source, sink })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      document.body.removeChild(loadingMsg);
      
      // Create a more detailed result box
      const resultBox = document.createElement('div');
      resultBox.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Results:</div>
        <div>Maximum Flow: ${data.maxFlow}</div>
        ${data.maxFlowValue ? `<div>Max Path Flow: ${data.maxFlowValue}</div>` : ''}
        ${data.criticalNodes ? `<div>Critical Nodes: ${data.criticalNodes.join(', ')}</div>` : ''}
      `;
      resultBox.style.position = 'absolute';
      resultBox.style.top = '60px';
      resultBox.style.left = '50%';
      resultBox.style.transform = 'translateX(-50%)';
      resultBox.style.padding = '10px 20px';
      resultBox.style.backgroundColor = 'rgba(0,0,0,0.7)';
      resultBox.style.color = 'white';
      resultBox.style.borderRadius = '5px';
      resultBox.style.zIndex = '1000';
      document.body.appendChild(resultBox);
      
      setTimeout(() => {
        document.body.removeChild(resultBox);
      }, 6000);
      
      // Update flow values on edges
      data.flowEdges.forEach(edge => {
        const cyEdge = cy.edges().filter(e =>
          e.data('source') === edge.from && e.data('target') === edge.to
        );
        cyEdge.forEach(e => {
          const capacity = e.data('capacity');
          e.data('label', `${edge.flow}/${capacity}`);
          e.addClass('flow-edge');
        });
      });
      
      // Mark saturated edges
      data.saturatedEdges.forEach(segment => {
        cy.edges().filter(e =>
          e.data('source') === segment.from && e.data('target') === segment.to
        ).addClass('saturated');
      });
      
      // Mark bottleneck edges (edges with zero flow but positive capacity)
      if (data.bottleneckEdges) {
        data.bottleneckEdges.forEach(segment => {
          cy.edges().filter(e =>
            e.data('source') === segment.from && e.data('target') === segment.to
          ).addClass('bottleneck');
        });
      }
      
      // Highlight the path with maximum flow contribution
      if (data.maxFlowPath && data.maxFlowPath.length > 0) {
        data.maxFlowPath.forEach(segment => {
          cy.edges().filter(e =>
            e.data('source') === segment.from && e.data('target') === segment.to
          ).addClass('maxflow-path');
        });
        
        if (data.maxFlowNodes) {
          data.maxFlowNodes.forEach(nodeId => {
            cy.getElementById(nodeId).addClass('max-path-node');
          });
        }
      }
      
      // Highlight critical nodes that contribute most to the max flow
      if (data.criticalNodes) {
        data.criticalNodes.forEach(nodeId => {
          cy.getElementById(nodeId).addClass('critical-node');
        });
      }
      
      // Nodes with any flow passing through them
      const flowNodes = new Set();
      data.flowEdges.forEach(edge => {
        flowNodes.add(edge.from);
        flowNodes.add(edge.to);
      });
      
      flowNodes.forEach(nodeId => {
        if (!cy.getElementById(nodeId).hasClass('critical-node')) {
          cy.getElementById(nodeId).addClass('flow-node');
        }
      });
    })
    .catch(err => {
      document.body.removeChild(loadingMsg);
      alert("Error: " + err.message);
      console.error(err);
    });
}

// Add ability to adjust edge capacity
cy.on('cxttap', 'edge', function(evt) {
  const edge = evt.target;
  const currentCapacity = edge.data('capacity');
  const newCapacity = prompt(`Update capacity (current: ${currentCapacity}):`, currentCapacity);
  
  if (newCapacity !== null && !isNaN(parseInt(newCapacity)) && parseInt(newCapacity) >= 0) {
    edge.data('capacity', newCapacity);
  }
});

// Add ability to add new nodes
document.addEventListener('keydown', function(event) {
  if (event.key === 'n' && event.ctrlKey) {
    const id = prompt("Enter new node ID:");
    if (id && id.trim() !== '') {
      cy.add({ data: { id: id.trim() } });
      cy.layout({ name: 'breadthfirst', directed: true }).run();
    }
  }
});

// Add ability to add new edges
document.addEventListener('keydown', function(event) {
  if (event.key === 'e' && event.ctrlKey) {
    const source = prompt("Enter source node ID:");
    const target = prompt("Enter target node ID:");
    const capacity = prompt("Enter edge capacity:");
    
    if (source && target && capacity && 
        !isNaN(parseInt(capacity)) && 
        cy.getElementById(source).length > 0 && 
        cy.getElementById(target).length > 0) {
      cy.add({ data: { source, target, capacity } });
    }
  }
});

// Add UI info
const infoPanel = document.createElement('div');
infoPanel.innerHTML = `
  <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(255,255,255,0.8); padding: 5px 10px; border-radius: 5px;">
    <b>Controls:</b><br>
    • Ctrl+N: Add node<br>
    • Ctrl+E: Add edge<br>
    • Right-click edge: Change capacity
  </div>
`;
document.body.appendChild(infoPanel);