import React, { useState, useEffect, createContext } from 'react';
import {
  getFirestore, doc, onSnapshot, updateDoc, setDoc, getDoc
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { ChevronRight, Sparkles, Plus, Rocket } from 'lucide-react';

import EpicCard from './components/EpicCard';
import SprintLane from './components/SprintLane';
import IssueCard from './components/IssueCard';
import { GoogleGenAI } from '@google/genai';

export const FirestoreContext = createContext(null);

// Import Firebase configuration
import { firebaseConfig, appId } from './config/firebase';
const initialAuthToken = null; // We'll use anonymous auth by default

// Initialize Firebase
console.log('Firebase config:', { ...firebaseConfig, apiKey: '***' }); // Log config without exposing API key

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    app = getApp(); // Get the existing app if it's already initialized
  } else {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

// Log authentication state
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', user ? `User: ${user.uid}` : 'No user');
});

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

  // State for the GenAI client and model
  const [genAI, setGenAI] = useState(null);
  const [model, setModel] = useState(null);

  // Firestore path - using an even number of segments
  const docPath = `projects/${appId}/planning/data`;

  // Handle authentication and data fetching
  useEffect(() => {
    let unsubscribe = () => {};

    const initializeFirestore = async () => {
      if (!db || !auth) {
        console.log('Firebase not yet initialized');
        return;
      }

      try {
        // First ensure we're authenticated
        if (!auth.currentUser) {
          console.log('Attempting anonymous sign in...');
          const userCred = await signInAnonymously(auth);
          console.log('Anonymous auth successful:', userCred.user.uid);
        }

        // Wait a moment for auth to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Current user:', auth.currentUser?.uid);
        console.log('Firestore path:', docPath);

        const docRef = doc(db, docPath);

        // Try to read the document first to test permissions
        try {
          const testRead = await getDoc(docRef);
          console.log('Permission test successful:', testRead.exists() ? 'Document exists' : 'Document does not exist');
        } catch (error) {
          console.error('Permission test failed:', error);
          throw error;
        }

        // Initialize document if needed
        const initialData = {
          requirements: [],
          epics: [],
          issues: [],
          sprints: [
            { id: 'sprint-1', name: 'Sprint 1' },
            { id: 'sprint-2', name: 'Sprint 2' }
          ],
        };

        try {
          await setDoc(docRef, initialData, { merge: true });
          console.log('Document initialized/updated successfully');
        } catch (error) {
          console.error('Error initializing document:', error);
          throw error;
        }

        // Set up real-time listener
        unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            console.log('Real-time update received:', snapshot.exists() ? 'Document exists' : 'Document does not exist');
            console.log('Snapshot data:', snapshot.data());
            if (snapshot.exists()) {
              setState(snapshot.data());
            }
          },
          (error) => {
            console.error("Real-time listener error:", error);
            setError("Failed to sync with the database. Please check your Firebase configuration and permissions.");
            setShowErrorModal(true);
          }
        );

      } catch (error) {
        console.error('Error in Firestore initialization:', error);
        setError("Failed to initialize the database. Error: " + error.message);
        setShowErrorModal(true);
      }
    };

    initializeFirestore();

    return () => unsubscribe();
  }, [db, auth]);

  // Initialize the GenAI client and model
  useEffect(() => {
    const initializeGenAI = async () => {
      try {
        const apiKey = 'AIzaSyBuWt_hqwvGieG0sL8oYMqBzadob8a7KvY';
        if (!apiKey) {
          throw new Error('Gemini API key is not configured');
        }
        
        // Create a new instance with proper API key configuration
        const genAIInstance = new GoogleGenAI({ apiKey });

        console.log('Gemini API instance:', genAIInstance);
        // Check what methods are available
        console.log('Available methods:', Object.getOwnPropertyNames(genAIInstance));
        console.log('Available methods (prototype):', Object.getOwnPropertyNames(Object.getPrototypeOf(genAIInstance)));
        
        setGenAI(genAIInstance);
        setModel(genAIInstance); // We'll use the instance directly for now
        console.log('Gemini API initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Gemini API:', error);
        setError('Failed to initialize AI service. Please check your API key configuration.');
        setShowErrorModal(true);
      }
    };

    initializeGenAI();
  }, []); // Empty dependency array means this runs once on component mount

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

    if (!genAI || !model) {
      setLoadingAI(false);
      setError('Gemini API is not properly configured. Please check the API key configuration.');
      setShowErrorModal(true);
      return null;
    }

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    const doRequest = async () => {
      try {
        // Combine system prompt and user query
        const prompt = `${systemPrompt}\n\nInput: ${userQuery}\n\nResponse (in JSON format):`;
        
        // Ensure the genAI is properly initialized
        if (!genAI) {
          throw new Error('Gemini API not initialized');
        }

        // Try to use the generateContent method directly on the genAI instance
        const result = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more consistent JSON formatting
            topK: 1,
            topP: 0.1,
          }
        });

        console.log('Full result:', result);
        console.log('Result structure:', Object.keys(result));
        console.log('Candidates:', result.candidates);
        
        let text;
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
          text = result.candidates[0].content.parts[0].text;
        } else {
          throw new Error('Unable to extract text from response');
        }
        
        console.log('Extracted text:', text);
        
        // Remove markdown code block markers if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.slice(7); // Remove ```json
        }
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.slice(3); // Remove ```
        }
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.slice(0, -3); // Remove trailing ```
        }
        cleanedText = cleanedText.trim();
        
        console.log('Cleaned text for parsing:', cleanedText);
        
        let parsedData;
        try {
          // Try to parse the cleaned response as JSON
          parsedData = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error("Failed to parse API response:", cleanedText);
          throw new Error("Invalid JSON response from AI");
        }
        
        setLoadingAI(false);
        return parsedData;

      } catch (e) {
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = initialDelay * Math.pow(2, retryCount - 1);
          console.log(`API error: ${e.message}. Retrying in ${delay}ms... (Attempt ${retryCount} of ${maxRetries})`);
          await new Promise(res => setTimeout(res, delay));
          return doRequest();
        } else {
          setLoadingAI(false);
          console.error("API call failed after multiple retries:", e);
          setError(e.message === 'SERVICE_UNAVAILABLE' 
            ? "The AI service is temporarily unavailable. Please try again in a few minutes." 
            : "Failed to connect to the AI. Please try again later.");
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

export default App;
