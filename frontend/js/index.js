let flotCompletSolutions = [];
let flotCompletIndex = 0;

let flotMaxSolutions = [];
let flotMaxIndex = 0;


// ################# SLIDERS ##################
// function showFlotComplet(index) {
//   flotCompletIndex = index;
//   document.getElementById('flot-complet-index').textContent = `Solution ${index + 1}/${flotCompletSolutions.length}`;
//   loadCompleteFlowGraph({
//     graph_after_bloch: flotCompletSolutions[index].graph_flot_complet
//   });
// }

// function previousFlotComplet() {
//   if (flotCompletIndex > 0) {
//     showFlotComplet(flotCompletIndex - 1);
//   }
// }

// function nextFlotComplet() {
//   if (flotCompletIndex < flotCompletSolutions.length - 1) {
//     showFlotComplet(flotCompletIndex + 1);
//   }
// }

// function showFlotMax(index) {
//   flotMaxIndex = index;
//   document.getElementById('flot-max-index').textContent = `Solution ${index + 1}/${flotMaxSolutions.length}`;
//   loadMaxFlowGraph({
//     otherGraph: flotMaxSolutions[index].graph_flot_max
//   });
// }

// function previousFlotMax() {
//   if (flotMaxIndex > 0) {
//     showFlotMax(flotMaxIndex - 1);
//   }
// }

// function nextFlotMax() {
//   if (flotMaxIndex < flotMaxSolutions.length - 1) {
//     showFlotMax(flotMaxIndex + 1);
//   }
// }



// ################# INITIALISATION DU PAGE ##################
document.addEventListener('DOMContentLoaded', function() {
  updateNodeSelects();
});

document.getElementById("create-new-graph-btn").addEventListener("click", cleanGraph);



// ################# Styles Cytoscape communs #################
const cyStyles = [
  { selector: 'node', style: {
      'background-color': '#0074D9',
      'label': 'data(id)',
      'color': '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 50,
      'height': 50
  }},
  { selector: 'edge', style: {
      'width': 3,
      'line-color': '#aaa',
      'target-arrow-color': '#aaa',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(capacity)'
  }},
  { selector: '.flow-edge', style: { 'label': 'data(label)' }},
  { selector: '.maxflow-path', style: {
      'line-color': '#FF5733',
      'target-arrow-color': '#FF5733',
      'width': 6,
      'z-index': 10
  }},
  { selector: '.saturated', style: {
      'line-color': '#FF4136',
      'target-arrow-color': '#FF4136',
      'width': 5
  }},
  { selector: '.bottleneck', style: {
      'line-color': '#9400D3',
      'target-arrow-color': '#9400D3',
      'line-style': 'dashed',
      'opacity': 0.7
  }},
  { selector: '.flow-node', style: { 'background-color': '#2ECC40' }},
  { selector: '.max-path-node', style: {
      'background-color': '#FF851B',
      'border-width': 3,
      'border-color': '#FF4136'
  }},
  { selector: '.critical-node', style: {
      'background-color': '#FF851B',
      'border-width': 4,
      'width': 65,
      'height': 65
  }},
  { selector: '.source', style: {
      'background-color': '#3D9970',
      'width': 60,
      'height': 60
  }},
  { selector: '.sink', style: {
      'background-color': '#FF4136',
      'width': 60,
      'height': 60
  }},
  { selector: '.blocked', style: {
      'line-color': '#9400D3',
      'target-arrow-color': '#9400D3',
      'line-style': 'dashed',
      'opacity': 0.7
  }}
];




// ############# INSTANTIATION DES GRAPHES ###############
const cy = cytoscape({
  container: document.getElementById('cy-original'),
  elements: [],
  style: cyStyles,
});

const cyCompleteGraph = cytoscape({
  container: document.getElementById('cy-flot-complet'),
  elements: [],
  style: cyStyles,
});

const cyFinalGraph = cytoscape({
  container: document.getElementById('cy-flot-max'),
  elements: [],
  style: cyStyles,
});

// ############# FONCTIONS DE CHARGEMENT DE GRAPHES ###############

function loadInitialGraph(data) {
  if (!data || !Array.isArray(data.graph_initial)) {
    console.error("❌ graph_initial is missing or not an array:", data);
    return;
  }

  cy.elements().remove(); // Clear existing elements in first graph
  cy.add(data.graph_initial); // Add initial graph elements

  cy.layout({
    name: 'breadthfirst',
    directed: true,
    padding: 30
  }).run();

  cy.fit();
}


function loadCompleteFlowGraph(data) {
  if (!data || !Array.isArray(data.graph_after_bloch)) {
    console.error("❌ graph_after_bloch is undefined or not an array:", data);
    return;
  }

  // 1. Clear previous elements
  cyCompleteGraph.elements().remove();

  // 2. Add new graph
  cyCompleteGraph.add(data.graph_after_bloch);

  // 3. Style flow edges
  data.flowEdges?.forEach(edge => {
    const cyEdge = cyCompleteGraph.edges().filter(e =>
      e.data('source') === edge.from && e.data('target') === edge.to
    );
    cyEdge.forEach(e => {
      const capacity = e.data('capacity');
      e.data('label', `${capacity}`);
      e.addClass('flow-edge');

      if (edge.flow < capacity) {
        e.addClass('blocked');
      }
    });
  });

  // 4. Style saturated edges
  data.saturatedEdges?.forEach(segment => {
    cyCompleteGraph.edges().filter(e =>
      e.data('source') === segment.from && e.data('target') === segment.to
    ).addClass('saturated');
  });

  // 5. Style bottlenecks
  if (data.bottleneckEdges) {
    data.bottleneckEdges.forEach(segment => {
      cyCompleteGraph.edges().filter(e =>
        e.data('source') === segment.from && e.data('target') === segment.to
      ).addClass('bottleneck');
    });
  }

  cyCompleteGraph.layout({
    name: 'breadthfirst',
    directed: true,
    padding: 30
  }).run();

  cyCompleteGraph.fit();
}




function loadMaxFlowGraph(data) {
  if (!data || !Array.isArray(data.graph_after_ford)) {
    console.error("❌ graph_after_ford is missing or not an array:", data);
    return;
  }

  // 1. Clear previous elements
  cyFinalGraph.elements().remove();

  // 2. Add final graph (Ford-Fulkerson output)
  cyFinalGraph.add(data.graph_after_ford);

  // 5. Style bottlenecks
  if (data.bottleneckEdges) {
    data.bottleneckEdges.forEach(segment => {
      cyFinalGraph.edges().filter(e =>
        e.data('source') === segment.from && e.data('target') === segment.to
      ).addClass('bottleneck');
    });
  }

  // 6. Highlight max flow path (if any)
  if (data.maxFlowPath && data.maxFlowPath.length > 0) {
    data.maxFlowPath.forEach(segment => {
      cyFinalGraph.edges().filter(e =>
        e.data('source') === segment.from && e.data('target') === segment.to
      ).addClass('maxflow-path');
    });

    if (data.maxFlowNodes) {
      data.maxFlowNodes.forEach(nodeId => {
        cyFinalGraph.getElementById(nodeId).addClass('max-path-node');
      });
    }
  }

  // 7. Critical nodes
  if (data.criticalNodes) {
    data.criticalNodes.forEach(nodeId => {
      cyFinalGraph.getElementById(nodeId).addClass('critical-node');
    });
  }

  // 8. Flow nodes (nodes used in any flow)
  const flowNodes = new Set();
  data.flowEdges?.forEach(edge => {
    flowNodes.add(edge.from);
    flowNodes.add(edge.to);
  });

  flowNodes.forEach(nodeId => {
    if (!cyFinalGraph.getElementById(nodeId).hasClass('critical-node')) {
      cyFinalGraph.getElementById(nodeId).addClass('flow-node');
    }
  });


  data.flowEdges?.forEach(edge => {
    const cyEdge = cyFinalGraph.edges().filter(e =>
      e.data('source') === edge.from && e.data('target') === edge.to
    );
    cyEdge.forEach(e => {
      const capacity = e.data('capacity');
      e.data('label', `${capacity}`);
      e.addClass('flow-edge');

    });
  });


  // 9. Layout
  cyFinalGraph.layout({
    name: 'breadthfirst',
    directed: true,
    padding: 30
  }).run();

  cyFinalGraph.fit();
}
 





// Attach to Cytoscape events
cy.on("tap", (event) => handleBackgroundClick(event));
cy.on("tap", "node", (event) => handleNodeClick(event));


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
  
  // Get source and sink from the dropdown selects
  const sourceSelect = document.getElementById('source-select');
  const sinkSelect = document.getElementById('sink-select');
  
  const source = sourceSelect.value;
  const sink = sinkSelect.value;
  
  // Validate selection
  if (source === sink) {
    alert("Source and sink cannot be the same node");
    return;
  }
  
  // Check if source and sink exist in the graph
  const sourceNode = cy.getElementById(source);
  const sinkNode = cy.getElementById(sink);
  
  if (sourceNode.length === 0 || sinkNode.length === 0) {
    alert("Selected source or sink node doesn't exist in the graph");
    return;
  }
  
  // Reset styles
  cy.nodes().removeClass('flow-node source sink max-path-node critical-node');
  cy.edges().removeClass('maxflow-path saturated flow-edge bottleneck');
  
  // Mark source and sink
  sourceNode.addClass('source');
  sinkNode.addClass('sink');
  
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
      
      loadInitialGraph(data);
      loadCompleteFlowGraph(data);
      loadMaxFlowGraph(data);
      
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
      
      // // Update flow values on edges
      // data.flowEdges.forEach(edge => {
      //   const cyEdge = cy.edges().filter(e =>
      //     e.data('source') === edge.from && e.data('target') === edge.to
      //   );
      //   cyEdge.forEach(e => {
      //     const capacity = e.data('capacity');
      //     e.data('label', `${edge.flow}/${capacity}`);
      //     e.addClass('flow-edge');
          
      //     // Check if the edge is blocked/unused
      //     if (edge.flow < capacity) {
      //       e.addClass('blocked'); // Add the blocked class
      //     }
      //   });
      // });
      
      // // Mark saturated edges
      // data.saturatedEdges.forEach(segment => {
      //   cy.edges().filter(e =>
      //     e.data('source') === segment.from && e.data('target') === segment.to
      //   ).addClass('saturated');
      // });
      
      // // Mark bottleneck edges (edges with zero flow but positive capacity)
      // if (data.bottleneckEdges) {
      //   data.bottleneckEdges.forEach(segment => {
      //     cy.edges().filter(e =>
      //       e.data('source') === segment.from && e.data('target') === segment.to
      //     ).addClass('bottleneck');
      //   });
      // }
      
      // // Highlight the path with maximum flow contribution
      // if (data.maxFlowPath && data.maxFlowPath.length > 0) {
      //   data.maxFlowPath.forEach(segment => {
      //     cy.edges().filter(e =>
      //       e.data('source') === segment.from && e.data('target') === segment.to
      //     ).addClass('maxflow-path');
      //   });
        
      //   if (data.maxFlowNodes) {
      //     data.maxFlowNodes.forEach(nodeId => {
      //       cy.getElementById(nodeId).addClass('max-path-node');
      //     });
      //   }
      // }
      
      // // Highlight critical nodes that contribute most to the max flow
      // if (data.criticalNodes) {
      //   data.criticalNodes.forEach(nodeId => {
      //     cy.getElementById(nodeId).addClass('critical-node');
      //   });
      // }
      
      // // Nodes with any flow passing through them
      // const flowNodes = new Set();
      // data.flowEdges.forEach(edge => {
      //   flowNodes.add(edge.from);
      //   flowNodes.add(edge.to);
      // });
      
      // flowNodes.forEach(nodeId => {
      //   if (!cy.getElementById(nodeId).hasClass('critical-node')) {
      //     cy.getElementById(nodeId).addClass('flow-node');
      //   }
      // });

      
    })
    .catch(err => {
     // document.body.removeChild(loadingMsg);
      alert("Error: " + err.message);
      console.error(err);
    });
}



// Function to update the source/sink dropdown options
function updateNodeSelects() {
  const sourceSelect = document.getElementById('source-select');
  const sinkSelect = document.getElementById('sink-select');
  
  if (!sourceSelect || !sinkSelect) return; // Exit if elements don't exist yet
  
  // Save current selections if they exist
  const currentSource = sourceSelect.value;
  const currentSink = sinkSelect.value;
  
  // Clear previous options
  sourceSelect.innerHTML = '';
  sinkSelect.innerHTML = '';
  
  // Get all node IDs
  const nodes = cy.nodes().map(n => n.id());
  
  // Create options for each node
  nodes.forEach(nodeId => {
    const sourceOption = document.createElement('option');
    sourceOption.value = nodeId;
    sourceOption.textContent = nodeId;
    
    const sinkOption = document.createElement('option');
    sinkOption.value = nodeId;
    sinkOption.textContent = nodeId;
    
    sourceSelect.appendChild(sourceOption);
    sinkSelect.appendChild(sinkOption);
  });
  
  // Restore previous selections if valid, otherwise set defaults
  if (nodes.includes(currentSource)) {
    sourceSelect.value = currentSource;
  } else {
    const defaultSource = nodes.includes('S') ? 'S' : nodes[0];
    sourceSelect.value = defaultSource;
  }
  
  if (nodes.includes(currentSink)) {
    sinkSelect.value = currentSink;
  } else {
    const defaultSink = nodes.includes('T') ? 'T' : nodes[nodes.length - 1];
    sinkSelect.value = defaultSink;
  }
}

// Initialize the dropdowns when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Wait a moment for the graph to be rendered
  setTimeout(updateNodeSelects, 500);
});





// ############# MANIPULATION DES ARC ###############
function inverserArc(edge) {
  const currentSource = edge.data('source');
  const currentTarget = edge.data('target');
  const capacity = edge.data('capacity');
  const label = edge.data('label');
  const id = edge.id();

  // Supprimer l'ancien arc
  edge.remove();

  // Créer un nouvel arc inversé
  cy.add({
    group: "edges",
    data: {
      id: id, // garde le même id si tu veux
      source: currentTarget,
      target: currentSource,
      capacity: capacity,
      label: label || capacity
    }
  });

  cy.layout({ name: 'breadthfirst', directed: true, padding: 30 }).run();
}

function supprimerArc(edge) {
  edge.remove();
  cy.layout({ name: 'breadthfirst', directed: true, padding: 30 }).run();
}

// CHOIC DE L'ARC 1, 2, 3
cy.on('cxttap', 'edge', function(evt) {
  const edge = evt.target;
  const action = prompt("Action sur l'arc:\n1. Changer capacité\n2. Inverser l'arc\n3. Supprimer l'arc", "1");
  if (action === "1") {
    const currentCapacity = edge.data('capacity');
    const newCapacity = prompt(`Mettre à jour capacite (Actuellement: ${currentCapacity}):`, currentCapacity);
    if (newCapacity !== null && !isNaN(parseInt(newCapacity)) && parseInt(newCapacity) >= 0) {
      edge.data('capacity', newCapacity);
    }
  } else if (action === "2") {
    inverserArc(edge);
  } else if (action === "3") {
    supprimerArc(edge);
  }
});


// ############# AJOUT DE NOUVEAUX NOEUDS ET ARCS ###############
// Add ability to add new nodes
document.addEventListener('keydown', function(event) {
  if (event.key === 'n' && event.ctrlKey) {
    const id = prompt("Enter new node ID:");
    if (id && id.trim() !== '') {
      cy.add({ data: { id: id.trim() } });
      cy.layout({ name: 'breadthfirst', directed: true }).run();
      updateNodeSelects(); // Update dropdowns when adding a new node
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


function deleteNode() {
  if (selectedNode) {
    cy.remove(selectedNode);
    selectedNode = null;
    updateNodeSelects();
  } else {
    alert("Choisissez d'abord un noeud à supprimer en cliquant dessus");
  }
}

function numberToLetters(num) {
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (num % 26)) + letters;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);
  return letters;
}

function updateNodeSelects() {
  const sourceSelect = document.getElementById('source-select');
  const sinkSelect = document.getElementById('sink-select');
  
  // Clear previous options
  sourceSelect.innerHTML = '';
  sinkSelect.innerHTML = '';
  
  // Get all node IDs
  const nodes = cy.nodes().map(n => n.id());
  
  // Create options for each node
  nodes.forEach(nodeId => {
    const sourceOption = document.createElement('option');
    sourceOption.value = nodeId;
    sourceOption.textContent = nodeId;
    
    const sinkOption = document.createElement('option');
    sinkOption.value = nodeId;
    sinkOption.textContent = nodeId;
    
    sourceSelect.appendChild(sourceOption);
    sinkSelect.appendChild(sinkOption);
  });
  
  // Set default values (try to find S and T, or use first and last nodes)
  const defaultSource = nodes.includes('S') ? 'S' : nodes[0];
  const defaultSink = nodes.includes('T') ? 'T' : nodes[nodes.length - 1];
  
  sourceSelect.value = defaultSource;
  sinkSelect.value = defaultSink;
}




// ################## AJOUT INTERACTIVITÉ AVEC LES NOEUDS ##################
let nodeCount = 0;
let edgeCount = 0;
let selectedNode = null;

// Attach to Cytoscape events
cy.on("tap", (event) => handleBackgroundClick(event));
cy.on("tap", "node", (event) => handleNodeClick(event));

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




// ################## CHARGER UN NOUVEAU GRAPHE ##################

function resetGraph() {
  cy.nodes().removeClass('flow-node source sink max-path-node critical-node');
  cy.edges().removeClass('maxflow-path saturated flow-edge bottleneck');
  cy.edges().forEach(e => e.removeData('label'));
  updateNodeSelects();
}

function cleanGraph() {
  cy.elements().remove();
  nodeCount = 0;
  edgeCount = 0;
  selectedNode = null;
  alert("You can now click to add nodes and edges.");
}
function loadNewGraph() {
  const graphType = prompt("Choose graph type (1: Simple, 2: Complex, 3: Random):", "1");
  resetGraph();
  cy.elements().remove();
  
  switch(graphType) {
    case "1": // Simple graph
      cy.add([
        { data: { id: 'Deb' } },
        { data: { id: 'A' } },
        { data: { id: 'B' } },
        { data: { id: 'C' } },
        { data: { id: 'D' } },
        { data: { id: 'E' } },
        { data: { id: 'F' } },
        { data: { id: 'G' } },
        { data: { id: 'H' } },
        { data: { id: 'I' } },
        { data: { id: 'J' } },
        { data: { id: 'K' } },
        { data: { id: 'L' } },
        { data: { id: 'Fin' } },
        { data: { source: 'Deb', target: 'A', capacity: '15' } },
        { data: { source: 'Deb', target: 'B', capacity: '10' } },
        { data: { source: 'Deb', target: 'C', capacity: '15' } },
        { data: { source: 'Deb', target: 'D', capacity: '15' } },
        { data: { source: 'B', target: 'A', capacity: '5' } },
        { data: { source: 'B', target: 'F', capacity: '5' } },
        { data: { source: 'C', target: 'F', capacity: '10' } },
        { data: { source: 'C', target: 'G', capacity: '7' } },
        { data: { source: 'D', target: 'G', capacity: '10' } },
        { data: { source: 'A', target: 'E', capacity: '7' } },
        { data: { source: 'E', target: 'H', capacity: '4' } },
        { data: { source: 'E', target: 'I', capacity: '15' } },
        { data: { source: 'E', target: 'F', capacity: '5' } },
        { data: { source: 'F', target: 'I', capacity: '15' } },
        { data: { source: 'F', target: 'G', capacity: '5' } },
        { data: { source: 'G', target: 'I', capacity: '15' } },
        { data: { source: 'H', target: 'J', capacity: '7' } },
        { data: { source: 'I', target: 'H', capacity: '7' } },
        { data: { source: 'I', target: 'K', capacity: '30' } },
        { data: { source: 'I', target: 'L', capacity: '4' } },
        { data: { source: 'J', target: 'Fin', capacity: '15' } },
        { data: { source: 'K', target: 'J', capacity: '10' } },
        { data: { source: 'K', target: 'Fin', capacity: '20' } },
        { data: { source: 'L', target: 'Fin', capacity: '15' } }
      ]);
      break;
    case "2": // Complex graph with bottlenecks
      cy.add([
        { data: { id: 'A' } },
        { data: { id: 'B' } },
        { data: { id: 'C' } },
        { data: { id: 'D' } },
        { data: { id: 'E' } },
        { data: { id: 'F' } },
	      { data: { id: 'G' } },
        { data: { id: 'H' } },
	      { data: { id: 'I' } },
        { data: { id: 'J' } },
        { data: { source: 'A', target: 'B', capacity: '60' } },
        { data: { source: 'A', target: 'E', capacity: '25' } },
        { data: { source: 'A', target: 'D', capacity: '40' } },
        { data: { source: 'B', target: 'C', capacity: '40' } },
        { data: { source: 'B', target: 'E', capacity: '30' } },
        { data: { source: 'C', target: 'I', capacity: '50' } },
        { data: { source: 'C', target: 'F', capacity: '20' } },
        { data: { source: 'D', target: 'G', capacity: '20' } },
        { data: { source: 'E', target: 'C', capacity: '15' } },
        { data: { source: 'E', target: 'H', capacity: '20' } },
        { data: { source: 'E', target: 'G', capacity: '10' } },
	      { data: { source: 'E', target: 'D', capacity: '20' } },
        { data: { source: 'F', target: 'I', capacity: '5' } },
        { data: { source: 'F', target: 'H', capacity: '10' } },
        { data: { source: 'F', target: 'E', capacity: '10' } },
        { data: { source: 'G', target: 'F', capacity: '15' } },
        { data: { source: 'G', target: 'H', capacity: '30' } },
        { data: { source: 'H', target: 'J', capacity: '55' } },
        { data: { source: 'I', target: 'J', capacity: '60' } },
        { data: { source: 'I', target: 'H', capacity: '20' } }       
]);
      break;
    case "3": // Random graph
      const nodeCount = 6;
      const edgeProbability = 0.4;
      
      // Add nodes
      cy.add({ data: { id: 'S' } });
      for (let i = 1; i < nodeCount-1; i++) {
        cy.add({ data: { id: String.fromCharCode(64 + i) } });
      }
      cy.add({ data: { id: 'T' } });
      
      // Add random edges
      const nodes = cy.nodes().map(n => n.id());
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          if (Math.random() < edgeProbability) {
            const capacity = Math.floor(Math.random() * 15) + 1;
            cy.add({ data: { 
              source: nodes[i], 
              target: nodes[j],
              capacity: capacity.toString()
            }});
          }
        }
      }
      break;
  }
  
  cy.layout({
    name: 'breadthfirst',
    directed: true,
    padding: 30
  }).run();
  
  cy.fit();
  updateNodeSelects(); // Update dropdowns after creating a new graph
}


// ############## PANNEAUX DE CONTRÔLE ################
const infoPanel = document.createElement('div');
infoPanel.innerHTML = `
  <div style="
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: linear-gradient(135deg, #f8fafc 80%, #e0e7ff 100%);
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    padding: 18px 28px;
    border-radius: 12px;
    border: 1px solid #dbeafe;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 16px;
    color: #22223b;
    z-index: 9999;
    min-width: 260px;
    max-width: 340px;
  ">
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 8px; color: #3b82f6;">
      Raccourcis
    </div>
    <ul style="margin: 0; padding-left: 18px; line-height: 1.7;">
      <li><span style="color:#2563eb;font-weight:500;">Ctrl + E</span> : Ajouter un <b>Arc</b></li>
      <li><span style="color:#f59e42;font-weight:500;">Clique Droit</span> sur un <b>arc</b> : Modifier / Inverser / Supprimer</li>
    </ul>
  </div>
`;
document.body.appendChild(infoPanel);



// ################## OTHERS ##################
function handleBackgroundClick(event) {
  if (event.target === cy) {
    function numberToLetters(num) {
      let letters = '';
      do {
        letters = String.fromCharCode(65 + (num % 26)) + letters;
        num = Math.floor(num / 26) - 1;
      } while (num >= 0);
      return letters;
    }

    const id = numberToLetters(nodeCount++);
    cy.add({
      group: "nodes",
      data: { id: id, label: id },
      position: event.position
    });
    updateNodeSelects?.(); // Optional, if defined
  }
}


function handleNodeClick(event) {
  if (selectedNode === null) {
    selectedNode = event.target;
    selectedNode.style("background-color", "yellow");
  } else {
    const source = selectedNode.id();
    const target = event.target.id();
    
    if (source !== target) {
      const edgeId = `e${edgeCount++}`;
      cy.add({
        group: "edges",
        data: {
          id: edgeId,
          source: source,
          target: target,
          capacity: 10,
          label: "10"
        }
      });
    }

    selectedNode.style("background-color", "green");
    selectedNode = null;
  }
}

// Permet d’appeler la fonction de tableau si elle existe dans tab.js
function voirtableau() {
  if (typeof window.voirtableau === 'function') {
    window.voirtableau();
  } else {
    console.error("⚠️ La fonction 'voirtableau' n'est pas définie.");
  }
}

