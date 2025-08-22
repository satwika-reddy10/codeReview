import React, { useState, useEffect, Suspense } from 'react';
import { Editor } from '@monaco-editor/react';
import './SubmitPage.css';

const SubmitPage = () => {
  const [userCode, setUserCode] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState('// AI suggestions will appear here');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation after a delay to ensure DOM stability
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleUserCodeChange = (value) => {
    setUserCode(value);
    // TODO: Integrate with AI to generate suggestions and setAiSuggestions
  };

  return (
    <div className="submit-page">
      <div className="star-container">
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
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
          <h3>Paste Your Code Here</h3>
          <div className="editor-wrapper">
            <Suspense fallback={<div>Loading editor...</div>}>
              <Editor
                height="60vh"
                defaultLanguage="javascript"
                defaultValue={userCode}
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
          <div className="editor-wrapper">
            <Suspense fallback={<div>Loading editor...</div>}>
              <Editor
                height="60vh"
                defaultLanguage="javascript"
                value={aiSuggestions}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollbar: { vertical: 'auto' },
                  fontSize: 14,
                }}
              />
            </Suspense>
          </div>
        </div>
      </section>

    </div>
  );
};

export default SubmitPage;