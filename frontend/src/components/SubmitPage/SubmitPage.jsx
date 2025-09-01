import React, { useState, useEffect, Suspense } from 'react';
import { Editor } from '@monaco-editor/react';
import './SubmitPage.css';

const SubmitPage = () => {
  const [userCode, setUserCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [aiSuggestions, setAiSuggestions] = useState([
    { id: 1, text: '// Consider adding error handling', modifiedText: '', rejectReason: '', status: null },
    { id: 2, text: '// Optimize this loop for better performance', modifiedText: '', rejectReason: '', status: null },
  ]);
  const [animate, setAnimate] = useState(false);
  const [showAcceptMessage, setShowAcceptMessage] = useState(false);
  const [activeRejectId, setActiveRejectId] = useState(null);

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

  const handleUserCodeChange = (value) => {
    setUserCode(value);
    // TODO: Integrate with AI to generate suggestions and setAiSuggestions
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      const languageMap = {
        js: 'javascript',
        py: 'python',
        c: 'c',
        java: 'java',
      };
      const language = languageMap[extension] || 'javascript';
      setSelectedLanguage(language);

      const reader = new FileReader();
      reader.onload = (e) => {
        setUserCode(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };

  const handleSubmitCode = () => {
    // TODO: Integrate with AI to generate suggestions based on userCode and selectedLanguage
    console.log('Submitting code for AI suggestions:', userCode, selectedLanguage);
    setAiSuggestions((prev) => [
      ...prev,
      { id: prev.length + 1, text: '// New AI suggestion', modifiedText: '', rejectReason: '', status: null },
    ]);
  };

  const handleAcceptSuggestion = (suggestionId) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      setUserCode((prev) => prev + '\n' + (suggestion.modifiedText || suggestion.text));
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

  const handleConfirmReject = (suggestionId) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      console.log(`Rejected suggestion ${suggestionId} with reason: ${suggestion.rejectReason}`);
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

  const handleModifySuggestion = (suggestionId, newText) => {
    setAiSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, modifiedText: newText } : s
      )
    );
  };

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
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="language-select"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="c">C</option>
              <option value="java">Java</option>
            </select>
            <label className="file-upload-button">
              <input
                type="file"
                accept=".js,.py,.c,.java"
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
                language={selectedLanguage}
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
                    </div>
                  )}
                  <div className="suggestion-actions">
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion.id)}
                      className="action-button accept"
                      disabled={!!suggestion.status}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(suggestion.id)}
                      className="action-button reject"
                      disabled={!!suggestion.status}
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
                      disabled={!!suggestion.status}
                    >
                      Modify
                    </button>
                  </div>
                  {activeRejectId === suggestion.id && !suggestion.status && (
                    <div className="reject-reason-container">
                      <textarea
                        value={suggestion.rejectReason}
                        onChange={(e) =>
                          handleRejectReasonChange(suggestion.id, e.target.value)
                        }
                        className="reject-reason-text"
                        placeholder="Enter reason for rejection"
                      />
                      <button
                        onClick={() => handleConfirmReject(suggestion.id)}
                        className="confirm-reject-button"
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