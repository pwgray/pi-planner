import React, { useState } from 'react';
import { ChevronRight, Clock, Rocket, CheckCircle, Sparkles, Plus } from 'lucide-react';

const EpicCard = ({ epic, onRefine, onGenerateIssues, onAddIssue, loadingAI, issues }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let statusColor = 'bg-gray-400';
  let statusText = 'Not Started';
  let statusIcon = <Clock className="w-4 h-4 mr-1" />;

  if (epic.status === 'inProgress') {
    statusColor = 'bg-yellow-400';
    statusText = 'In Progress';
    statusIcon = <Rocket className="w-4 h-4 mr-1" />;
  } else if (epic.status === 'complete') {
    statusColor = 'bg-green-500';
    statusText = 'Complete';
    statusIcon = <CheckCircle className="w-4 h-4 mr-1" />;
  }

  const epicIssues = issues.filter(issue => issue.epicId === epic.id);

  return (
    <div className="bg-blue-100 rounded-lg p-4 shadow-md transition-all duration-300">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-blue-800 break-words">{epic.title}</h3>
          <div className="flex items-center mt-1 text-xs font-medium text-gray-600">
            <span className={`px-2 py-0.5 rounded-full text-white ${statusColor}`}>
              {statusIcon}{statusText}
            </span>
            <span className="ml-2">({epicIssues.length} issues)</span>
          </div>
        </div>
        <ChevronRight
          className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-4 border-gray-300">
          <p className="text-sm text-gray-700">{epic.description}</p>
          <div className="flex space-x-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRefine(epic.id); }}
              className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold hover:bg-yellow-500 transition-colors flex items-center"
              disabled={loadingAI}
            >
              <Sparkles className="w-4 h-4 mr-1" /> Refine
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateIssues(epic.id); }}
              className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-semibold hover:bg-purple-600 transition-colors flex items-center"
              disabled={loadingAI}
            >
              <Sparkles className="w-4 h-4 mr-1" /> Generate
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddIssue(epic.id); }}
              className="px-3 py-1 bg-gray-300 text-gray-800 rounded-full text-xs font-semibold hover:bg-gray-400 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpicCard;
