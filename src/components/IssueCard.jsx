import React, { useState, useEffect } from 'react';
import { Save, Edit, Trash2 } from 'lucide-react';

const IssueCard = ({ issue, onUpdate, onDelete, allSprints }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedIssue, setEditedIssue] = useState(issue);

  useEffect(() => {
    setEditedIssue(issue);
  }, [issue]);

  const handleSave = () => {
    onUpdate(issue.id, 'summary', editedIssue.summary);
    onUpdate(issue.id, 'description', editedIssue.description);
    onUpdate(issue.id, 'acceptanceCriteria', editedIssue.acceptanceCriteria);
    onUpdate(issue.id, 'storyPoints', parseInt(editedIssue.storyPoints, 10));
    onUpdate(issue.id, 'timeEstimate', parseInt(editedIssue.timeEstimate, 10));
    onUpdate(issue.id, 'status', editedIssue.status);
    onUpdate(issue.id, 'sprint', editedIssue.sprint);
    setIsEditing(false);
  };

  const statusOptions = ['To Do', 'In Progress', 'Done'];

  return (
    <div className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm text-gray-900 flex-1 break-words">
          {editedIssue.summary}
        </h4>
        <div className="flex-shrink-0 flex items-center space-x-1 ml-2">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="text-green-500 hover:text-green-600 transition-colors p-1 rounded-full"
              title="Save Issue"
            >
              <Save className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-500 hover:text-blue-600 transition-colors p-1 rounded-full"
              title="Edit Issue"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(issue.id)}
            className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-full"
            title="Delete Issue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-600 space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              value={editedIssue.summary}
              onChange={(e) => setEditedIssue({ ...editedIssue, summary: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
              placeholder="Summary"
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editedIssue.description}
              onChange={(e) => setEditedIssue({ ...editedIssue, description: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows="3"
              placeholder="Description"
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">Acceptance Criteria</label>
            <textarea
              value={editedIssue.acceptanceCriteria}
              onChange={(e) => setEditedIssue({ ...editedIssue, acceptanceCriteria: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows="3"
              placeholder="Acceptance Criteria (Gherkin)"
            />
            <div className="flex space-x-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Story Points</label>
              <input
                type="number"
                value={editedIssue.storyPoints}
                onChange={(e) => setEditedIssue({ ...editedIssue, storyPoints: e.target.value })}
                className="w-1/2 text-xs p-2 border rounded"
                placeholder="Story Points"
              />
              <label className="block text-xs font-medium text-gray-700 mb-1">Time Estimate</label>
              <input
                type="number"
                value={editedIssue.timeEstimate}
                onChange={(e) => setEditedIssue({ ...editedIssue, timeEstimate: e.target.value })}
                className="w-1/2 text-xs p-2 border rounded"
                placeholder="Time Estimate (hrs)"
              />
            </div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editedIssue.status}
              onChange={(e) => setEditedIssue({ ...editedIssue, status: e.target.value })}
              className="w-full text-xs p-2 border rounded"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sprint</label>
            <select
              value={editedIssue.sprint || 'backlog'}
              onChange={(e) => setEditedIssue({ ...editedIssue, sprint: e.target.value === 'backlog' ? null : e.target.value })}
              className="w-full text-xs p-2 border rounded"
            >
              <option value="backlog">Backlog</option>
              {allSprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1">
            <p><span className="font-medium">Type:</span> {editedIssue.type}</p>
            <p><span className="font-medium">Status:</span> {editedIssue.status}</p>
            <p><span className="font-medium">SP:</span> {editedIssue.storyPoints} | <span className="font-medium">Est:</span> {editedIssue.timeEstimate}h</p>
            {editedIssue.sprint && <p><span className="font-medium">Sprint:</span> {allSprints.find(s => s.id === editedIssue.sprint)?.name}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueCard;
