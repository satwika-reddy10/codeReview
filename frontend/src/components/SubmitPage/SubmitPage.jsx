import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Link } from 'react-router-dom';
import * as monacoEditor from 'monaco-editor';
import './SubmitPage.css';

const SubmitPage = () => {
  const [userCode, setUserCode] = useState('');
  const [modifiedCode, setModifiedCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('javascript');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [aiSuggestions, setAiSuggestions] = useState([
    { id: 1, text: 'Submit your code or select repository files to get AI suggestions', modifiedText: '', rejectReason: '', status: null, loadingAction: null, category: 'Other', file_path: null },
  ]);
  const [animate, setAnimate] = useState(false);
  const [showAcceptMessage, setShowAcceptMessage] = useState(false);
  const [activeRejectId, setActiveRejectId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [userId, setUserId] = useState(null);
  const editorRef = useRef(null);
  const modifiedEditorRef = useRef(null);
  const suggestionsRef = useRef(null);

  const formatSuggestionText = (text) => {
    // Split by lines
    const lines = text.split('\n');

    return lines.map((line, index) => {
      // Bold pattern: **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        // Add bold text
        parts.push(<strong key={`${index}-${match.index}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <div key={index} className="suggestion-line">
          {parts.length > 0 ? parts : line}
        </div>
      );
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    // Get user_id from localStorage
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
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
      setSelectedLanguage(language);

      const reader = new FileReader();
      reader.onload = (e) => {
        setUserCode(e.target.result);
        setModifiedCode('');
      };
      reader.readAsText(file);
    }
  };

  const handleRepoUrlChange = (e) => {
    setRepoUrl(e.target.value);
  };

  const handleFetchRepoContents = async () => {
    try {
      const response = await fetch('http://localhost:8000/git/repo-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setRepoFiles(data.files);
    } catch (error) {
      console.error('Error fetching repository contents:', error);
      setRepoFiles([]);
      setAiSuggestions([{
        id: 1,
        text: `Error: ${error.message}. Please check the repository URL and try again.`,
        modifiedText: '',
        rejectReason: '',
        status: 'error',
        loadingAction: null,
        category: 'Other',
        file_path: null
      }]);
    }
  };

  const handleFileSelection = (filePath) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath)
        ? prev.filter((path) => path !== filePath)
        : [...prev, filePath]
    );
  };

  const handleFileSearch = (e) => {
    setFileSearchQuery(e.target.value);
  };

  const filteredRepoFiles = repoFiles.filter((file) =>
    file.path.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  const handleSubmitCode = async () => {
    if (suggestionsRef.current) {
      suggestionsRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    const newSessionId = generateNewSessionId();
    setSessionId(newSessionId);

    setEditorLanguage(selectedLanguage);

    try {
      setAiSuggestions([{
        id: 1,
        text: 'Analyzing your code...',
        modifiedText: '',
        rejectReason: '',
        status: 'loading',
        loadingAction: 'submit',
        category: 'Other',
        file_path: null
      }]);

      const userId = parseInt(localStorage.getItem('user_id'));

      const response = await fetch("http://localhost:8000/generate-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: userCode,
          language: selectedLanguage,
          session_id: newSessionId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        // Filter out introductory/summary text suggestions
        // Filter out introductory/summary text suggestions and improved code sections
        const filteredSuggestions = data.suggestions
          .filter(s =>
            !s.text.toLowerCase().includes('here are detailed suggestions') &&
            !s.text.toLowerCase().includes('here are the suggestions') &&
            s.text.trim().length > 0
          )
          .map(s => ({
            ...s,
            text: s.text
              .replace(/\*\*Improved Code:\*\*[\s\S]*?(?=\*\*|$)/gi, '') // Remove improved code section
              .replace(/\*\*Suggested Fix:\*\*[\s\S]*?(?=\*\*|$)/gi, '') // Remove suggested fix section
              .replace(/Improved Code:[\s\S]*?(?=###|\*\*|$)/gi, '') // Remove improved code without bold
              .replace(/Suggested Fix:[\s\S]*?(?=###|\*\*|$)/gi, '') // Remove suggested fix without bold
              .trim()
          }));
        setAiSuggestions(filteredSuggestions.length > 0 ? filteredSuggestions.map(s => ({ ...s, loadingAction: null })) : [{
          id: 1,
          text: 'No specific suggestions found. Your code looks good!',
          modifiedText: '',
          rejectReason: '',
          status: null,
          loadingAction: null,
          category: 'Other',
          file_path: null
        }]);
      } else {
        setAiSuggestions([{
          id: 1,
          text: 'No specific suggestions found. Your code looks good!',
          modifiedText: '',
          rejectReason: '',
          status: null,
          loadingAction: null,
          category: 'Other',
          file_path: null
        }]);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setAiSuggestions([{
        id: 1,
        text: `Error: ${error.message}. Please try again.`,
        modifiedText: '',
        rejectReason: '',
        status: 'error',
        loadingAction: null,
        category: 'Other',
        file_path: null
      }]);
    }
  };

  const handleSubmitRepoFiles = async () => {
    if (suggestionsRef.current) {
      suggestionsRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    const newSessionId = generateNewSessionId();
    setSessionId(newSessionId);

    try {
      setAiSuggestions([{
        id: 1,
        text: 'Analyzing repository files...',
        modifiedText: '',
        rejectReason: '',
        status: 'loading',
        loadingAction: 'submit',
        category: 'Other',
        file_path: null
      }]);

      const response = await fetch('http://localhost:8000/git/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          file_paths: selectedFiles,
          session_id: newSessionId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.reviews && data.reviews.length > 0) {
        const allSuggestions = data.reviews.flatMap((review) =>
          review.suggestions
            .filter(s =>
              !s.text.toLowerCase().includes('here are detailed suggestions') &&
              !s.text.toLowerCase().includes('here are the suggestions') &&
              s.text.trim().length > 0
            )
            .map((s) => ({
              ...s,
              text: s.text
                .replace(/\*\*Improved Code:\*\*[\s\S]*?(?=\*\*|$)/gi, '') // Remove improved code section
                .replace(/\*\*Suggested Fix:\*\*[\s\S]*?(?=\*\*|$)/gi, '') // Remove suggested fix section
                .replace(/Improved Code:[\s\S]*?(?=###|\*\*|$)/gi, '') // Remove improved code without bold
                .replace(/Suggested Fix:[\s\S]*?(?=###|\*\*|$)/gi, '') // Remove suggested fix without bold
                .trim(),
              file_path: review.file_path,
              language: review.language,
              loadingAction: null,
            }))
        );
        setAiSuggestions(allSuggestions.length > 0 ? allSuggestions : [{
          id: 1,
          text: 'No specific suggestions found for selected files.',
          modifiedText: '',
          rejectReason: '',
          status: null,
          loadingAction: null,
          category: 'Other',
          file_path: null,
        }]);
        if (data.reviews.length > 0) {
          setUserCode(data.reviews[0].original_code || '');
          setEditorLanguage(data.reviews[0].language);
          setSelectedLanguage(data.reviews[0].language);
        }
      } else {
        setAiSuggestions([{
          id: 1,
          text: 'No specific suggestions found for selected files.',
          modifiedText: '',
          rejectReason: '',
          status: null,
          loadingAction: null,
          category: 'Other',
          file_path: null,
        }]);
      }
    } catch (error) {
      console.error('Error reviewing repository files:', error);
      setAiSuggestions([{
        id: 1,
        text: `Error: ${error.message}. Please try again.`,
        modifiedText: '',
        rejectReason: '',
        status: 'error',
        loadingAction: null,
        category: 'Other',
        file_path: null,
      }]);
    }
  };

  const handleAcceptSuggestion = async (suggestionId, filePath) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId && s.file_path === filePath);
    if (suggestion) {
      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId && s.file_path === filePath ? { ...s, loadingAction: 'accept' } : s
        )
      );

      try {
        const response = await fetch("http://localhost:8000/accept-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            suggestion_id: suggestionId,
            suggestion_text: suggestion.text,
            modified_text: suggestion.modifiedText || suggestion.text,
            language: suggestion.language || selectedLanguage,
            original_code: userCode,
            file_path: filePath,
            user_id: userId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.modified_code) {
            setModifiedCode(data.modified_code);
          }
        }
      } catch (error) {
        console.error("Error accepting suggestion:", error);
      }

      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId && s.file_path === filePath ? { ...s, status: 'Accepted', loadingAction: null } : s
        )
      );
      setShowAcceptMessage(true);
    }
  };

  const handleRejectSuggestion = (suggestionId, filePath) => {
    setActiveRejectId(`${suggestionId}-${filePath || 'null'}`);
    setAiSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId && s.file_path === filePath ? { ...s, loadingAction: 'reject' } : s
      )
    );
  };

  const handleConfirmReject = async (suggestionId, filePath) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId && s.file_path === filePath);
    if (suggestion) {
      try {
        await fetch("http://localhost:8000/reject-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            suggestion_id: suggestionId,
            suggestion_text: suggestion.text,
            reject_reason: suggestion.rejectReason,
            language: suggestion.language || selectedLanguage,
            file_path: filePath,
            user_id: userId
          }),
        });
      } catch (error) {
        console.error("Error rejecting suggestion:", error);
      }

      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId && s.file_path === filePath ? { ...s, status: 'Rejected', loadingAction: null } : s
        )
      );
      setActiveRejectId(null);
    }
  };

  const handleRejectReasonChange = (suggestionId, filePath, reason) => {
    setAiSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId && s.file_path === filePath ? { ...s, rejectReason: reason } : s
      )
    );
  };

  const handleModifySuggestion = async (suggestionId, filePath, modifiedText) => {
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId && s.file_path === filePath);
    if (suggestion) {
      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId && s.file_path === filePath ? { ...s, modifiedText, loadingAction: 'modify' } : s
        )
      );

      try {
        const response = await fetch("http://localhost:8000/modify-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            suggestion_id: suggestionId,
            original_text: suggestion.text,
            modified_text: modifiedText,
            language: suggestion.language || selectedLanguage,
            file_path: filePath,
            user_id: userId
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAiSuggestions((prev) =>
            prev.map((s) =>
              s.id === suggestionId && s.file_path === filePath
                ? { ...s, text: data.modified_suggestion, modifiedText: '', status: null, loadingAction: null }
                : s
            )
          );
        }
      } catch (error) {
        console.error("Error modifying suggestion:", error);
      }
    }
  };

  const rejectionReasons = [
    'Not relevant',
    'Too complex',
    'Conflicts with style guide',
    'Not a priority',
    'Incorrect suggestion',
    'Performance concerns',
    'Security concerns',
    'Breaks existing functionality',
    'Already implemented',
    'Too risky',
    'Incompatible with dependencies',
    'Requires significant refactoring',
    'Not feasible',
    'Other'
  ];

  const groupedSuggestions = aiSuggestions.reduce((acc, suggestion) => {
    const key = suggestion.file_path || 'Manual Input';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(suggestion);
    return acc;
  }, {});

  return (
    <div className="submit-page">
      <div className="star-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="star" />
        ))}
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
      </div>
      <nav className="navbar">
        <div className="logo">CodeReview</div>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/analytics">Analytics</Link></li>
        </ul>
      </nav>
      <section className="editor-section">
        <div className="git-integration">
          <h3>Import from GitHub Repository</h3>
          <div className="repo-input-container">
            <input
              type="text"
              value={repoUrl}
              onChange={handleRepoUrlChange}
              placeholder="Enter GitHub repository URL (e.g., https://github.com/user/repo)"
              className="repo-url-input"
            />
            <button onClick={handleFetchRepoContents} className="fetch-repo-button">
              Fetch Files
            </button>
          </div>
          {repoFiles.length > 0 && (
            <div className="file-selection-container">
              <input
                type="text"
                value={fileSearchQuery}
                onChange={handleFileSearch}
                placeholder="Search files..."
                className="file-search-input"
              />
              <div className="file-list">
                {filteredRepoFiles.map((file) => (
                  <div key={file.path} className="file-item">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.path)}
                      onChange={() => handleFileSelection(file.path)}
                    />
                    <span>{file.path}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmitRepoFiles}
                className="submit-repo-files-button"
                disabled={selectedFiles.length === 0}
              >
                Review Selected Files
              </button>
            </div>
          )}
        </div>
        <div className="editor-row">
          <div className={`editor-container left-editor ${animate ? 'slide-in-left' : ''}`}>
            <h3>Input Code</h3>
            <div className="editor-controls">
              <div className="language-selector">
                <label htmlFor="language">Language:</label>
                <select
                  id="language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="language-dropdown"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="csharp">C#</option>
                  <option value="php">PHP</option>
                </select>
              </div>
              <input
                type="file"
                id="file-upload"
                className="file-upload"
                onChange={handleFileUpload}
                accept=".js,.jsx,.ts,.tsx,.py,.c,.cpp,.java,.html,.css,.php,.rb,.go,.rs,.cs"
              />
              <label htmlFor="file-upload" className="file-upload-button">
                <span className="file-upload-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  height="380px"
                  language={editorLanguage}
                  value={userCode}
                  onChange={handleUserCodeChange}
                  theme="vs-dark"
                  onMount={(editor) => {
                    editorRef.current = editor;
                  }}
                  options={{
                    minimap: { enabled: false },
                    scrollbar: { vertical: 'auto' },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </Suspense>
            </div>
          </div>
          <div className={`editor-container right-editor ${animate ? 'slide-in-right' : ''}`}>
            <h3>Modified Code</h3>
            <div className="editor-controls">
              <div className="editor-controls-placeholder"></div>
            </div>
            <div className="modified-editor-wrapper">
              <Suspense fallback={<div>Loading editor...</div>}>
                <Editor
                  height="380px"
                  language={editorLanguage}
                  value={modifiedCode}
                  onChange={(value) => setModifiedCode(value)}
                  theme="vs-dark"
                  onMount={(editor) => {
                    modifiedEditorRef.current = editor;
                  }}
                  options={{
                    minimap: { enabled: false },
                    scrollbar: { vertical: 'auto' },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>
        <div ref={suggestionsRef} className={`editor-container suggestions-editor ${animate ? 'slide-in-right' : ''}`}>
          <h3>AI Suggestions</h3>
          <div className="suggestions-wrapper">
            {showAcceptMessage && (
              <div className="accept-message">Suggestion accepted!</div>
            )}
            {aiSuggestions.length === 1 && aiSuggestions[0].status === 'loading' ? (
              <div className="suggestions-loading-container">
                <div className="suggestions-big-loader"></div>
                <div className="suggestions-loading-text">
                  {aiSuggestions[0].text}
                </div>
              </div>
            ) : (
              Object.entries(groupedSuggestions).map(([filePath, suggestions]) => (
                <div key={filePath} className="file-suggestions">
                  {filePath !== 'null' && filePath !== 'Manual Input' && <h4>{filePath}</h4>}
                  {suggestions.length === 0 ? (
                    <p>No suggestions available.</p>
                  ) : (
                    suggestions.map((suggestion) => (
                      <div key={`${suggestion.id}-${suggestion.file_path || 'null'}`} className="suggestion-item">
                        <div className="suggestion-text-container">
                          <div className="suggestion-text formatted">
                            {formatSuggestionText(suggestion.text)}
                          </div>
                          {suggestion.loadingAction === 'submit' && (
                            <span className="loader"></span>
                          )}
                        </div>
                        {suggestion.status && (
                          <div className={`suggestion-status ${suggestion.status.toLowerCase()}`}>
                            {suggestion.status}
                            {suggestion.status === 'Rejected' && suggestion.rejectReason && (
                              <span className="reject-reason"> ({suggestion.rejectReason})</span>
                            )}
                          </div>
                        )}
                        {suggestion.category && (
                          <span className={`suggestion-category ${suggestion.category.toLowerCase().replace(/\s+/g, '-')}`}>
                            {suggestion.category}
                          </span>
                        )}
                        <div className="suggestion-actions">
                          <button
                            onClick={() => handleAcceptSuggestion(suggestion.id, suggestion.file_path)}
                            className="action-button accept"
                            disabled={!!suggestion.status || suggestion.loadingAction || suggestion.status === 'loading' || suggestion.status === 'error'}
                          >
                            {suggestion.loadingAction === 'accept' ? (
                              <>
                                Accepting...
                                <span className="loader"></span>
                              </>
                            ) : (
                              'Accept'
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectSuggestion(suggestion.id, suggestion.file_path)}
                            className="action-button reject"
                            disabled={!!suggestion.status || suggestion.loadingAction || suggestion.status === 'loading' || suggestion.status === 'error'}
                          >
                            {suggestion.loadingAction === 'reject' ? (
                              <>
                                Rejecting...
                                <span className="loader"></span>
                              </>
                            ) : (
                              'Reject'
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleModifySuggestion(
                                suggestion.id,
                                suggestion.file_path,
                                suggestion.modifiedText || suggestion.text
                              )
                            }
                            className="action-button modify"
                            disabled={!!suggestion.status || suggestion.loadingAction || suggestion.status === 'loading' || suggestion.status === 'error'}
                          >
                            {suggestion.loadingAction === 'modify' ? (
                              <>
                                Modifying...
                                <span className="loader"></span>
                              </>
                            ) : (
                              'Modify'
                            )}
                          </button>
                        </div>
                        {activeRejectId === `${suggestion.id}-${suggestion.file_path || 'null'}` && !suggestion.status && (
                          <div className="reject-reason-container">
                            <select
                              value={suggestion.rejectReason}
                              onChange={(e) =>
                                handleRejectReasonChange(suggestion.id, suggestion.file_path, e.target.value)
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
                              onClick={() => handleConfirmReject(suggestion.id, suggestion.file_path)}
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
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubmitPage;