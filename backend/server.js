const express = require('express');
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*' );
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  next();
});

// --- Création du graphe à partir du format Cytoscape
function parseCytoscapeInput(data) {
  const graph = {};
  for (const node of data.nodes) {
    graph[node.data.id] = {};
  }

  for (const edge of data.edges) {
    const { source, target, capacity } = edge.data;
    const cap = parseInt(capacity);
    graph[source][target] = { capacity: cap, flow: 0 };

    if (!graph[target]) graph[target] = {};
    if (!graph[target][source]) graph[target][source] = { capacity: 0, flow: 0 }; // arc retour
  }

  return graph;
}

// --- Clone profond du graphe
function cloneGraph(graph) {
  const clone = {};
  for (const u in graph) {
    clone[u] = {};
    for (const v in graph[u]) {
      clone[u][v] = { ...graph[u][v] };
    }
  }
  return clone;
}

// --- Cache pour les calculs de chemins
const pathCache = new Map();

// --- Recherche de tous les chemins simples de source à puits (optimisée avec cache)
function findAllPaths(graph, start, end, visited = new Set(), path = []) {
  const cacheKey = `${start}-${end}-${Array.from(visited).sort().join(',')}-${path.map(p => `${p.from}-${p.to}`).join(',')}`;
  
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey);
  }

  visited.add(start);
  if (start === end) {
    const result = [path.slice()];
    pathCache.set(cacheKey, result);
    return result;
  }
  
  let paths = [];
  for (const neighbor in graph[start]) {
    const edge = graph[start][neighbor];
    const residual = edge.capacity - edge.flow;
    if (!visited.has(neighbor) && residual > 0) {
      path.push({ from: start, to: neighbor });
      paths = paths.concat(findAllPaths(graph, neighbor, end, new Set(visited), path));
      path.pop();
    }
  }

  pathCache.set(cacheKey, paths);
  return paths;
}

// --- Vérifier si un flot est complet (optimisé)
function isCompleteFlow(graph, source, sink) {
  const paths = findAllPaths(graph, source, sink);
  
  if (paths.length === 0) return false;
  
  // Un flot est complet si tous les chemins ont au moins un arc saturé
  for (const path of paths) {
    let hasSaturatedArc = false;
    for (const edge of path) {
      const { from, to } = edge;
      const residual = graph[from][to].capacity - graph[from][to].flow;
      if (residual === 0) {
        hasSaturatedArc = true;
        break;
      }
    }
    if (!hasSaturatedArc) {
      return false;
    }
  }
  
  return true;
}

// --- Obtenir toutes les arêtes avec capacité résiduelle minimale
function getMinResidualEdges(graph) {
  let minResidual = Infinity;
  const edges = [];

  for (const u in graph) {
    for (const v in graph[u]) {
      const residual = graph[u][v].capacity - graph[u][v].flow;
      if (residual > 0) {
        if (residual < minResidual) {
          minResidual = residual;
          edges.length = 0;
          edges.push({ from: u, to: v, residual });
        } else if (residual === minResidual) {
          edges.push({ from: u, to: v, residual });
        }
      }
    }
  }

  return edges;
}

// --- Algorithme de Manuel Bloch systématique
function manuelBlochSystematic(graph, source, sink, choiceSequence = []) {
  const graphCopy = cloneGraph(graph);
  let step = 0;
  let actualChoices = [];

  while (step < 100) { // Réduction de la limite pour éviter les boucles infinies
    const minResidualEdges = getMinResidualEdges(graphCopy);
    if (minResidualEdges.length === 0) break;

    let selectedIndex = 0;
    if (choiceSequence.length > step) {
      selectedIndex = choiceSequence[step] % minResidualEdges.length;
    }
    
    const selected = minResidualEdges[selectedIndex];
    actualChoices.push(selectedIndex);

    const paths = findAllPaths(graphCopy, source, sink);
    const path = paths.find(p => p.some(e => e.from === selected.from && e.to === selected.to));
    
    if (!path) break;

    const minResidual = selected.residual;
    for (const { from, to } of path) {
      graphCopy[from][to].flow += minResidual;
      graphCopy[to][from].flow -= minResidual;
    }

    step++;
  }

  return { graph: graphCopy, choices: actualChoices };
}

// --- Générer séquences de choix optimisées
function generateChoiceSequencesOptimized(graph, source, sink, maxDepth = 6) {
  const sequences = [];
  const visited = new Set();
  const maxSequences = 50; // Limite pour éviter explosion combinatoire
  
  function explore(currentSequence, depth) {
    if (depth > maxDepth || sequences.length >= maxSequences) return;
    
    const result = manuelBlochSystematic(graph, source, sink, currentSequence);
    const signature = getFlowSignature(result.graph);
    
    if (!visited.has(signature)) {
      visited.add(signature);
      sequences.push({
        sequence: currentSequence.slice(),
        actualChoices: result.choices,
        graph: result.graph
      });
    }
    
    if (!isCompleteFlow(result.graph, source, sink)) {
      const nextMinEdges = getMinResidualEdges(result.graph);
      if (nextMinEdges.length > 0) {
        const maxChoices = Math.min(nextMinEdges.length, 3); // Réduction pour performance
        for (let i = 0; i < maxChoices; i++) {
          explore([...currentSequence, i], depth + 1);
        }
      }
    }
  }
  
  explore([], 0);
  return sequences;
}

// --- Algorithme avec priorité d'arêtes optimisé
function manuelBlochWithPriority(graph, source, sink, seed = 0) {
  const graphCopy = cloneGraph(graph);
  let step = 0;
  
  const edgePriority = {};
  for (const u in graph) {
    for (const v in graph[u]) {
      if (graph[u][v].capacity > 0) {
        edgePriority[`${u}-${v}`] = (seed * 31 + u.charCodeAt(0) + v.charCodeAt(0)) % 1000;
      }
    }
  }
  
  while (step < 100) {
    const minResidualEdges = getMinResidualEdges(graphCopy);
    if (minResidualEdges.length === 0) break;

    minResidualEdges.sort((a, b) => {
      const keyA = `${a.from}-${a.to}`;
      const keyB = `${b.from}-${b.to}`;
      return (edgePriority[keyA] || 0) - (edgePriority[keyB] || 0);
    });
    
    const selected = minResidualEdges[0];
    const paths = findAllPaths(graphCopy, source, sink);
    const path = paths.find(p => p.some(e => e.from === selected.from && e.to === selected.to));
    
    if (!path) break;

    const minResidual = selected.residual;
    for (const { from, to } of path) {
      graphCopy[from][to].flow += minResidual;
      graphCopy[to][from].flow -= minResidual;
    }

    step++;
  }

  return graphCopy;
}

// --- Générer toutes les variantes de flot complet (optimisé)
function generateAllCompleteFlowsOptimized(graph, source, sink) {
  const variants = [];
  const signatures = new Set();
  
  try {
    // Méthode 1: Séquences de choix optimisées
    const choiceSequences = generateChoiceSequencesOptimized(graph, source, sink);
    
    for (const seq of choiceSequences) {
      const signature = getFlowSignature(seq.graph);
      if (!signatures.has(signature)) {
        signatures.add(signature);
        variants.push({
          completeFlow: seq.graph,
          signature,
          method: 'systematic',
          choiceSequence: seq.sequence,
          actualChoices: seq.actualChoices
        });
      }
    }
    
    // Méthode 2: Exploration avec priorités réduites
    const maxSeeds = Math.min(10, Object.keys(graph).length); // Réduction du nombre de seeds
    
    for (let seed = 0; seed < maxSeeds; seed++) {
      try {
        const result = manuelBlochWithPriority(graph, source, sink, seed);
        const signature = getFlowSignature(result);
        
        if (!signatures.has(signature)) {
          signatures.add(signature);
          variants.push({
            completeFlow: result,
            signature,
            method: 'priority',
            seed
          });
        }
      } catch (error) {
        console.warn(`Erreur avec seed ${seed}:`, error.message);
        continue;
      }
    }
    
  } catch (error) {
    console.error('Erreur dans generateAllCompleteFlowsOptimized:', error);
  }
  
  return variants;
}

// --- Créer signature unique pour un flot
function getFlowSignature(graph) {
  const flows = [];
  for (const u in graph) {
    for (const v in graph[u]) {
      if (graph[u][v].capacity > 0) {
        flows.push(`${u}-${v}:${graph[u][v].flow}`);
      }
    }
  }
  return flows.sort().join('|');
}

// --- Fonctions utilitaires pour la conversion
function graphWithUpdatedCapacities(graphWithFlow, originalGraph) {
  const nodes = Object.keys(originalGraph).map(id => ({ data: { id } }));
  const edges = [];

  for (const from in originalGraph) {
    for (const to in originalGraph[from]) {
      const originalCap = originalGraph[from][to].capacity;
      const flow = graphWithFlow[from]?.[to]?.flow ?? 0;

      if (originalCap > 0) {
        const updatedCapacity = originalCap - flow;
        edges.push({
          data: {
            source: from,
            target: to,
            capacity: String(updatedCapacity)
          }
        });
      }
    }
  }

  return [...nodes, ...edges];
}

function graphWithUsedFlow(graphWithFlow, originalGraph) {
  const nodes = Object.keys(originalGraph).map(id => ({ data: { id } }));
  const edges = [];

  for (const from in originalGraph) {
    for (const to in originalGraph[from]) {
      const originalCap = originalGraph[from][to].capacity;
      const flow = graphWithFlow[from]?.[to]?.flow ?? 0;

      if (originalCap > 0) {
        edges.push({
          data: {
            source: from,
            target: to,
            capacity: String(flow)
          }
        });
      }
    }
  }

  return [...nodes, ...edges];
}

// --- BFS pour Ford-Fulkerson
function bfs(graph, source, sink, parent) {
  const visited = new Set();
  const queue = [source];
  visited.add(source);
  parent[source] = null;

  while (queue.length) {
    const u = queue.shift();
    for (const v in graph[u]) {
      const residual = graph[u][v].capacity - graph[u][v].flow;
      if (!visited.has(v) && residual > 0) {
        parent[v] = u;
        if (v === sink) return true;
        visited.add(v);
        queue.push(v);
      }
    }
  }

  return false;
}

// --- Implémentation de Ford-Fulkerson
// --- Enhanced Ford-Fulkerson with detailed edge information
function fordFulkersonEnhanced(graph, source, sink) {
  const graphCopy = cloneGraph(graph);
  const parent = {};
  const allPaths = [];
  let maxFlow = 0;

  // Track all augmenting paths
  while (bfs(graphCopy, source, sink, parent)) {
    // Find path flow
    let pathFlow = Infinity;
    let v = sink;
    const currentPath = [];
    
    while (v !== source) {
      const u = parent[v];
      const residual = graphCopy[u][v].capacity - graphCopy[u][v].flow;
      pathFlow = Math.min(pathFlow, residual);
      currentPath.unshift({ from: u, to: v });
      v = u;
    }

    // Record this augmenting path
    allPaths.push({
      flow: pathFlow,
      path: currentPath.slice(),
      nodes: [...new Set(currentPath.flatMap(edge => [edge.from, edge.to]))]
    });

    // Update flow
    v = sink;
    while (v !== source) {
      const u = parent[v];
      graphCopy[u][v].flow += pathFlow;
      graphCopy[v][u].flow -= pathFlow;
      v = u;
    }

    maxFlow += pathFlow;
  }

  // Find the path with maximum flow contribution
  const maxFlowPath = allPaths.reduce((max, current) => 
    current.flow > max.flow ? current : max, 
    { flow: 0, path: [], nodes: [] }
  );

  // Calculate node importance based on flow contribution
  const nodeImportance = {};
  let maxFrequency = 0;
  
  allPaths.forEach(pathInfo => {
    pathInfo.nodes.forEach(nodeId => {
      nodeImportance[nodeId] = (nodeImportance[nodeId] || 0) + pathInfo.flow;
      maxFrequency = Math.max(maxFrequency, nodeImportance[nodeId]);
    });
  });

  // Filter critical nodes (those carrying most flow)
  const criticalNodes = Object.entries(nodeImportance)
    .filter(([_, value]) => value > maxFrequency * 0.7)
    .map(([nodeId]) => nodeId);

  // Generate detailed edge information
  const flowEdges = [];
  const saturatedEdges = [];
  const bottleneckEdges = [];

  for (const u in graph) {
    for (const v in graph[u]) {
      if (graph[u][v].capacity > 0) {
        const flow = graphCopy[u][v].flow;
        const capacity = graph[u][v].capacity;
        const saturated = flow === capacity;

        const edgeInfo = {
          from: u,
          to: v,
          flow: flow,
          capacity: capacity,
          saturated: saturated
        };

        if (flow > 0) {
          flowEdges.push(edgeInfo);
        }

        if (saturated) {
          saturatedEdges.push({
            from: u,
            to: v
          });
        }

        if (flow === 0 && capacity > 0) {
          bottleneckEdges.push({
            from: u,
            to: v,
            capacity: capacity
          });
        }
      }
    }
  }

  return {
    graph: graphCopy,
    maxFlow,
    flowEdges,
    saturatedEdges,
    bottleneckEdges,
    maxFlowPath: maxFlowPath.path,
    maxFlowNodes: maxFlowPath.nodes,
    maxFlowValue: maxFlowPath.flow,
    criticalNodes,
    allPaths
  };
}




// --- Calculer le flot total
function calculateTotalFlow(graph, source) {
  let totalFlow = 0;
  for (const v in graph[source]) {
    totalFlow += graph[source][v].flow;
  }
  return totalFlow;
}

// --- Trouver le chemin critique (bottleneck path) pour le flot maximal
function findCriticalPath(originalGraph, maxFlowGraph, source, sink) {
  // Trouver tous les chemins dans le graphe original
  const allPaths = findAllPaths(originalGraph, source, sink);
  
  if (allPaths.length === 0) {
    return {
      path: [],
      bottleneck_value: 0,
      bottleneck_edges: [],
      total_capacity: 0,
      efficiency: "0%"
    };
  }
  
  // Analyser chaque chemin pour trouver le goulot d'étranglement
  const pathAnalysis = allPaths.map((path, index) => {
    const edgeCapacities = path.map(edge => originalGraph[edge.from][edge.to].capacity);
    const bottleneck = Math.min(...edgeCapacities);
    const totalCapacity = edgeCapacities.reduce((sum, cap) => sum + cap, 0);
    
    // Identifier les arêtes qui forment le goulot d'étranglement
    const bottleneckEdges = path.filter(edge => 
      originalGraph[edge.from][edge.to].capacity === bottleneck
    );
    
    return {
      id: index,
      path: path.map(p => `${p.from}->${p.to}`),
      pathEdges: path,
      bottleneck_value: bottleneck,
      bottleneck_edges: bottleneckEdges.map(e => `${e.from}->${e.to}`),
      total_capacity: totalCapacity,
      efficiency: totalCapacity > 0 ? ((bottleneck / totalCapacity) * 100).toFixed(2) + '%' : '0%'
    };
  });
  
  // Le chemin critique est celui avec le plus grand goulot d'étranglement
  // (qui détermine potentiellement le flot maximal)
  const criticalPath = pathAnalysis.reduce((best, current) => 
    current.bottleneck_value > best.bottleneck_value ? current : best
  );
  
  return {
    path: criticalPath.path,
    path_edges: criticalPath.pathEdges,
    bottleneck_value: criticalPath.bottleneck_value,
    bottleneck_edges: criticalPath.bottleneck_edges,
    total_capacity: criticalPath.total_capacity,
    efficiency: criticalPath.efficiency,
    all_paths_analysis: pathAnalysis.map(p => ({
      path: p.path,
      bottleneck: p.bottleneck_value,
      efficiency: p.efficiency
    }))
  };
}

// --- Route principale
app.post('/maxflow', (req, res) => {
  const { nodes, edges, source, sink } = req.body;

  if (!nodes || !edges || !source || !sink) {
    return res.status(400).json({ error: "Champs requis : nodes, edges, source, sink" });
  }

  try {
    // Nettoyer le cache pour chaque nouvelle requête
    pathCache.clear();
    
    const initialGraph = parseCytoscapeInput({ nodes, edges });
    
    // Use Manuel Bloch for complete flow
    const blochResult = manuelBlochSystematic(initialGraph, source, sink, []);
    
    // Use enhanced Ford-Fulkerson for detailed max flow analysis
    const fordResult = fordFulkersonEnhanced(cloneGraph(initialGraph), source, sink);
    
    // Calculer le chemin critique
    const criticalPath = findCriticalPath(initialGraph, fordResult.graph, source, sink);

    return res.json({
      maxFlow: fordResult.maxFlow,
      graph_initial: [...nodes, ...edges],
      graph_after_bloch: graphWithUpdatedCapacities(blochResult.graph, initialGraph),
      graph_after_ford: graphWithUsedFlow(fordResult.graph, initialGraph),
      is_complete_flow: isCompleteFlow(blochResult.graph, source, sink),
      chemin_critique: criticalPath,
      
      // Enhanced detailed information
      flowEdges: fordResult.flowEdges,
      saturatedEdges: fordResult.saturatedEdges,
      bottleneckEdges: fordResult.bottleneckEdges,
      maxFlowPath: fordResult.maxFlowPath,
      maxFlowNodes: fordResult.maxFlowNodes,
      maxFlowValue: fordResult.maxFlowValue,
      criticalNodes: fordResult.criticalNodes,
      allAugmentingPaths: fordResult.allPaths
    });
  } catch (error) {
    return res.status(500).json({ 
      error: "Erreur lors du calcul du flot maximal",
      details: error.message 
    });
  }
});

// --- Endpoint modifié pour toutes les combinaisons avec format de graphe uniforme
app.post('/all-combinations', (req, res) => {
  const { nodes, edges, source, sink } = req.body;

  if (!nodes || !edges || !source || !sink) {
    return res.status(400).json({ error: "Champs requis : nodes, edges, source, sink" });
  }

  try {
    // Nettoyer le cache
    pathCache.clear();
    
    const initialGraph = parseCytoscapeInput({ nodes, edges });
    
    // Générer toutes les variantes optimisées
    const completeFlowVariants = generateAllCompleteFlowsOptimized(initialGraph, source, sink);
    
    if (completeFlowVariants.length === 0) {
      return res.json({
        total_combinations: 0,
        valid_complete_flows: 0,
        unique_flow_pairs: 0,
        flow_pairs: [],
        flow_distribution: {},
        combinations: [],
        analysis: {
          completeness_rate: "0%",
          most_common_pair: "N/A",
          generation_methods: []
        },
        message: "Aucune variante de flot complet trouvée"
      });
    }

    // Traiter chaque variante avec le même format que /maxflow
    const combinations = completeFlowVariants.map((variant, index) => {
      try {
        const { graph: maxFlowGraph, maxFlow } = fordFulkerson(cloneGraph(variant.completeFlow), source, sink);
        const completeFlowValue = calculateTotalFlow(variant.completeFlow, source);
        
        // Calculer le chemin critique pour cette variante
        const criticalPath = findCriticalPath(initialGraph, maxFlowGraph, source, sink);
        
        return {
          id: index + 1,
          complete_flow_value: completeFlowValue,
          max_flow_value: maxFlow,
          is_complete_flow: isCompleteFlow(variant.completeFlow, source, sink),
          generation_method: variant.method,
          choice_info: variant.choiceSequence || variant.actualChoices || variant.seed,
          
          // Format identique à /maxflow
          graph_initial: [...nodes, ...edges],
          graph_flot_complet: graphWithUpdatedCapacities(variant.completeFlow, initialGraph),
          graph_flot_max: graphWithUsedFlow(maxFlowGraph, initialGraph),
          chemin_critique: criticalPath
        };
      } catch (error) {
        console.warn(`Erreur pour la variante ${index}:`, error.message);
        return null;
      }
    }).filter(c => c !== null);

    // Statistiques
    const uniqueCompletePairs = [...new Set(combinations.map(c => `${c.complete_flow_value}-${c.max_flow_value}`))];
    const validCompleteFlows = combinations.filter(c => c.is_complete_flow);
    const flowDistribution = {};
    
    combinations.forEach(c => {
      const key = `${c.complete_flow_value}-${c.max_flow_value}`;
      flowDistribution[key] = (flowDistribution[key] || 0) + 1;
    });
    
    // Éviter l'erreur "reduce of empty array"
    const mostCommonPair = Object.keys(flowDistribution).length > 0 
      ? Object.entries(flowDistribution).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : "N/A";
    
    return res.json({
      total_combinations: combinations.length,
      valid_complete_flows: validCompleteFlows.length,
      unique_flow_pairs: uniqueCompletePairs.length,
      flow_pairs: uniqueCompletePairs,
      flow_distribution: flowDistribution,
      combinations: combinations,
      analysis: {
        completeness_rate: combinations.length > 0 
          ? `${((validCompleteFlows.length / combinations.length) * 100).toFixed(2)}%`
          : "0%",
        most_common_pair: mostCommonPair,
        generation_methods: [...new Set(combinations.map(c => c.generation_method))]
      }
    });

  } catch (error) {
    console.error('Erreur dans /all-combinations:', error);
    return res.status(500).json({ 
      error: "Erreur lors du calcul des combinaisons",
      details: error.message 
    });
  }
});

// --- Endpoint pour analyser un graphe
app.post('/analyze-graph', (req, res) => {
  const { nodes, edges, source, sink } = req.body;

  if (!nodes || !edges || !source || !sink) {
    return res.status(400).json({ error: "Champs requis : nodes, edges, source, sink" });
  }

  try {
    pathCache.clear();
    
    const initialGraph = parseCytoscapeInput({ nodes, edges });
    
    const nodeCount = Object.keys(initialGraph).length;
    const edgeCount = edges.length;
    const totalCapacity = edges.reduce((sum, edge) => sum + parseInt(edge.data.capacity), 0);
    
    const allPaths = findAllPaths(initialGraph, source, sink);
    const completeFlowResult = manuelBlochSystematic(initialGraph, source, sink, []);
    const { maxFlow } = fordFulkerson(cloneGraph(initialGraph), source, sink);
    
    const pathAnalysis = allPaths.map((path, index) => {
      const bottleneck = Math.min(...path.map(edge => initialGraph[edge.from][edge.to].capacity));
      const totalCapacityPath = path.reduce((sum, edge) => sum + initialGraph[edge.from][edge.to].capacity, 0);
      
      return {
        id: index + 1,
        path: path.map(p => `${p.from}->${p.to}`).join(' → '),
        edges: path.length,
        bottleneck,
        total_capacity: totalCapacityPath,
        efficiency: (bottleneck / totalCapacityPath * 100).toFixed(2) + '%'
      };
    });
    
    const bestPath = pathAnalysis.length > 0 
      ? pathAnalysis.reduce((best, current) => current.bottleneck > best.bottleneck ? current : best)
      : {};
    
    const mostEfficient = pathAnalysis.length > 0 
      ? pathAnalysis.reduce((best, current) => parseFloat(current.efficiency) > parseFloat(best.efficiency) ? current : best)
      : {};
    
    return res.json({
      graph_info: {
        nodes: nodeCount,
        edges: edgeCount,
        total_capacity: totalCapacity,
        paths_count: allPaths.length,
        source,
        sink,
        connectivity: allPaths.length > 0 ? 'connected' : 'disconnected'
      },
      flows: {
        complete_flow: calculateTotalFlow(completeFlowResult.graph, source),
        max_flow: maxFlow,
        efficiency: maxFlow > 0 ? ((calculateTotalFlow(completeFlowResult.graph, source) / maxFlow) * 100).toFixed(2) + '%' : '0%',
        is_complete: isCompleteFlow(completeFlowResult.graph, source, sink)
      },
      path_analysis: pathAnalysis,
      recommendations: {
        best_path: bestPath,
        most_efficient: mostEfficient
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      error: "Erreur lors de l'analyse du graphe",
      details: error.message 
    });
  }
});

// --- Endpoint pour valider un flot complet
app.post('/validate-complete-flow', (req, res) => {
  const { nodes, edges, source, sink, flows } = req.body;

  if (!nodes || !edges || !source || !sink || !flows) {
    return res.status(400).json({ error: "Champs requis : nodes, edges, source, sink, flows" });
  }

  try {
    pathCache.clear();
    
    const initialGraph = parseCytoscapeInput({ nodes, edges });
    
    for (const flow of flows) {
      const { from, to, value } = flow;
      if (initialGraph[from] && initialGraph[from][to]) {
        initialGraph[from][to].flow = value;
      }
    }
    
    const isComplete = isCompleteFlow(initialGraph, source, sink);
    const totalFlow = calculateTotalFlow(initialGraph, source);
    const allPaths = findAllPaths(initialGraph, source, sink);
    
    const pathAnalysis = allPaths.map(path => {
      const saturatedArcs = path.filter(edge => {
        const residual = initialGraph[edge.from][edge.to].capacity - initialGraph[edge.from][edge.to].flow;
        return residual === 0;
      });
      
      return {
        path: path.map(p => `${p.from}->${p.to}`).join(' → '),
        has_saturated_arc: saturatedArcs.length > 0,
        saturated_arcs: saturatedArcs.map(arc => `${arc.from}->${arc.to}`)
      };
    });
    
    return res.json({
      is_complete_flow: isComplete,
      total_flow: totalFlow,
      validation_details: {
        paths_analyzed: pathAnalysis.length,
        paths_with_saturated_arcs: pathAnalysis.filter(p => p.has_saturated_arc).length,
        path_analysis: pathAnalysis
      },
      flow_conservation_check: checkFlowConservation(initialGraph, source, sink)
    });

  } catch (error) {
    return res.status(500).json({ 
      error: "Erreur lors de la validation",
      details: error.message 
    });
  }
});

// --- Vérifier la conservation du flot
function checkFlowConservation(graph, source, sink) {
  const violations = [];
  
  for (const node in graph) {
    if (node === source || node === sink) continue;
    
    let inFlow = 0;
    let outFlow = 0;
    
    for (const from in graph) {
      if (graph[from][node]) {
        inFlow += graph[from][node].flow;
      }
    }
    
    for (const to in graph[node]) {
      outFlow += graph[node][to].flow;
    }
    
    if (Math.abs(inFlow - outFlow) > 1e-10) {
      violations.push({
        node,
        inFlow,
        outFlow,
        difference: inFlow - outFlow
      });
    }
  }
  
  return {
    is_valid: violations.length === 0,
    violations
  };
}

// --- Lancer serveur
app.listen(3000, () => {
  console.log("✅ Serveur optimisé lancé sur http://localhost:3000");
  console.log("📊 Endpoints disponibles:");
  console.log("  POST /maxflow - Calcul standard flot complet + flot max");
  console.log("  POST /all-combinations - Toutes les combinaisons possibles (format uniforme)");
  console.log("  POST /analyze-graph - Analyse détaillée du graphe");
  console.log("  POST /validate-complete-flow - Validation d'un flot complet");
});