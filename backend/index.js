const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ------------------------------
// Ford-Fulkerson (DFS-based)
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

    const visited = Array(n).fill(false);

    function dfs(u, minCap, parent) {
        if (u === sink) return minCap;
        visited[u] = true;

        for (let v = 0; v < n; v++) {
            const residual = capacity[u][v] - flow[u][v];
            if (!visited[v] && residual > 0) {
                parent[v] = u;
                const pushed = dfs(v, Math.min(minCap, residual), parent);
                if (pushed > 0) return pushed;
            }
        }
        return 0;
    }

    let maxFlow = 0;
    const saturatedEdges = [];
    const pathEdges = new Set();
    const pathNodes = new Set();

    while (true) {
        visited.fill(false);
        const parent = Array(n).fill(-1);
        const pushed = dfs(source, Infinity, parent);
        if (pushed === 0) break;

        maxFlow += pushed;
        let v = sink;
        while (v !== source) {
            const u = parent[v];
            flow[u][v] += pushed;
            flow[v][u] -= pushed;
            pathEdges.add(`${u}-${v}`);
            pathNodes.add(u);
            pathNodes.add(v);
            if (flow[u][v] === capacity[u][v]) {
                saturatedEdges.push({ from: indexToId[u], to: indexToId[v] });
            }
            v = u;
        }
    }

    const flowEdges = [];
    for (let u = 0; u < n; u++) {
        for (let v = 0; v < n; v++) {
            if (flow[u][v] > 0) {
                flowEdges.push({
                    from: indexToId[u],
                    to: indexToId[v],
                    flow: flow[u][v],
                    saturated: flow[u][v] === capacity[u][v]
                });
            }
        }
    }

    const flowPathEdges = Array.from(pathEdges).map(pair => {
        const [u, v] = pair.split('-').map(i => parseInt(i));
        return {
            from: indexToId[u],
            to: indexToId[v]
        };
    });

    const flowPathNodes = Array.from(pathNodes).map(i => indexToId[i]);

    return { maxFlow, flowEdges, saturatedEdges, flowPathEdges, flowPathNodes };
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
