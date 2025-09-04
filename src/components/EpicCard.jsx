import React, { useState } from 'react';
import { ChevronRight, Clock, Rocket, CheckCircle, Sparkles, Plus, Edit, Trash2, Save, X, History } from 'lucide-react';

const EpicCard = ({ epic, onRefine, onGenerateIssues, onAddIssue, onUpdateEpic, onDeleteEpic, loadingAI, issues }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editData, setEditData] = useState({
    title: epic.title || '',
    description: epic.description || '',
    summary: epic.summary || '',
    acceptanceCriteria: epic.acceptanceCriteria || '',
    priority: epic.priority || 'Medium',
    tShirtSize: epic.tShirtSize || 'M'
  });
  const [showCreateEpicForm, setShowCreateEpicForm] = useState(false);

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

  const handleSave = () => {
    onUpdateEpic(epic.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: epic.title || '',
      description: epic.description || '',
      summary: epic.summary || '',
      acceptanceCriteria: epic.acceptanceCriteria || '',
      priority: epic.priority || 'Medium',
      tShirtSize: epic.tShirtSize || 'M'
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDeleteEpic(epic.id);
    setShowDeleteConfirm(false);
  };

  const handleHistoryPreview = (historyEntry) => {
    setPreviewData(historyEntry.data);
    setEditData(historyEntry.data);
  };

  const handleApplyHistory = () => {
    if (previewData) {
      onUpdateEpic(epic.id, previewData);
      setPreviewData(null);
      setShowHistoryDialog(false);
      setIsEditing(false);
    }
  };

  const handleCancelHistory = () => {
    // Revert to current epic data
    setEditData({
      title: epic.title || '',
      description: epic.description || '',
      summary: epic.summary || '',
      acceptanceCriteria: epic.acceptanceCriteria || '',
      priority: epic.priority || 'Medium',
      tShirtSize: epic.tShirtSize || 'M'
    });
    setPreviewData(null);
    setShowHistoryDialog(false);
  };

  const handleCreateEpic = () => {
    // Logic to create a new epic
    const newEpic = {
      id: Date.now().toString(), // Simple unique ID
      title: editData.title,
      description: editData.description,
      summary: editData.summary,
      acceptanceCriteria: editData.acceptanceCriteria,
      priority: editData.priority,
      tShirtSize: editData.tShirtSize,
      status: 'Not Started'
    };
    onAddEpic(newEpic);
    setShowCreateEpicForm(false);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-800 font-bold';
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getSizeColor = (size) => {
    switch (size) {
      case 'XS': return 'text-green-600';
      case 'S': return 'text-green-500';
      case 'M': return 'text-yellow-600';
      case 'L': return 'text-orange-600';
      case 'XL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

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
          <div className="flex items-center mt-1 text-xs font-medium gap-3">
            <span className={`font-semibold ${getPriorityColor(epic.priority || 'Medium')}`}>
              Priority: {epic.priority || 'Medium'}
            </span>
            <span className={`font-semibold ${getSizeColor(epic.tShirtSize || 'M')}`}>
              Size: {epic.tShirtSize || 'M'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowHistoryDialog(true); setIsExpanded(true); }}
            className="p-1 text-purple-600 hover:bg-purple-200 rounded transition-colors"
            title="View History"
            disabled={!epic.history || epic.history.length === 0}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
            className="p-1 text-blue-600 hover:bg-blue-200 rounded transition-colors"
            title="Edit Epic"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
            className="p-1 text-red-600 hover:bg-red-200 rounded transition-colors"
            title="Delete Epic"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <ChevronRight
          className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-4 border-gray-300">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
                <input
                  type="text"
                  value={editData.summary}
                  onChange={(e) => setEditData({...editData, summary: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Brief summary of the epic"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Acceptance Criteria</label>
                <textarea
                  value={editData.acceptanceCriteria}
                  onChange={(e) => setEditData({...editData, acceptanceCriteria: e.target.value})}
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows="3"
                  placeholder="Given, When, Then format..."
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={editData.priority}
                    onChange={(e) => setEditData({...editData, priority: e.target.value})}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">T-Shirt Size</label>
                  <select
                    value={editData.tShirtSize}
                    onChange={(e) => setEditData({...editData, tShirtSize: e.target.value})}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold hover:bg-green-600 transition-colors flex items-center"
                >
                  <Save className="w-4 h-4 mr-1" /> Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-500 text-white rounded-full text-xs font-semibold hover:bg-gray-600 transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {epic.summary && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Summary</h4>
                  <p className="text-sm text-gray-700">{epic.summary}</p>
                </div>
              )}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-sm text-gray-700">{epic.description}</p>
              </div>
              {epic.acceptanceCriteria && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Acceptance Criteria</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{epic.acceptanceCriteria}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action Buttons - Always Visible */}
      <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-200">
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

      {/* History Dialog */}
      {showHistoryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-start p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 mt-4 ml-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-purple-600 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Epic History
              </h3>
              <button
                onClick={() => setShowHistoryDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              {epic.history && epic.history.length > 0 ? (
                [...epic.history].reverse().map((entry, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      previewData === entry.data 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                    }`}
                    onClick={() => handleHistoryPreview(entry)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-purple-700">
                        {entry.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.user}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {entry.data.title}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No history available</p>
              )}
            </div>

            {previewData && (
              <div className="flex space-x-2 pt-3 border-t">
                <button
                  onClick={handleApplyHistory}
                  className="flex-1 bg-purple-500 text-white font-bold py-2 px-4 rounded hover:bg-purple-600 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={handleCancelHistory}
                  className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2 text-red-600">Delete Epic</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete "{epic.title}"? This will also delete all {epicIssues.length} associated issues. This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateEpicForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2 text-blue-600">Create New Epic</h3>
            <input type="text" placeholder="Title" value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2" />
            <textarea placeholder="Description" value={editData.description} onChange={(e) => setEditData({...editData, description: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2" rows="3"></textarea>
            <button onClick={handleCreateEpic} className="w-full px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold hover:bg-green-600 transition-colors flex items-center justify-center">
              <Plus className="w-4 h-4 mr-1" /> Save New Epic
            </button>
            <button onClick={() => setShowCreateEpicForm(false)} className="w-full px-3 py-1 bg-gray-500 text-white rounded-full text-xs font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center mt-2">
              <X className="w-4 h-4 mr-1" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpicCard;
