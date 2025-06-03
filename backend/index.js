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

// API Endpoint
app.post('/maxflow', (req, res) => {
    const { nodes, edges, source, sink } = req.body;
    
    if (!nodes || !edges || !source || !sink) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const result = fordFulkerson(nodes, edges, source, sink);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Calculation error', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Max Flow API running at http://localhost:${PORT}`);
});