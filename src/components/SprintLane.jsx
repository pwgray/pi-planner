import React, { useState } from 'react';
import IssueCard from './IssueCard';
import { ChevronRight, ChevronDown } from 'lucide-react';

const SprintLane = ({ sprint, issues, onUpdateIssue, onDeleteIssue, allSprints }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mt-4 border-t pt-4 border-gray-200">
      <div className="flex items-center justify-between">
        <button onClick={toggleCollapse} className="collapse-button">
          {isCollapsed ? <ChevronRight /> : <ChevronDown />}
        </button>
        <h3 className="text-xl font-bold text-gray-700 mb-2">
          {sprint.name}
          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
            {issues.length} Issues
          </span>
        </h3>
      </div>
      {!isCollapsed && (
        <div className="space-y-3">
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onUpdate={onUpdateIssue}
              onDelete={onDeleteIssue}
              allSprints={allSprints}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SprintLane;
