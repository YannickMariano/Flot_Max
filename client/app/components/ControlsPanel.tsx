"use client";

import { FaPlus, FaTrash, FaProjectDiagram } from 'react-icons/fa';

export default function ControlsPanel({
  addNewNode,
  selectedNode,
  removeNode,
}: {
  addNewNode: () => void;
  selectedNode: string | null;
  removeNode?: () => void;
}) {
  return (
    <div className="absolute top-4 left-4 z-10 bg-white/90 p-4 rounded-lg shadow-md border">
      <div className="flex items-center mb-3 text-blue-600">
        <FaProjectDiagram className="mr-2" />
        <h2 className="font-bold">Contrôles</h2>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={addNewNode}
          className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded w-full"
        >
          <FaPlus className="mr-2" />
          Ajouter Noeud
        </button>
        
        <button
          onClick={removeNode}
          disabled={!selectedNode}
          className={`flex items-center px-3 py-2 rounded w-full ${
            selectedNode 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <FaTrash className="mr-2" />
          Supprimer Noeud
        </button>
      </div>
    </div>
  );
}