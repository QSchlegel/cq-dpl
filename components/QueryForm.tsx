'use client';

import { useState } from 'react';
import ResultDisplay from './ResultDisplay';

export default function QueryForm() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<'json' | 'raw' | 'pretty'>('json');
  const [ada, setAda] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputType, setInputType] = useState<'hex' | 'file'>('hex');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const hex = Array.from(new Uint8Array(arrayBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        setInput(hex);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult('');

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          query: query || undefined,
          format,
          ada,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="query-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="input-type">Input Type</label>
          <select
            id="input-type"
            value={inputType}
            onChange={(e) => setInputType(e.target.value as 'hex' | 'file')}
          >
            <option value="hex">Hex String</option>
            <option value="file">File Upload</option>
          </select>
        </div>

        {inputType === 'file' ? (
          <div className="form-group">
            <label htmlFor="file-input">CBOR File</label>
            <input
              id="file-input"
              type="file"
              accept=".cbor,.bin,.hex"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="input">Transaction CBOR (Hex)</label>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter hex string (with or without 0x prefix)"
              rows={4}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="query">Query Path (optional)</label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., fee, outputs.0.address, outputs.*.value"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="format">Output Format</label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'json' | 'raw' | 'pretty')}
            >
              <option value="json">JSON</option>
              <option value="raw">Raw</option>
              <option value="pretty">Pretty</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={ada}
                onChange={(e) => setAda(e.target.checked)}
              />
              Show ADA amounts
            </label>
          </div>
        </div>

        <button type="submit" disabled={isLoading || !input}>
          {isLoading ? 'Querying...' : 'Query Transaction'}
        </button>
      </form>

      <ResultDisplay result={result} error={error} isLoading={isLoading} />

      <style jsx>{`
        .query-form {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        input[type='text'],
        input[type='file'],
        textarea,
        select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        textarea {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          resize: vertical;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-group input[type='checkbox'] {
          width: auto;
          cursor: pointer;
        }

        button {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        button:hover:not(:disabled) {
          background: #0051cc;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
