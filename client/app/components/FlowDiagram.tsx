"use client";

import { useState, useCallback } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

export default function FlowDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: '1',
      type: 'input',
      data: { label: 'Source' },
      position: { x: 250, y: 0 },
    },
    {
      id: '2',
      data: { label: 'Node 2' },
      position: { x: 100, y: 100 },
    },
    {
      id: '3',
      data: { label: 'Node 3' },
      position: { x: 400, y: 100 },
    },
    {
      id: '4',
      type: 'output',
      data: { label: 'Sink' },
      position: { x: 250, y: 200 },
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: 'e1-2', source: '1', target: '2', label: '10', data: { capacity: 10 } },
    { id: 'e1-3', source: '1', target: '3', label: '5', data: { capacity: 5 } },
    { id: 'e2-4', source: '2', target: '4', label: '15', data: { capacity: 15 } },
    { id: 'e3-4', source: '3', target: '4', label: '5', data: { capacity: 5 } },
  ]);

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nextId, setNextId] = useState(5);
  const [maxFlow, setMaxFlow] = useState<number | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        label: '0',
        data: { capacity: 0 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: `${nextId}`,
        type: 'default',
        position,
        data: { label: `Node ${nextId}` },
      };

      setNodes((nds) => nds.concat(newNode));
      setNextId(nextId + 1);
    },
    [reactFlowInstance, nextId, setNodes]
  );

  const calculateMaxFlow = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/calculate-max-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes.map((node) => node.id),
          edges: edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            capacity: edge.data?.capacity || 0,
          })),
        }),
      });

      const data = await response.json();
      setMaxFlow(data.maxFlow);
    } catch (error) {
      console.error('Error calculating max flow:', error);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button
          onClick={calculateMaxFlow}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Calculer Flot Max
        </button>
        {maxFlow !== null && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <strong>Flot Maximum:</strong> {maxFlow}
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      <div className="absolute top-2 right-2 z-10 bg-gray-100 p-2 rounded">
        <h3 className="font-bold">Instructions</h3>
        <ul className="list-disc pl-4">
          <li>Glissez pour déplacer les nœuds</li>
          <li>Cliquez sur un nœud et faites glisser pour créer une connexion</li>
          <li>Double-cliquez sur une arête pour modifier sa capacité</li>
        </ul>
      </div>
    </div>
  );
}