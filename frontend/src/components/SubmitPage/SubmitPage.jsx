import React, { useState, useEffect, Suspense } from 'react';
import { Editor } from '@monaco-editor/react';
import './SubmitPage.css';

const SubmitPage = () => {
  const [userCode, setUserCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('javascript');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [aiSuggestions, setAiSuggestions] = useState([
    { id: 1, text: 'Submit your code to get AI suggestions', modifiedText: '', rejectReason: '', status: null },
  ]);
  const [animate, setAnimate] = useState(false);
  const [showAcceptMessage, setShowAcceptMessage] = useState(false);
  const [activeRejectId, setActiveRejectId] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showAcceptMessage) {
      const timer = setTimeout(() => setShowAcceptMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showAcceptMessage]);

  const generateNewSessionId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleUserCodeChange = (value) => {
    setUserCode(value);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      const languageMap = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        c: 'c',
        cpp: 'cpp',
        java: 'java',
        html: 'html',
        css: 'css',
        php: 'php',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
        cs: 'csharp',
      };
      const language = languageMap[extension] || 'javascript';
      setEditorLanguage(language);
      setSelectedLanguage(language); // Sync dropdown with file language

      const reader = new FileReader();
      reader.onload = (e) => {
        setUserCode(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmitCode = async () => {
    // Generate new session ID on each submit
    const newSessionId = generateNewSessionId();
    setSessionId(newSessionId);
    
    // Set editor language to selected language
    setEditorLanguage(selectedLanguage);
    
    try {
      // Show loading state
      setAiSuggestions([{ 
        id: 1, 
        text: 'Analyzing your code...', 
        modifiedText: '', 
        rejectReason: '', 
        status: 'loading' 
      }]);
      
      const response = await fetch("http://localhost:8000/generate-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: userCode, 
          language: selectedLanguage, // Use selected language instead of editor language
          session_id: newSessionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
      } else {
        setAiSuggestions([{ 
          id: 1, 
          text: 'No specific suggestions found. Your code looks good!', 
          modifiedText: '', 
          rejectReason: '', 
          status: null 
        }]);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setAiSuggestions([{ 
        id: 1, 
        text: `Error: ${error.message}. Please try again.`, 
        modifiedText: '', 
        rejectReason: '', 
        status: 'error' 
      }]);
    }
  };

  const handleAcceptSuggestion = async (suggestionId) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      // Send acceptance to backend to get the modified code
      try {
        const response = await fetch("http://localhost:8000/accept-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            session_id: sessionId,
            suggestion_id: suggestionId,
            suggestion_text: suggestion.text,
            modified_text: suggestion.modifiedText || suggestion.text,
            language: selectedLanguage,
            original_code: userCode
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.modified_code) {
            setUserCode(data.modified_code);
          }
        }
      } catch (error) {
        console.error("Error accepting suggestion:", error);
      }

      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, status: 'Accepted' } : s
        )
      );
      setShowAcceptMessage(true);
    }
  };

  const handleRejectSuggestion = (suggestionId) => {
    setActiveRejectId(suggestionId);
  };

  const handleConfirmReject = async (suggestionId) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      // Send rejection to backend
      try {
        await fetch("http://localhost:8000/reject-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            session_id: sessionId,
            suggestion_id: suggestionId,
            suggestion_text: suggestion.text,
            reject_reason: suggestion.rejectReason,
            language: selectedLanguage
          }),
        });
      } catch (error) {
        console.error("Error rejecting suggestion:", error);
      }

      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, status: 'Rejected' } : s
        )
      );
      setActiveRejectId(null);
    }
  };

  const handleRejectReasonChange = (suggestionId, reason) => {
    setAiSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, rejectReason: reason } : s
      )
    );
  };

  const handleModifySuggestion = async (suggestionId, newText) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      // Send modification request to backend
      try {
        const response = await fetch("http://localhost:8000/modify-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            session_id: sessionId,
            suggestion_id: suggestionId,
            original_text: suggestion.text,
            modified_text: newText,
            language: selectedLanguage
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAiSuggestions((prev) =>
            prev.map((s) =>
              s.id === suggestionId ? { ...s, modifiedText: data.modified_suggestion } : s
            )
          );
        }
      } catch (error) {
        console.error("Error modifying suggestion:", error);
      }
    }
  };

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };

  const rejectionReasons = [
    'Not applicable',
    'Too complex',
    'Incorrect suggestion',
    'Other',
  ];

  const languageOptions = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
  ];

  return (
    <div className="submit-page">
      <div className="star-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="star"></div>
        ))}
      </div>
      <nav className="navbar">
        <div className="logo">CodeReview.</div>
        <ul className="nav-links">
          <li><a href="#home">HOME</a></li>
          <li><a href="#analytics">ANALYTICS</a></li>
        </ul>
      </nav>

      <section className="editor-section" id="home">
        <div className={`editor-container left-editor ${animate ? 'slide-in-left' : ''}`}>
          <h3>Paste or Upload Your Code</h3>
          <div className="editor-controls">
            <div className="language-selector">
              <label htmlFor="language-select">Language:</label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={handleLanguageChange}
                className="language-dropdown"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="file-upload-button">
              <input
                type="file"
                accept=".js,.jsx,.ts,.tsx,.py,.c,.cpp,.java,.html,.css,.php,.rb,.go,.rs,.cs"
                onChange={handleFileUpload}
                className="file-upload"
              />
              <span className="upload-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </span>
              Upload
            </label>
            <button className="submit-code-button" onClick={handleSubmitCode}>
              Submit Code
            </button>
          </div>
          <div className="editor-wrapper">
            <Suspense fallback={<div>Loading editor...</div>}>
              <Editor
                height="50vh"
                language={editorLanguage}
                value={userCode}
                onChange={handleUserCodeChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollbar: { vertical: 'auto' },
                  fontSize: 14,
                }}
              />
            </Suspense>
          </div>
        </div>
        <div className={`editor-container right-editor ${animate ? 'slide-in-right' : ''}`}>
          <h3>AI Suggestions</h3>
          <div className="suggestions-wrapper">
            {showAcceptMessage && (
              <div className="accept-message">Suggestion accepted!</div>
            )}
            {aiSuggestions.length === 0 ? (
              <p>No suggestions available.</p>
            ) : (
              aiSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-item">
                  <textarea
                    value={suggestion.modifiedText || suggestion.text}
                    onChange={(e) =>
                      suggestion.status ? null : handleModifySuggestion(suggestion.id, e.target.value)
                    }
                    className="suggestion-text"
                    disabled={!!suggestion.status}
                  />
                  {suggestion.status && (
                    <div className={`suggestion-status ${suggestion.status.toLowerCase()}`}>
                      {suggestion.status}
                      {suggestion.status === 'Rejected' && suggestion.rejectReason && (
                        <span className="reject-reason"> ({suggestion.rejectReason})</span>
                      )}
                    </div>
                  )}
                  <div className="suggestion-actions">
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion.id)}
                      className="action-button accept"
                      disabled={!!suggestion.status || suggestion.status === 'loading' || suggestion.status === 'error'}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(suggestion.id)}
                      className="action-button reject"
                      disabled={!!suggestion.status || suggestion.status === 'loading' || suggestion.status === 'error'}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        handleModifySuggestion(
                          suggestion.id,
                          suggestion.modifiedText || suggestion.text
                        )
                      }
                      className="action-button modify"
                      disabled={!!suggestion.status || suggestion.status === 'loading' || suggestion.status === 'error'}
                    >
                      Modify
                    </button>
                  </div>
                  {activeRejectId === suggestion.id && !suggestion.status && (
                    <div className="reject-reason-container">
                      <select
                        value={suggestion.rejectReason}
                        onChange={(e) =>
                          handleRejectReasonChange(suggestion.id, e.target.value)
                        }
                        className="reject-reason-select"
                      >
                        <option value="">Select a reason</option>
                        {rejectionReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleConfirmReject(suggestion.id)}
                        className="confirm-reject-button"
                        disabled={!suggestion.rejectReason}
                      >
                        Confirm Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubmitPage;