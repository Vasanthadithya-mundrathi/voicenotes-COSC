import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [tasks, setTasks] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const recognitionRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript("");
        showFeedback("🎤 Listening...", "info");
      };
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (transcript.trim()) {
          processVoiceCommand(transcript.trim());
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        showFeedback(`❌ Speech recognition error: ${event.error}`, "error");
      };
    } else {
      showFeedback("❌ Speech recognition not supported in this browser", "error");
    }
    
    // Load tasks on component mount
    fetchTasks();
  }, []);

  // Process transcript when it changes
  useEffect(() => {
    if (transcript.trim() && !isListening) {
      processVoiceCommand(transcript.trim());
    }
  }, [transcript, isListening]);

  const showFeedback = (message, type = "info") => {
    setFeedback({ message, type });
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback("");
    }, 3000);
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      showFeedback("❌ Error loading tasks", "error");
    }
  };

  const processVoiceCommand = async (spokenText) => {
    const lowerText = spokenText.toLowerCase();
    
    // Check if it's a completion command
    if (lowerText.includes("mark") && (lowerText.includes("complete") || lowerText.includes("done"))) {
      await handleVoiceCompletion(spokenText);
    } 
    // Check if it's an add task command
    else if (lowerText.includes("add task") || lowerText.includes("new task") || lowerText.includes("create task")) {
      const taskTitle = spokenText.replace(/add task|new task|create task/gi, '').trim();
      if (taskTitle) {
        await createTask(taskTitle);
      } else {
        showFeedback("❌ Please specify a task to add", "error");
      }
    }
    // Default: treat as new task
    else {
      await createTask(spokenText);
    }
  };

  const handleVoiceCompletion = async (spokenText) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/tasks/voice-complete`, {
        spoken_text: spokenText
      });
      
      if (response.data.success) {
        showFeedback(`✅ ${response.data.message}`, "success");
        await fetchTasks();
      } else {
        showFeedback(`❌ ${response.data.message}`, "error");
      }
    } catch (error) {
      console.error("Error completing task:", error);
      showFeedback("❌ Error completing task", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (title) => {
    if (!title.trim()) return;
    
    setIsLoading(true);
    try {
      await axios.post(`${API}/tasks`, { title: title.trim() });
      showFeedback(`✅ Added task: "${title}"`, "success");
      await fetchTasks();
      setNewTask("");
    } catch (error) {
      console.error("Error creating task:", error);
      showFeedback("❌ Error creating task", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = async (taskId) => {
    setIsLoading(true);
    try {
      await axios.post(`${API}/tasks/toggle/${taskId}`);
      await fetchTasks();
    } catch (error) {
      console.error("Error toggling task:", error);
      showFeedback("❌ Error updating task", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    setIsLoading(true);
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      await fetchTasks();
      showFeedback("✅ Task deleted", "success");
    } catch (error) {
      console.error("Error deleting task:", error);
      showFeedback("❌ Error deleting task", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearCompletedTasks = async () => {
    if (completedTasks.length === 0) {
      showFeedback("No completed tasks to clear", "info");
      return;
    }
    
    if (window.confirm(`Are you sure you want to clear ${completedTasks.length} completed tasks?`)) {
      setIsLoading(true);
      try {
        const response = await axios.delete(`${API}/tasks/clear-completed`);
        showFeedback(`✅ ${response.data.message}`, "success");
        await fetchTasks();
      } catch (error) {
        console.error("Error clearing completed tasks:", error);
        showFeedback("❌ Error clearing completed tasks", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      createTask(newTask.trim());
    }
  };

  const completedTasks = tasks.filter(task => task.completed);
  const incompleteTasks = tasks.filter(task => !task.completed);

  return (
    <div className="App">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1 className="title">
              🎤 Voice Notes to Tasks
            </h1>
            <p className="subtitle">
              Speak naturally to add tasks or mark them complete
            </p>
          </div>
        </header>

        {/* Voice Controls */}
        <div className="voice-section">
          <div className="voice-controls">
            <button 
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
            >
              {isListening ? (
                <>
                  <span className="pulse-dot"></span>
                  Stop Listening
                </>
              ) : (
                <>
                  🎤 Start Voice Command
                </>
              )}
            </button>
            
            {transcript && (
              <div className="transcript">
                <span className="transcript-label">You said:</span>
                <span className="transcript-text">"{transcript}"</span>
              </div>
            )}
          </div>

          {/* Voice Instructions */}
          <div className="voice-instructions">
            <h3>🗣️ Voice Commands:</h3>
            <ul>
              <li><strong>"Buy groceries"</strong> - Adds a new task</li>
              <li><strong>"Add task: Call mom"</strong> - Adds a new task</li>
              <li><strong>"Mark groceries as done"</strong> - Completes matching task</li>
              <li><strong>"Mark call mom complete"</strong> - Completes matching task</li>
            </ul>
          </div>
        </div>

        {/* Manual Input */}
        <div className="manual-section">
          <form onSubmit={handleManualSubmit} className="manual-form">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Or type a task here..."
              className="manual-input"
            />
            <button type="submit" className="manual-btn" disabled={isLoading}>
              ➕ Add Task
            </button>
          </form>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`feedback feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {/* Stats */}
        <div className="stats">
          <div className="stats-card stats-card-total">
            <div className="stats-number">{tasks.length}</div>
            <div className="stats-label">Total Tasks</div>
          </div>
          <div className="stats-card stats-card-pending">
            <div className="stats-number">{incompleteTasks.length}</div>
            <div className="stats-label">Pending</div>
          </div>
          <div className="stats-card stats-card-completed">
            <div className="stats-number">{completedTasks.length}</div>
            <div className="stats-label">Completed</div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="tasks-container">
          {/* Pending Tasks */}
          {incompleteTasks.length > 0 && (
            <div className="tasks-section">
              <h2 className="section-title">📝 Pending Tasks</h2>
              <div className="tasks-list">
                {incompleteTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-content">
                      <button 
                        className="task-checkbox"
                        onClick={() => toggleTask(task.id)}
                        disabled={isLoading}
                      >
                        <span className="checkbox-circle"></span>
                      </button>
                      <span className="task-title">{task.title}</span>
                    </div>
                    <button 
                      className="task-delete"
                      onClick={() => deleteTask(task.id)}
                      disabled={isLoading}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="tasks-section">
              <div className="section-header">
                <h2 className="section-title">✅ Completed Tasks</h2>
                <button 
                  className="clear-completed-btn"
                  onClick={clearCompletedTasks}
                  disabled={isLoading}
                >
                  🗑️ Clear Completed ({completedTasks.length})
                </button>
              </div>
              <div className="tasks-list">
                {completedTasks.map(task => (
                  <div key={task.id} className="task-card task-completed">
                    <div className="task-content">
                      <button 
                        className="task-checkbox task-checkbox-completed"
                        onClick={() => toggleTask(task.id)}
                        disabled={isLoading}
                      >
                        <span className="checkbox-circle checkbox-checked">✓</span>
                      </button>
                      <span className="task-title task-title-completed">{task.title}</span>
                    </div>
                    <button 
                      className="task-delete"
                      onClick={() => deleteTask(task.id)}
                      disabled={isLoading}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {tasks.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🎤</div>
              <h3>Ready for your first task!</h3>
              <p>Click the microphone button and say something like:</p>
              <p><em>"Buy groceries"</em> or <em>"Call mom tomorrow"</em></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;