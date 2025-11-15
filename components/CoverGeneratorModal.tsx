import React, { useState, useEffect, useCallback } from 'react';
import { summarizeStoryForImagePrompt, generateStoryCover } from '../services/geminiService';
import type { Story } from '../types';

interface CoverGeneratorModalProps {
  story: Story;
  onClose: () => void;
  onCoverGenerated: (imageUrl: string) => void;
}

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center gap-4 text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-500"></div>
        <p className="text-lg font-semibold">{text}</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-red-600 text-center p-4 bg-red-100 rounded-lg">
    <p className="font-semibold mb-1">Oh no, the bees got stuck!</p>
    <p>{message}</p>
  </div>
);


export const CoverGeneratorModal: React.FC<CoverGeneratorModalProps> = ({ story, onClose, onCoverGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<'loadingSummary' | 'editing' | 'loadingImage' | 'error'>('loadingSummary');
    const [error, setError] = useState<string | null>(null);
    const [lastAttempt, setLastAttempt] = useState<'summary' | 'image' | null>(null);

    const getSummary = useCallback(async () => {
        setMode('loadingSummary');
        setLastAttempt('summary');
        setError(null);
        try {
            const summary = await summarizeStoryForImagePrompt(story.title, story.content.join('\n'));
            setPrompt(summary);
            setMode('editing');
        } catch (err) {
            setError('Could not create a prompt suggestion.');
            setPrompt(`A beautiful and colorful illustration for the story "${story.title}".`);
            setMode('error');
        }
    }, [story.title, story.content]);

    useEffect(() => {
        getSummary();
    }, [getSummary]);

    const handleGenerate = async () => {
        setMode('loadingImage');
        setLastAttempt('image');
        setError(null);
        try {
            const imageUrl = await generateStoryCover(prompt);
            onCoverGenerated(imageUrl);
            onClose(); // Close modal on success
        } catch (err) {
            let message = 'Could not generate the cover image.';
            if (err instanceof Error) {
                const lowerCaseMessage = err.message.toLowerCase();
                if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('limit') || lowerCaseMessage.includes('resource has been exhausted')) {
                    message = "The magic paint ran out! Please wait a moment and try again.";
                }
            }
            setError(message);
            setMode('error');
        }
    };
    
    const renderContent = () => {
        switch(mode) {
            case 'loadingSummary':
                return <div className="h-48 flex items-center justify-center"><LoadingSpinner text="Thinking of a cool idea..." /></div>;
            case 'loadingImage':
                return <div className="h-64 flex items-center justify-center"><LoadingSpinner text="Painting your cover..." /></div>;
            case 'error':
                return <ErrorDisplay message={error!} />;
            case 'editing':
            default:
                return (
                    <>
                        <div>
                            <label htmlFor="prompt-textarea" className="font-semibold text-gray-700 mb-2 block">
                                Describe the cover you want to create:
                            </label>
                            <textarea
                                id="prompt-textarea"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                                placeholder="e.g., A happy puppy playing with a red ball in a sunny garden."
                            />
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim()}
                            className="w-full bg-amber-500 text-white font-bold py-3 px-4 rounded-full hover:bg-amber-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Generate Image
                        </button>
                    </>
                );
        }
    }


    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg flex flex-col gap-4 transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Create a Story Cover</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded-full"
                        aria-label="Close cover generator"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};