"use client";

import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const CircleNode = ({ data, selected }: { data: { label: string }, selected?: boolean }) => (
  <div style={{
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: data.label === 'S' ? '#10B981' : 
                    data.label === 'T' ? '#EF4444' : 'white',
    border: `3px solid ${selected ? '#F59E0B' : 
            data.label === 'S' ? '#047857' : 
            data.label === 'T' ? '#B91C1C' : '#3B82F6'}`,
    color: data.label === 'S' || data.label === 'T' ? 'white' : '#3B82F6',
    fontWeight: 'bold',
    fontSize: '20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease'
  }}>
    {data.label}
  </div>
);

const nodeTypes = { circleNode: CircleNode };

export default function FlowDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nextChar, setNextChar] = useState('A'.charCodeAt(0));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [edgeValue, setEdgeValue] = useState('10');
  const [actionMode, setActionMode] = useState<'select' | 'source' | 'sink' | 'connect'>('select');
  const inputRef = useRef<HTMLInputElement>(null);

  // Ajouter un nouveau nœud
  const addNewNode = useCallback(() => {
    const label = String.fromCharCode(nextChar);
    const newNode = {
      id: label,
      type: 'circleNode',
      position: { 
        x: Math.random() * 500 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: { label }
    };
    
    setNodes((nds) => nds.concat(newNode));
    setNextChar(nextChar + 1);
  }, [nextChar]);

  // Supprimer un nœud
  const removeNode = useCallback(() => {
    if (!selectedNode) return;
    
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
    setEdges((eds) => eds.filter((e) => 
      e.source !== selectedNode && e.target !== selectedNode
    ));
    setSelectedNode(null);
  }, [selectedNode]);

  // Définir comme source
  const setAsSource = useCallback(() => {
    if (!selectedNode) return;
    
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        label: n.id === selectedNode ? 'S' : n.data.label === 'S' ? String.fromCharCode(65 + parseInt(n.id)) : n.data.label
      }
    })));
    setActionMode('select');
  }, [selectedNode]);

  // Définir comme puits
  const setAsSink = useCallback(() => {
    if (!selectedNode) return;
    
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        label: n.id === selectedNode ? 'T' : n.data.label === 'T' ? String.fromCharCode(65 + parseInt(n.id)) : n.data.label
      }
    })));
    setActionMode('select');
  }, [selectedNode]);

  // Créer une connexion
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}`,
        label: edgeValue,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'smoothstep',
        animated: false
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setEdgeValue('10');
      setActionMode('select');
    },
    [edgeValue]
  );

  // Mettre à jour la valeur d'une liaison
  const updateEdgeValue = useCallback(() => {
    if (!selectedEdge) return;
    
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdge
          ? { ...edge, label: edgeValue }
          : edge
      )
    );
    setSelectedEdge(null);
  }, [selectedEdge, edgeValue]);

  // Gestion du clic sur nœud
  const onNodeClick = useCallback((_, node: Node) => {
    setSelectedNode(node.id);
    
    if (actionMode === 'source') {
      setAsSource();
    } else if (actionMode === 'sink') {
      setAsSink();
    }
  }, [actionMode, setAsSource, setAsSink]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Panneau de contrôle */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: '200px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Contrôles</h2>
        
        <button style={buttonStyle} onClick={addNewNode}>
          Ajouter Noeud
        </button>
        
        <button 
          style={{
            ...buttonStyle,
            ...(!selectedNode && disabledButtonStyle)
          }}
          onClick={removeNode}
          disabled={!selectedNode}
        >
          Supprimer Noeud
        </button>

        <div style={{ margin: '10px 0', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <button 
            style={{
              ...buttonStyle,
              background: actionMode === 'source' ? '#F59E0B' : '#10B981'
            }}
            onClick={() => setActionMode('source')}
          >
            Définir Source (S)
          </button>
          
          <button 
            style={{
              ...buttonStyle,
              background: actionMode === 'sink' ? '#F59E0B' : '#EF4444',
              marginTop: '8px'
            }}
            onClick={() => setActionMode('sink')}
          >
            Définir Puits (T)
          </button>
        </div>

        <button 
          style={{
            ...buttonStyle,
            background: actionMode === 'connect' ? '#F59E0B' : '#3B82F6'
          }}
          onClick={() => setActionMode('connect')}
        >
          Mode Connexion
        </button>

        {selectedEdge && (
          <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '5px' }}>Capacité:</h3>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input
                ref={inputRef}
                type="number"
                value={edgeValue}
                onChange={(e) => setEdgeValue(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <button 
                style={{
                  ...buttonStyle,
                  padding: '8px 12px',
                  background: '#10B981'
                }}
                onClick={updateEdgeValue}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={actionMode === 'connect' ? onConnect : undefined}
        onNodeClick={onNodeClick}
        onEdgeClick={(_, edge) => {
          setSelectedEdge(edge.id);
          setEdgeValue(edge.label || '10');
          inputRef.current?.focus();
        }}
        nodeTypes={nodeTypes}
        connectionMode="strict"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Indicateur de mode */}
      {actionMode !== 'select' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#F59E0B',
          color: 'white',
          padding: '8px 15px',
          borderRadius: '20px',
          zIndex: 10,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          {actionMode === 'source' && 'Mode Source - Cliquez sur un nœud'}
          {actionMode === 'sink' && 'Mode Puits - Cliquez sur un nœud'}
          {actionMode === 'connect' && 'Mode Connexion - Reliez deux nœuds'}
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: '10px',
  background: '#3B82F6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  width: '100%',
  transition: 'all 0.2s ease'
};

const disabledButtonStyle = {
  background: '#E5E7EB',
  color: '#9CA3AF',
  cursor: 'not-allowed'
};