const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ------------------------------ 
// Optimized Ford-Fulkerson with Enhanced Path Tracking
// ------------------------------ 
function fordFulkerson(nodes, edges, sourceId, sinkId) {
    const n = nodes.length;
    const idToIndex = new Map();
    const indexToId = [];
    
    nodes.forEach((node, i) => {
        idToIndex.set(node.data.id, i);
        indexToId[i] = node.data.id;
    });
    
    const source = idToIndex.get(sourceId);
    const sink = idToIndex.get(sinkId);
    
    const capacity = Array.from({ length: n }, () => Array(n).fill(0));
    const flow = Array.from({ length: n }, () => Array(n).fill(0));
    
    for (const edge of edges) {
        const u = idToIndex.get(edge.data.source);
        const v = idToIndex.get(edge.data.target);
        const cap = parseInt(edge.data.capacity);
        capacity[u][v] += cap;
    }
    
    // Track all augmenting paths and their flows
    const allPaths = [];
    let maxFlow = 0;
    
    while (true) {
        // Find an augmenting path
        const result = findAugmentingPath(source, sink, capacity, flow, n);
        if (!result) break; // No more augmenting paths
        
        const { path, minCapacity } = result;
        maxFlow += minCapacity;
        
        // Record this augmenting path and its flow value
        const pathInfo = {
            flow: minCapacity,
            path: path.map(vertex => ({ 
                from: indexToId[vertex.from], 
                to: indexToId[vertex.to] 
            })),
            nodes: [...new Set(path.flatMap(vertex => [vertex.from, vertex.to]))].map(idx => indexToId[idx])
        };
        allPaths.push(pathInfo);
        
        // Update flow network
        for (const { from, to } of path) {
            flow[from][to] += minCapacity;
            flow[to][from] -= minCapacity; // Reverse edge
        }
    }
    
    // Find the path with the maximum flow contribution
    const maxFlowPath = allPaths.reduce((max, current) => 
        current.flow > max.flow ? current : max, 
        { flow: 0, path: [], nodes: [] }
    );

    // Identify important nodes that appear most frequently in augmenting paths
    const nodeImportance = {};
    let maxFrequency = 0;
    
    allPaths.forEach(pathInfo => {
        pathInfo.nodes.forEach(nodeId => {
            nodeImportance[nodeId] = (nodeImportance[nodeId] || 0) + pathInfo.flow;
            maxFrequency = Math.max(maxFrequency, nodeImportance[nodeId]);
        });
    });
    
    // Filter nodes with high importance (those that carry most flow)
    const criticalNodes = Object.entries(nodeImportance)
        .filter(([_, value]) => value > maxFrequency * 0.7) // Nodes with at least 70% of max flow
        .map(([nodeId]) => nodeId);
    
    // Get all edges with positive flow and identify saturated edges
    const flowEdges = [];
    const saturatedEdges = [];
    const bottleneckEdges = [];
    
    for (let u = 0; u < n; u++) {
        for (let v = 0; v < n; v++) {
            if (capacity[u][v] > 0) {  // Only consider actual edges
                const edgeInfo = {
                    from: indexToId[u],
                    to: indexToId[v],
                    flow: flow[u][v],
                    capacity: capacity[u][v],
                    saturated: flow[u][v] === capacity[u][v]
                };
                
                if (flow[u][v] > 0) {
                    flowEdges.push(edgeInfo);
                    
                    if (edgeInfo.saturated) {
                        saturatedEdges.push({
                            from: indexToId[u],
                            to: indexToId[v]
                        });
                    }
                }
                
                if (flow[u][v] === 0 && capacity[u][v] > 0) {
                    bottleneckEdges.push({
                        from: indexToId[u],
                        to: indexToId[v],
                        capacity: capacity[u][v]
                    });
                }
            }
        }
    }
    
    return { 
        maxFlow, 
        flowEdges, 
        saturatedEdges,
        bottleneckEdges,
        maxFlowPath: maxFlowPath.path,
        maxFlowNodes: maxFlowPath.nodes,
        maxFlowValue: maxFlowPath.flow,
        criticalNodes
    };
}

// Helper function to find an augmenting path using BFS
function findAugmentingPath(source, sink, capacity, flow, n) {
    const visited = Array(n).fill(false);
    const parent = Array(n).fill(-1);
    const parentEdge = Array(n).fill(null);
    
    // BFS
    const queue = [source];
    visited[source] = true;
    
    while (queue.length > 0) {
        const u = queue.shift();
        
        for (let v = 0; v < n; v++) {
            const residual = capacity[u][v] - flow[u][v];
            
            if (!visited[v] && residual > 0) {
                parent[v] = u;
                parentEdge[v] = { from: u, to: v };
                
                if (v === sink) {
                    // Found a path to sink, construct the path
                    const path = [];
                    let minCapacity = Infinity;
                    let current = sink;
                    
                    while (current !== source) {
                        const u = parent[current];
                        path.unshift({ from: u, to: current });
                        minCapacity = Math.min(minCapacity, capacity[u][current] - flow[u][current]);
                        current = u;
                    }
                    
                    return { path, minCapacity };
                }
                
                visited[v] = true;
                queue.push(v);
            }
        }
    }
    
    // No path found
    return null;
}

/**
 * Construit le graphe { source: { cible: capacité } }
 */
function buildGraph(elements) {
    const graph = {};
    elements.forEach(el => {
        if (el.data.source && el.data.target) {
            const { source, target, capacity } = el.data;
            if (!graph[source]) graph[source] = {};
            graph[source][target] = parseInt(capacity);
            if (!graph[target]) graph[target] = {};
        } else if (el.data.id) {
            const { id } = el.data;
            if (!graph[id]) graph[id] = {};
        }
    });
    return graph;
}

/**
 * BFS simple
 */
function bfs(residual, source, sink, parent) {
    const visited = new Set();
    const queue = [source];
    visited.add(source);
    parent[source] = null;

    while (queue.length > 0) {
        const u = queue.shift();
        for (const v in residual[u]) {
            if (!visited.has(v) && residual[u][v] > 0) {
                parent[v] = u;
                if (v === sink) return true;
                visited.add(v);
                queue.push(v);
            }
        }
    }
    return false;
}

/**
 * Flot complet (1 passage par chemin), puis Ford-Fulkerson
 */
function computeFlows(graph, source, sink) {
    const residual = {};
    const flow = {};

    for (const u in graph) {
        residual[u] = {};
        flow[u] = {};
        for (const v in graph[u]) {
            residual[u][v] = graph[u][v];
            residual[v] = residual[v] || {};
            residual[v][u] = 0;
            flow[u][v] = 0;
        }
    }

    const parent = {};
    let maxFlow = 0;

    // Étape 1 : Flot Complet
    while (bfs(residual, source, sink, parent)) {
        let pathFlow = Infinity;
        let v = sink;
        while (v !== source) {
            const u = parent[v];
            pathFlow = Math.min(pathFlow, residual[u][v]);
            v = u;
        }

        v = sink;
        while (v !== source) {
            const u = parent[v];
            flow[u][v] += pathFlow;
            flow[v][u] -= pathFlow;
            residual[u][v] -= pathFlow;
            residual[v][u] += pathFlow;
            v = u;
        }

        maxFlow += pathFlow;
    }

    // Sauvegarde du graphe après flot complet
    const flowComplet = JSON.parse(JSON.stringify(flow));

    // Étape 2 : continuer jusqu'au flot maximal
    while (bfs(residual, source, sink, parent)) {
        let pathFlow = Infinity;
        let v = sink;
        while (v !== source) {
            const u = parent[v];
            pathFlow = Math.min(pathFlow, residual[u][v]);
            v = u;
        }

        v = sink;
        while (v !== source) {
            const u = parent[v];
            flow[u][v] += pathFlow;
            flow[v][u] -= pathFlow;
            residual[u][v] -= pathFlow;
            residual[v][u] += pathFlow;
            v = u;
        }

        maxFlow += pathFlow;
    }

    return { flowComplet, flowMax: flow };
}

/**
 * Convertit un graphe de flots en liste Cytoscape.js
 */
function graphToCytoscape(flow, baseGraph) {
    const nodeSet = new Set();
    const elements = [];

    // Collect all nodes
    for (const u in baseGraph) {
        nodeSet.add(u);
        for (const v in baseGraph[u]) {
            nodeSet.add(v);
        }
    }

    // Add node elements first
    for (const nodeId of nodeSet) {
        elements.push({ data: { id: nodeId } });
    }

    // Add edge elements
    for (const u in flow) {
        for (const v in flow[u]) {
            if (flow[u][v] > 0) {
                elements.push({
                    data: {
                        source: u,
                        target: v,
                        capacity: flow[u][v].toString()
                    }
                });
            }
        }
    }

    return elements;
}


// New function to compute max flow as Cytoscape elements
function computeMaxFlowAsCytoscapeElements(elements, source, sink) {
    const graph = {};
    elements.forEach(el => {
        if (el.data.source && el.data.target) {
            const { source, target, capacity } = el.data;
            if (!graph[source]) graph[source] = {};
            graph[source][target] = parseInt(capacity);
            if (!graph[target]) graph[target] = {};
        } else {
            const { id } = el.data;
            if (!graph[id]) graph[id] = {};
        }
    });

    // Implement the max flow logic using the BFS function here
    const residual = {};
    const flow = {};
    for (const u in graph) {
        residual[u] = {};
        flow[u] = {};
        for (const v in graph[u]) {
            residual[u][v] = graph[u][v];
            residual[v] = residual[v] || {};
            residual[v][u] = 0;
            flow[u][v] = 0;
        }
    }

    let maxFlow = 0;
    const parent = {};

    while (bfs(residual, source, sink, parent)) {
        let pathFlow = Infinity;
        let v = sink;
        while (v !== source) {
            const u = parent[v];
            pathFlow = Math.min(pathFlow, residual[u][v]);
            v = u;
        }

        v = sink;
        while (v !== source) {
            const u = parent[v];
            flow[u][v] += pathFlow;
            flow[v][u] = (flow[v][u] || 0) - pathFlow;
            residual[u][v] -= pathFlow;
            residual[v][u] += pathFlow;
            v = u;
        }

        maxFlow += pathFlow;
    }

    const responseElements = [];
    for (const u in graph) {
        for (const v in graph[u]) {
            responseElements.push({
                data: {
                    source: u,
                    target: v,
                    capacity: flow[u][v] || 0
                }
            });
        }
    }

    return responseElements;
}

/**
 * Applique uniquement la première phase "flot complet"
 * (1 chemin augmentant à la fois, sans optimisation maximale)
 */
function computeFlowComplet(graph, source, sink) {
    const residual = {};
    const flow = {};
    for (const u in graph) {
        residual[u] = {};
        flow[u] = {};
        for (const v in graph[u]) {
            residual[u][v] = graph[u][v];
            residual[v] = residual[v] || {};
            residual[v][u] = 0;
            flow[u][v] = 0;
        }
    }
    const parent = {};
    // Exécute le BFS tant qu'un chemin existe (1 fois par chemin possible)
    while (bfs(residual, source, sink, parent)) {
        let pathFlow = Infinity;
        let v = sink;
        while (v !== source) {
            const u = parent[v];
            pathFlow = Math.min(pathFlow, residual[u][v]);
            v = u;
        }
        // Appliquer le flot
        v = sink;
        while (v !== source) {
            const u = parent[v];
            flow[u][v] += pathFlow;
            flow[v][u] -= pathFlow;
            residual[u][v] -= pathFlow;
            residual[v][u] += pathFlow;
            v = u;
        }
    }
    return flow;
}

/**
 * Nettoyer le flot pour ne garder que les arcs positifs
 */
function cleanFlow(flow) {
    const cleaned = {};
    for (const u in flow) {
        for (const v in flow[u]) {
            if (flow[u][v] > 0) {
                if (!cleaned[u]) cleaned[u] = {};
                cleaned[u][v] = flow[u][v];
            }
        }
    }
    return cleaned;
}

// API Endpoint for max flow calculation
app.post('/maxflow', (req, res) => {
    const { nodes, edges, source, sink } = req.body;
    
    if (!nodes || !edges || !source || !sink) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Calcul du flot avec la méthode optimisée
        const result = fordFulkerson(nodes, edges, source, sink);
        
        // Calcul du flot complet et du flot maximal avec la méthode du premier code
        const combined = [...nodes, ...edges];
        const graph = buildGraph(combined);
        const { flowComplet, flowMax } = computeFlows(graph, source, sink);
        
        // Conversion en éléments Cytoscape
        const graphComplet = graphToCytoscape(flowComplet, graph);
        const graphMax = graphToCytoscape(flowMax, graph);
        
        // Compute the otherGraph using the same nodes and edges
        const otherGraph = computeMaxFlowAsCytoscapeElements([...nodes, ...edges], source, sink);
        
        // Include all results in the response
        res.json({ 
            ...result, 
            otherGraph,
            graphComplet,
            graphMax
        });
    } catch (err) {
        res.status(500).json({ error: 'Calculation error', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Max Flow API running at http://localhost:${PORT}`);
});