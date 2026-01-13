'use client';

import { useState } from 'react';

interface ResultDisplayProps {
  result: string;
  error?: string;
  isLoading?: boolean;
}

export default function ResultDisplay({ result, error, isLoading }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="result-container">
        <div className="loading">Processing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-container">
        <div className="error">
          <h3>Error</h3>
          <pre>{error}</pre>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Try to parse as JSON for pretty formatting
  let displayResult = result;
  let isJson = false;
  try {
    const parsed = JSON.parse(result);
    displayResult = JSON.stringify(parsed, null, 2);
    isJson = true;
  } catch {
    // Not JSON, use as-is
  }

  return (
    <div className="result-container">
      <div className="result-header">
        <h3>Result</h3>
        <button onClick={handleCopy} className="copy-button">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={`result-content ${isJson ? 'json' : ''}`}>
        {displayResult}
      </pre>
      <style jsx>{`
        .result-container {
          margin-top: 2rem;
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .result-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #333;
        }

        .copy-button {
          padding: 0.5rem 1rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .copy-button:hover {
          background: #0051cc;
        }

        .result-content {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .result-content.json {
          color: #d4d4d4;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .error {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          padding: 1rem;
        }

        .error h3 {
          color: #c33;
          margin-bottom: 0.5rem;
        }

        .error pre {
          color: #c33;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
}
