import React, { useState, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import {
  getFirestore, doc, onSnapshot, updateDoc, setDoc, getDoc, collection
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import {
  ChevronRight, Sparkles, Plus, Trash2, Edit, Save, Rocket, CheckCircle, Clock
} from 'lucide-react';

const FirestoreContext = createContext(null);

// Global variables for Firebase configuration and auth token
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
const app = Object.keys(firebaseConfig).length ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

// Utility to handle Firebase authentication
const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const signIn = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Firebase auth error:", e);
      } finally {
        setLoading(false);
      }
    };
    if (auth && !user) {
      signIn();
    }
  }, [auth]);

  useEffect(() => {
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged(currentUser => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [auth]);

  return { user, loading };
};

// Main App component
const App = () => {
  const { user, loading: authLoading } = useFirebaseAuth();
  const userId = user?.uid || crypto.randomUUID();

  // State for the entire planning board
  const [state, setState] = useState({
    requirements: [],
    epics: [],
    issues: [],
    sprints: [{ id: 'sprint-1', name: 'Sprint 1' }, { id: 'sprint-2', name: 'Sprint 2' }],
  });
  const [newRequirement, setNewRequirement] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Firestore path
  const docPath = `/artifacts/${appId}/public/data/planning_data`;

  // Fetch data from Firestore on mount
  useEffect(() => {
    if (!db || authLoading || !user) return;

    const docRef = doc(db, docPath);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setState(data);
      } else {
        // Initialize the document if it doesn't exist
        await setDoc(docRef, state);
      }
    }, (error) => {
      console.error("Error listening to Firestore:", error);
      setError("Failed to sync with the database. Please check your connection.");
      setShowErrorModal(true);
    });

    return () => unsubscribe();
  }, [db, docPath, authLoading, user]);

  // Update Firestore whenever state changes
  useEffect(() => {
    if (db && !authLoading && user) {
      const docRef = doc(db, docPath);
      updateDoc(docRef, state).catch(e => {
        console.error("Error writing to Firestore:", e);
        setError("Failed to save changes to the database. Please check your connection.");
        setShowErrorModal(true);
      });
    }
  }, [state, db, docPath, authLoading, user]);

  // AI API Call Function
  const callGeminiApi = async (systemPrompt, userQuery) => {
    setLoadingAI(true);
    setError('');
    setShowErrorModal(false);
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=';
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      tools: [{ "google_search": {} }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
    };

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    const doRequest = async () => {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0) {
          const text = result.candidates[0].content.parts[0].text;
          const parsedData = JSON.parse(text);
          setLoadingAI(false);
          return parsedData;
        } else {
          throw new Error('No candidates found in the response.');
        }
      } catch (e) {
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = initialDelay * Math.pow(2, retryCount - 1);
          console.log(`Retrying API call in ${delay}ms... (Attempt ${retryCount})`);
          await new Promise(res => setTimeout(res, delay));
          return doRequest();
        } else {
          setLoadingAI(false);
          console.error("API call failed after multiple retries:", e);
          setError("Failed to connect to the AI. Please try again later.");
          setShowErrorModal(true);
          return null;
        }
      }
    };

    return doRequest();
  };

  // Handlers for state updates
  const handleAddRequirement = () => {
    if (newRequirement.trim() === '') return;
    const reqId = crypto.randomUUID();
    setState(prevState => ({
      ...prevState,
      requirements: [...prevState.requirements, { id: reqId, text: newRequirement }],
    }));
    setNewRequirement('');
  };

  const handleTranslateToEpic = async (requirementText) => {
    const systemPrompt = "As a PI planner, translate the following raw requirement into a concise, well-defined Epic title and description. Provide only the JSON output with 'title' and 'description' keys.";
    const userQuery = `Requirement: ${requirementText}`;
    const epicData = await callGeminiApi(systemPrompt, userQuery);

    if (epicData) {
      const newEpic = {
        id: crypto.randomUUID(),
        title: epicData.title,
        description: epicData.description,
        status: 'notStarted',
        issues: [],
      };
      setState(prevState => ({
        ...prevState,
        epics: [...prevState.epics, newEpic],
        requirements: prevState.requirements.filter(req => req.text !== requirementText),
      }));
    }
  };

  const handleRefineEpic = async (epicId) => {
    const epic = state.epics.find(e => e.id === epicId);
    if (!epic) return;

    const systemPrompt = "As a PI planner, review and expand on the following epic. Add more detail, break down complex ideas, and suggest potential sub-themes. Provide only the refined description as a JSON object with a single 'refinedDescription' key.";
    const userQuery = `Epic Title: ${epic.title}\nEpic Description: ${epic.description}`;
    const refinementData = await callGeminiApi(systemPrompt, userQuery);

    if (refinementData) {
      setState(prevState => ({
        ...prevState,
        epics: prevState.epics.map(e => e.id === epicId ? { ...e, description: refinementData.refinedDescription } : e)
      }));
    }
  };

  const handleGenerateIssues = async (epicId) => {
    const epic = state.epics.find(e => e.id === epicId);
    if (!epic) return;

    const systemPrompt = "Based on the provided Epic, generate a list of Jira issues including Stories, Tasks, and Spikes. For each issue, provide a 'summary', a 'description', and 'acceptanceCriteria' in Gherkin format (Given, When, Then). Also, provide a reasonable 'storyPoints' estimate (1-13) and a 'timeEstimate' in hours. Provide the output as a JSON array of objects, with keys 'type', 'summary', 'description', 'acceptanceCriteria', 'storyPoints', 'timeEstimate'. The 'type' must be 'Story', 'Task', or 'Spike'.";
    const userQuery = `Epic Title: ${epic.title}\nEpic Description: ${epic.description}`;
    const issuesData = await callGeminiApi(systemPrompt, userQuery);

    if (issuesData) {
      const newIssues = issuesData.map(issue => ({
        ...issue,
        id: crypto.randomUUID(),
        epicId: epicId,
        sprint: null,
        status: 'To Do',
      }));

      setState(prevState => ({
        ...prevState,
        epics: prevState.epics.map(e => e.id === epicId ? { ...e, issues: [...e.issues, ...newIssues.map(i => i.id)] } : e),
        issues: [...prevState.issues, ...newIssues],
      }));
    }
  };

  const handleAddIssue = (epicId) => {
    const newIssue = {
      id: crypto.randomUUID(),
      epicId: epicId,
      type: 'Story',
      summary: 'New Issue',
      description: '',
      acceptanceCriteria: '',
      storyPoints: 0,
      timeEstimate: 0,
      sprint: null,
      status: 'To Do',
    };
    setState(prevState => ({
      ...prevState,
      epics: prevState.epics.map(e => e.id === epicId ? { ...e, issues: [...e.issues, newIssue.id] } : e),
      issues: [...prevState.issues, newIssue],
    }));
  };

  const handleUpdateIssue = (issueId, key, value) => {
    setState(prevState => ({
      ...prevState,
      issues: prevState.issues.map(issue =>
        issue.id === issueId ? { ...issue, [key]: value } : issue
      )
    }));
  };

  const handleDeleteIssue = (issueId) => {
    const epicId = state.issues.find(issue => issue.id === issueId)?.epicId;
    setState(prevState => ({
      ...prevState,
      issues: prevState.issues.filter(issue => issue.id !== issueId),
      epics: prevState.epics.map(e =>
        e.id === epicId ? { ...e, issues: e.issues.filter(id => id !== issueId) } : e
      ),
    }));
  };

  // Update Epic status based on its issues
  useEffect(() => {
    setState(prevState => {
      const updatedEpics = prevState.epics.map(epic => {
        const epicIssues = prevState.issues.filter(issue => issue.epicId === epic.id);
        if (epicIssues.length === 0) {
          return { ...epic, status: 'notStarted' };
        }
        const allDone = epicIssues.every(issue => issue.status === 'Done');
        const anyAssigned = epicIssues.some(issue => issue.sprint !== null);
        if (allDone) {
          return { ...epic, status: 'complete' };
        } else if (anyAssigned) {
          return { ...epic, status: 'inProgress' };
        } else {
          return { ...epic, status: 'notStarted' };
        }
      });
      return { ...prevState, epics: updatedEpics };
    });
  }, [state.issues]);

  const sortedEpics = state.epics.slice().sort((a, b) => {
    if (a.status === 'inProgress' && b.status !== 'inProgress') return -1;
    if (a.status !== 'inProgress' && b.status === 'inProgress') return 1;
    if (a.status === 'notStarted' && b.status !== 'notStarted') return -1;
    if (a.status !== 'notStarted' && b.status === 'notStarted') return 1;
    return 0;
  });

  const getIssuesForSprint = (sprintId) => {
    return state.issues.filter(issue => issue.sprint === sprintId);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">Connecting to Firebase...</h2>
        </div>
      </div>
    );
  }

  return (
    <FirestoreContext.Provider value={{ db, userId }}>
      <div className="min-h-screen bg-slate-100 font-sans text-gray-800 p-8 flex flex-col items-center">
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-red-500 text-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h3 className="font-bold text-lg mb-2">Error</h3>
              <p>{error}</p>
              <button
                className="mt-4 bg-white text-red-500 font-bold py-2 px-4 rounded-full hover:bg-red-100 transition-colors"
                onClick={() => setShowErrorModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
        <header className="w-full max-w-6xl text-center py-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-800">
            AI-Powered PI Planning
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Transform ideas into action with intelligent issue generation.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            User ID: <span className="font-mono text-xs">{userId}</span>
          </p>
        </header>

        <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Column 1: Requirements */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col min-h-[400px]">
            <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center">
              Requirements <ChevronRight className="w-5 h-5 ml-2 text-gray-400" />
            </h2>
            <div className="flex-grow space-y-4">
              {state.requirements.map(req => (
                <div key={req.id} className="p-4 bg-gray-100 rounded-lg flex items-center justify-between shadow-sm">
                  <span className="text-sm font-medium text-gray-700">{req.text}</span>
                  <button
                    onClick={() => handleTranslateToEpic(req.text)}
                    className="flex-shrink-0 ml-4 p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
                    title="Translate to Epic"
                    disabled={loadingAI}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  placeholder="Enter new requirement..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRequirement()}
                />
                <button
                  onClick={handleAddRequirement}
                  className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md"
                  title="Add Requirement"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Epics */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col min-h-[400px]">
            <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center">
              Epics <ChevronRight className="w-5 h-5 ml-2 text-gray-400" />
            </h2>
            {loadingAI && (
              <div className="flex items-center justify-center p-4 text-blue-500 animate-pulse">
                <Sparkles className="w-6 h-6 mr-2" />
                <span className="font-semibold">AI is working its magic...</span>
              </div>
            )}
            <div className="flex-grow space-y-4">
              {sortedEpics.map(epic => (
                <EpicCard
                  key={epic.id}
                  epic={epic}
                  onRefine={handleRefineEpic}
                  onGenerateIssues={handleGenerateIssues}
                  onAddIssue={handleAddIssue}
                  loadingAI={loadingAI}
                  issues={state.issues.filter(issue => issue.epicId === epic.id)}
                />
              ))}
            </div>
          </div>

          {/* Column 3: Sprints */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col min-h-[400px]">
            <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center">
              Sprints <Rocket className="w-6 h-6 ml-2 text-gray-400" />
            </h2>
            {state.sprints.map(sprint => (
              <SprintLane
                key={sprint.id}
                sprint={sprint}
                issues={getIssuesForSprint(sprint.id)}
                onUpdateIssue={handleUpdateIssue}
                onDeleteIssue={handleDeleteIssue}
                allSprints={state.sprints}
              />
            ))}
            <div className="mt-4 p-4 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-700 mb-2">Backlog</h3>
              <div className="space-y-3">
                {getIssuesForSprint(null).map(issue => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onUpdate={handleUpdateIssue}
                    onDelete={handleDeleteIssue}
                    allSprints={state.sprints}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </FirestoreContext.Provider>
  );
};

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
            <textarea
              value={editedIssue.summary}
              onChange={(e) => setEditedIssue({ ...editedIssue, summary: e.target.value })}
              className="w-full text-xs p-2 border rounded resize-none"
              placeholder="Summary"
            />
            <textarea
              value={editedIssue.description}
              onChange={(e) => setEditedIssue({ ...editedIssue, description: e.target.value })}
              className="w-full text-xs p-2 border rounded resize-none"
              placeholder="Description"
            />
            <textarea
              value={editedIssue.acceptanceCriteria}
              onChange={(e) => setEditedIssue({ ...editedIssue, acceptanceCriteria: e.target.value })}
              className="w-full text-xs p-2 border rounded resize-none"
              placeholder="Acceptance Criteria (Gherkin)"
            />
            <div className="flex space-x-2">
              <input
                type="number"
                value={editedIssue.storyPoints}
                onChange={(e) => setEditedIssue({ ...editedIssue, storyPoints: e.target.value })}
                className="w-1/2 text-xs p-2 border rounded"
                placeholder="Story Points"
              />
              <input
                type="number"
                value={editedIssue.timeEstimate}
                onChange={(e) => setEditedIssue({ ...editedIssue, timeEstimate: e.target.value })}
                className="w-1/2 text-xs p-2 border rounded"
                placeholder="Time Estimate (hrs)"
              />
            </div>
            <select
              value={editedIssue.status}
              onChange={(e) => setEditedIssue({ ...editedIssue, status: e.target.value })}
              className="w-full text-xs p-2 border rounded"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
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

window.onload = function() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }

  // Use a more robust check before rendering
  if (rootElement) {
    try {
      const root = createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (e) {
      console.error("Error during initial React render:", e);
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,0,0,0.8); color:white; font-family:sans-serif; padding:20px; z-index:9999;';
      errorDiv.innerHTML = `
        <h3>A critical error occurred.</h3>
        <p>The application failed to start. Please check the console for details.</p>
        <pre style="white-space: pre-wrap; word-break: break-all;">${e.stack || e.message}</pre>
      `;
      document.body.appendChild(errorDiv);
    }
  }
}
