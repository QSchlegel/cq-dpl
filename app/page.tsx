'use client';

import { useState } from 'react';
import QueryForm from '@/components/QueryForm';
import AddressDecoder from '@/components/AddressDecoder';
import ValidateForm from '@/components/ValidateForm';

type Tab = 'query' | 'address' | 'validate';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('query');

  return (
    <main className="container">
      <header className="header">
        <h1>cq - CBOR Query Tool for Cardano</h1>
        <p>Inspect and query Cardano transactions encoded in CBOR format</p>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'query' ? 'active' : ''}
          onClick={() => setActiveTab('query')}
        >
          Query Transaction
        </button>
        <button
          className={activeTab === 'address' ? 'active' : ''}
          onClick={() => setActiveTab('address')}
        >
          Decode Address
        </button>
        <button
          className={activeTab === 'validate' ? 'active' : ''}
          onClick={() => setActiveTab('validate')}
        >
          Validate Transaction
        </button>
      </nav>

      <div className="content">
        {activeTab === 'query' && <QueryForm />}
        {activeTab === 'address' && <AddressDecoder />}
        {activeTab === 'validate' && <ValidateForm />}
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .header p {
          font-size: 1.125rem;
          color: #666;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .tabs button {
          padding: 1rem 2rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 1rem;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tabs button:hover {
          color: #0070f3;
        }

        .tabs button.active {
          color: #0070f3;
          border-bottom-color: #0070f3;
        }

        .content {
          min-height: 400px;
        }
      `}</style>
    </main>
  );
}
