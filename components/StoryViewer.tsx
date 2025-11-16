import React, { useState } from 'react';
import type { Story, WordBubbleInfo, WordCounts, ComprehensionQuestion } from '../types';
import { WordBubble } from './WordBubble';
import { WordStats } from './WordStats';
import { getOrGenerateComprehensionQuestions } from '../services/geminiService';

interface StoryViewerProps {
  story: Story;
  onBack: () => void;
  wordCounts: WordCounts;
  onWordTapped: (word: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, onBack, wordCounts, onWordTapped }) => {
  const [bubbleInfo, setBubbleInfo] = useState<WordBubbleInfo | null>(null);
  const [isStatsVisible, setIsStatsVisible] = useState(false);

  // State for comprehension questions
  const [questions, setQuestions] = useState<ComprehensionQuestion[] | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());


  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>, word: string, context: string) => {
    e.stopPropagation();
    if (!word) return;

    // Log the word tap for counting stats
    onWordTapped(word);

    const rect = e.currentTarget.getBoundingClientRect();
    setBubbleInfo({ word, rect, context });
  };
  
  const closeBubble = () => {
      setBubbleInfo(null);
  };

  const loadQuestions = () => {
    if (questions || isLoadingQuestions || questionsError) return;

    setIsLoadingQuestions(true);
    getOrGenerateComprehensionQuestions(story.id, story.content.join('\n'))
      .then(setQuestions)
      .catch(err => {
        console.error("Failed to load questions:", err);
        setQuestionsError("Could not load the questions right now. Please try again later.");
      })
      .finally(() => setIsLoadingQuestions(false));
  };

  const handleToggleQuestions = () => {
    const shouldShow = !showQuestions;
    setShowQuestions(shouldShow);
    if (shouldShow) {
      loadQuestions();
    }
  };
  
  const toggleAnswer = (index: number) => {
    setRevealedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const renderParagraph = (paragraph: string, pIndex: number) => {
    // This regex splits by the [[phrase]] marker but keeps the marker in the array.
    const parts = paragraph.split(/(\[\[.*?\]\])/g).filter(Boolean);

    return parts.map((part, partIndex) => {
      const phraseMatch = part.match(/\[\[(.*?)\]\]/);

      if (phraseMatch) {
        const phrase = phraseMatch[1];
        const phraseWords = phrase.split(' ');

        return (
          <span
            key={`p${pIndex}-part${partIndex}`}
            className="cursor-pointer hover:bg-sky-200 rounded p-0.5 -m-0.5 transition-colors"
            onClick={(e) => handleWordClick(e, phrase, paragraph)}
          >
            {phraseWords.map((word, wordIndex) => {
              const cleanedWord = word.replace(/[.,!?;:"]+$/, '').trim();
              
              return (
                <span key={wordIndex}
                  className="hover:bg-yellow-200 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    if(cleanedWord) handleWordClick(e, cleanedWord, paragraph);
                  }}
                >
                  {word}{wordIndex < phraseWords.length - 1 ? ' ' : ''}
                </span>
              )
            })}
          </span>
        );
      } else {
        // This is a normal text chunk. Split by spaces while preserving them.
        return part.split(/(\s+)/).map((chunk, chunkIndex) => {
          if (/^\s+$/.test(chunk)) {
            // It's just whitespace, render it as is.
            return <span key={`p${pIndex}-part${partIndex}-chunk${chunkIndex}`}>{chunk}</span>;
          }

          const cleanedWord = chunk.replace(/[.,!?;:"]+$/, '').trim();
          const punctuation = chunk.substring(cleanedWord.length);

          if (!cleanedWord) {
            // This is just punctuation or an empty string
            return <span key={`p${pIndex}-part${partIndex}-chunk${chunkIndex}`}>{chunk}</span>;
          }

          return (
            <span key={`p${pIndex}-part${partIndex}-chunk${chunkIndex}`}>
              <span
                className="cursor-pointer hover:bg-yellow-200 rounded p-0.5 -m-0.5 transition-colors"
                onClick={(e) => handleWordClick(e, cleanedWord, paragraph)}
              >
                {cleanedWord}
              </span>
              {punctuation}
            </span>
          );
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-amber-50 p-4 sm:p-8" onClick={closeBubble}>
      {bubbleInfo && <WordBubble info={bubbleInfo} onClose={closeBubble} />}
      {isStatsVisible && <WordStats counts={wordCounts} onClose={() => setIsStatsVisible(false)} />}
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
            <button
            onClick={onBack}
            className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            All Stories
            </button>
            <button
              onClick={() => setIsStatsVisible(true)}
              className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2"
              aria-label="Show word statistics"
            >
              <span role="img" aria-hidden="true">📊</span> Word Stats
            </button>
        </div>

        <article className="bg-white rounded-lg shadow-lg p-4 sm:p-8 relative">
           <div className="mb-8 h-80 bg-amber-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                    src={story.coverImage} 
                    alt={`${story.title} cover`}
                    className="w-full h-full object-cover rounded-lg shadow-md"
                />
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-white rounded-l-lg flex justify-center py-8">
            <div className="w-px bg-red-300 h-full"></div>
          </div>
          <div className="ml-8 sm:ml-12" style={{backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2.2rem, #e5e7eb 2.2rem, #e5e7eb 2.25rem)'}}>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">{story.title}</h1>
            <p className="text-sm text-gray-500 mb-8">Reading Level: {story.level}</p>

            <div className="space-y-6 text-gray-700 text-xl sm:text-2xl leading-relaxed sm:leading-loose">
              {story.content.map((paragraph, pIndex) => (
                <p key={pIndex}>
                  {renderParagraph(paragraph, pIndex)}
                </p>
              ))}
            </div>

            {/* START: Comprehension Questions Section */}
            <div className="mt-12">
              {!showQuestions && (
                <div className="text-center">
                  <button
                    onClick={handleToggleQuestions}
                    className="bg-purple-500 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-600 transition-transform transform hover:scale-105 shadow-lg"
                  >
                    Check Your Understanding ✨
                  </button>
                </div>
              )}

              {showQuestions && (
                <div className="p-4 sm:p-6 bg-purple-50 border-2 border-purple-200 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-purple-800 text-center flex-grow">Let's see what you remember!</h2>
                    <button onClick={handleToggleQuestions} className="text-gray-400 hover:text-gray-700 p-1 rounded-full" aria-label="Hide questions">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                       </svg>
                    </button>
                  </div>
                  
                  {isLoadingQuestions && <p className="text-center text-gray-600">Loading questions...</p>}
                  {questionsError && <p className="text-center text-red-600">{questionsError}</p>}
                  {questions && (
                    <ul className="space-y-6">
                      {questions.map((q, index) => (
                        <li key={index} className="bg-white p-4 rounded-lg shadow">
                          <p className="text-lg font-semibold text-gray-800 mb-3">{index + 1}. {q.question}</p>
                          <button
                            onClick={() => toggleAnswer(index)}
                            className="text-sm font-bold text-purple-600 hover:text-purple-800"
                          >
                            {revealedAnswers.has(index) ? 'Hide Answer' : 'Show Answer'}
                          </button>
                          {revealedAnswers.has(index) && (
                            <p className="mt-3 p-3 bg-green-50 text-green-800 rounded-md border border-green-200">
                              {q.answer}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {/* END: Comprehension Questions Section */}

          </div>
        </article>
      </div>
    </div>
  );
};