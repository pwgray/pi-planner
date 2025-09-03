import React from 'react';
import IssueCard from './IssueCard';

const SprintLane = ({ sprint, issues, onUpdateIssue, onDeleteIssue, allSprints }) => (
  <div className="mt-4 border-t pt-4 border-gray-200">
    <h3 className="text-xl font-bold text-gray-700 mb-2">{sprint.name}</h3>
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
  </div>
);

export default SprintLane;
