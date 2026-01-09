
import React, { useState, useEffect } from 'react';

interface RouteSearchProps {
  onSearch: (from: string, to: string) => void;
  isLoading: boolean;
  initialFrom?: string;
  initialTo?: string;
}

const RouteSearch: React.FC<RouteSearchProps> = ({ onSearch, isLoading, initialFrom = '', initialTo = '' }) => {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  useEffect(() => {
    setFrom(initialFrom);
    setTo(initialTo);
  }, [initialFrom, initialTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const source = from.trim() || 'Current Location';
    const destination = to.trim();
    
    if (destination) {
      onSearch(source, destination);
    } else {
      alert("Please enter a destination to find safe routes.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-lg space-y-4 border border-gray-100 ring-1 ring-black/5">
      <div className="flex items-center space-x-4 bg-gray-50/80 p-3 rounded-xl border border-gray-200/50">
        <div className="flex flex-col items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div>
          <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-500 to-pink-500 opacity-20 my-1"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm shadow-pink-200"></div>
        </div>
        <div className="flex-1 space-y-3">
          <input
            type="text"
            placeholder="From: Current location"
            className="w-full bg-transparent text-sm font-bold text-black focus:outline-none placeholder:text-gray-300 placeholder:font-medium"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <div className="h-px bg-gray-200/50"></div>
          <input
            type="text"
            placeholder="To: Destination"
            className="w-full bg-transparent text-sm font-bold text-black focus:outline-none placeholder:text-gray-300 placeholder:font-medium"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 rounded-xl font-black text-white transition-all flex items-center justify-center space-x-2 text-sm uppercase tracking-wider ${
          isLoading ? 'bg-indigo-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-[0.97]'
        }`}
      >
        {isLoading ? (
          <i className="fa-solid fa-spinner fa-spin text-lg"></i>
        ) : (
          <>
            <i className="fa-solid fa-location-dot"></i>
            <span>{initialTo ? 'Recalculate Path' : 'Plan Safe Route'}</span>
          </>
        )}
      </button>
    </form>
  );
};

export default RouteSearch;
