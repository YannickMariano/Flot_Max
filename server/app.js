const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Algorithme de Ford-Fulkerson pour calculer le flot maximum
function fordFulkerson(graph, source, sink) {
  let maxFlow = 0;
  const residualGraph = JSON.parse(JSON.stringify(graph));
  const parent = {};
  let pathFlow = 0;

  // Trouver un chemin augmentant avec BFS
  function bfs() {
    const visited = new Set();
    const queue = [];
    queue.push(source);
    visited.add(source);

    while (queue.length > 0) {
      const u = queue.shift();

      for (const v in residualGraph[u]) {
        if (!visited.has(v) && residualGraph[u][v] > 0) {
          parent[v] = u;
          visited.add(v);
          queue.push(v);

          if (v === sink) {
            return true;
          }
        }
      }
    }

    return false;
  }

  while (bfs()) {
    pathFlow = Infinity;
    let v = sink;

    // Trouver le flux minimal sur le chemin
    while (v !== source) {
      const u = parent[v];
      pathFlow = Math.min(pathFlow, residualGraph[u][v]);
      v = u;
    }

    // Mettre à jour le graphe résiduel
    v = sink;
    while (v !== source) {
      const u = parent[v];
      residualGraph[u][v] -= pathFlow;
      residualGraph[v][u] = residualGraph[v][u] || 0;
      residualGraph[v][u] += pathFlow;
      v = u;
    }

    maxFlow += pathFlow;
  }

  return maxFlow;
}

app.post('/api/calculate-max-flow', (req, res) => {
  try {
    const { nodes, edges } = req.body;

    // Trouver les nœuds source et sink
    const sourceNode = nodes.find(node => node.startsWith('1')); // Le premier nœud est la source
    const sinkNode = nodes.find(node => node.startsWith(nodes.length.toString())); // Le dernier nœud est le puits

    if (!sourceNode || !sinkNode) {
      return res.status(400).json({ error: 'Source or sink node not found' });
    }

    // Créer la matrice d'adjacence
    const graph = {};
    nodes.forEach(node => {
      graph[node] = {};
    });

    edges.forEach(edge => {
      graph[edge.source][edge.target] = edge.capacity;
    });

    // Calculer le flot maximum
    const maxFlow = fordFulkerson(graph, sourceNode, sinkNode);

    res.json({ maxFlow });
  } catch (error) {
    console.error('Error calculating max flow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});