"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ControlsPanel from './ControlsPanel';

const nodeTypes = {
  custom: CustomNode,
};

function CustomNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-full w-16 h-16 flex items-center justify-center bg-blue-500 text-white border-2 border-white shadow-lg">
      {data.label}
    </div>
  );
}

export default function FlowDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [isSelectingSource, setIsSelectingSource] = useState(false);
  const [isSelectingSink, setIsSelectingSink] = useState(false);
  const [capacityInput, setCapacityInput] = useState('');
  const [edgeToUpdate, setEdgeToUpdate] = useState<string | null>(null);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (edgeToUpdate && inputRef.current) {
      inputRef.current.focus();
    }
  }, [edgeToUpdate]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        label: '0',
        data: { capacity: 0 },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setSelectedEdge(null);

    if (isSelectingSource) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          type: n.id === node.id ? 'input' : n.type === 'input' ? 'custom' : n.type,
        }))
      );
      setIsSelectingSource(false);
    } else if (isSelectingSink) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          type: n.id === node.id ? 'output' : n.type === 'output' ? 'custom' : n.type,
        }))
      );
      setIsSelectingSink(false);
    }
  }, [isSelectingSource, isSelectingSink, setNodes]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null);
    setEdgeToUpdate(edge.id);
    setCapacityInput(edge.data?.capacity?.toString() || '0');
  }, []);

  const addNewNode = useCallback(() => {
    const newNodeId = `node-${nodeIdCounter}`;
    const newNode = {
      id: newNodeId,
      type: 'custom',
      data: { label: `N${nodeIdCounter}` },
      position: { 
        x: Math.random() * 500, 
        y: Math.random() * 500 
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setNodeIdCounter(nodeIdCounter + 1);
  }, [nodeIdCounter, setNodes]);

  const removeSelectedNode = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode)
    );
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const updateEdgeCapacity = useCallback(() => {
    if (!edgeToUpdate || !capacityInput) return;

    const newCapacity = parseInt(capacityInput);
    if (isNaN(newCapacity)) return;

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeToUpdate) {
          return {
            ...edge,
            label: newCapacity.toString(),
            data: { capacity: newCapacity },
          };
        }
        return edge;
      })
    );

    setEdgeToUpdate(null);
    setCapacityInput('');
  }, [edgeToUpdate, capacityInput, setEdges]);

  const calculateMaxFlow = async () => {
    const sourceNode = nodes.find((n) => n.type === 'input');
    const sinkNode = nodes.find((n) => n.type === 'output');

    if (!sourceNode || !sinkNode) {
      alert('Veuillez sélectionner une source et un puits');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/calculate-max-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: sourceNode.id,
          sink: sinkNode.id,
          edges: edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            capacity: edge.data?.capacity || 0,
          })),
        }),
      });

      const data = await response.json();
      alert(`Flot maximum: ${data.maxFlow}`);
    } catch (error) {
      console.error('Error calculating max flow:', error);
    }
  };

  return (
    <div className="relative" style={{ width: '100vw', height: '100vh' }}>
      <ControlsPanel
        addNewNode={addNewNode}
        removeSelectedNode={removeSelectedNode}
        setIsSelectingSource={setIsSelectingSource}
        setIsSelectingSink={setIsSelectingSink}
        calculateMaxFlow={calculateMaxFlow}
        selectedNode={selectedNode}
      />

      {edgeToUpdate && (
        <div className="absolute top-20 left-4 z-10 bg-white p-4 rounded shadow-lg">
          <h3 className="font-bold mb-2">Modifier capacité</h3>
          <input
            ref={inputRef}
            type="number"
            value={capacityInput}
            onChange={(e) => setCapacityInput(e.target.value)}
            className="border p-2 mr-2"
          />
          <button
            onClick={updateEdgeCapacity}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Valider
          </button>
          <button
            onClick={() => setEdgeToUpdate(null)}
            className="bg-gray-500 text-white px-3 py-1 rounded ml-2"
          >
            Annuler
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        fitView
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}