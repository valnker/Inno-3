import React from 'react';
import type { WordCounts } from '../types';

interface WordStatsProps {
  counts: WordCounts;
  onClose: () => void;
}

export const WordStats: React.FC<WordStatsProps> = ({ counts, onClose }) => {
  // Fix: Explicitly cast the result of Object.entries to ensure TypeScript correctly
  // infers the types within the sort callback, resolving the arithmetic error.
  const sortedWords = (Object.entries(counts) as [string, number][]).sort(([, countA], [, countB]) => countB - countA);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Words Explored</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full"
            aria-label="Close word statistics"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sortedWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 text-gray-500">
             <span className="text-4xl mb-4" role="img" aria-hidden="true">🧐</span>
            <p>Click on words in the story to see your progress here!</p>
          </div>
        ) : (
          <div className="overflow-y-auto pr-2 -mr-2">
            <ul className="space-y-2">
              {sortedWords.map(([word, count]) => (
                <li key={word} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="capitalize font-semibold text-gray-700">{word}</span>
                  <span className="text-lg font-bold text-blue-600 bg-blue-100 rounded-full px-3 py-1 text-center min-w-[32px]">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
