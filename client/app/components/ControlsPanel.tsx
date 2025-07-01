"use client";

import { FaPlus, FaTrash, FaPlay, FaArrowRight, FaArrowDown } from 'react-icons/fa';

export default function ControlsPanel({
  addNewNode,
  removeSelectedNode,
  setIsSelectingSource,
  setIsSelectingSink,
  calculateMaxFlow,
  selectedNode,
}: {
  addNewNode: () => void;
  removeSelectedNode: () => void;
  setIsSelectingSource: (value: boolean) => void;
  setIsSelectingSink: (value: boolean) => void;
  calculateMaxFlow: () => void;
  selectedNode: string | null;
}) {
  return (
    <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded shadow-lg">
      <div className="flex flex-col space-y-3">
        <button
          onClick={addNewNode}
          className="flex items-center bg-green-500 text-white px-3 py-2 rounded"
        >
          <FaPlus className="mr-2" /> Ajouter Noeud
        </button>

        <button
          onClick={removeSelectedNode}
          disabled={!selectedNode}
          className={`flex items-center px-3 py-2 rounded ${
            selectedNode ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-500'
          }`}
        >
          <FaTrash className="mr-2" /> Supprimer Noeud
        </button>

        <div className="border-t pt-3">
          <button
            onClick={() => setIsSelectingSource(true)}
            className="flex items-center bg-blue-500 text-white px-3 py-2 rounded mb-2"
          >
            <FaArrowRight className="mr-2" /> Définir Source
          </button>

          <button
            onClick={() => setIsSelectingSink(true)}
            className="flex items-center bg-purple-500 text-white px-3 py-2 rounded"
          >
            <FaArrowDown className="mr-2" /> Définir Puits
          </button>
        </div>

        <button
          onClick={calculateMaxFlow}
          className="flex items-center bg-orange-500 text-white px-3 py-2 rounded mt-4"
        >
          <FaPlay className="mr-2" /> Calculer Flot Max
        </button>
      </div>
    </div>
  );
}