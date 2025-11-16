import React, { useState } from 'react';
import { generateStory } from '../services/geminiService';
import type { Story } from '../types';

interface CreateStoryModalProps {
  onClose: () => void;
  onStoryCreated: (storyData: Omit<Story, 'id' | 'color' | 'hoverColor' | 'coverImage'>) => Promise<void>;
}

type ModalMode = 'prompt' | 'loading' | 'error';
type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

const cefrLevels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];


const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center gap-4 text-gray-600 h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-500"></div>
        <p className="text-lg font-semibold">{text}</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="text-center p-4 bg-red-100 rounded-lg flex flex-col items-center gap-4 h-64 justify-center">
    <p className="font-semibold text-red-700">Oh no, the story bee got lost!</p>
    <p className="text-red-600">{message}</p>
    <button
        onClick={onRetry}
        className="bg-amber-500 text-white font-bold py-2 px-4 rounded-full hover:bg-amber-600 transition-colors"
    >
        Try Again
    </button>
  </div>
);

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onStoryCreated }) => {
    const [prompt, setPrompt] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<CefrLevel>('A1');
    const [mode, setMode] = useState<ModalMode>('prompt');
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setMode('loading');
        setError(null);
        try {
            const { title, content } = await generateStory(prompt, selectedLevel);
            
            let storyLevel: Story['level'];
            switch (selectedLevel) {
                case 'A1':
                    storyLevel = 'Easy';
                    break;
                case 'A2':
                    storyLevel = 'Medium';
                    break;
                case 'B1':
                case 'B2':
                    storyLevel = 'Hard';
                    break;
                default: // C1 and C2
                    storyLevel = 'Super Hard';
            }

            await onStoryCreated({ title, content, level: storyLevel });
            // The parent component is responsible for closing the modal now
        } catch (err) {
            let message = 'Could not create the story.';
            if (err instanceof Error) {
                const lowerCaseMessage = err.message.toLowerCase();
                if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('limit')) {
                    message = "The story bees are all busy! Please wait and try again.";
                } else {
                    message = "There was an unexpected error. Please try again."
                }
            }
            setError(message);
            setMode('error');
        }
    };

    const renderContent = () => {
        switch (mode) {
            case 'loading':
                return <LoadingSpinner text="Our story bees are buzzing with ideas..." />;
            case 'error':
                return <ErrorDisplay message={error!} onRetry={() => setMode('prompt')} />;
            case 'prompt':
            default:
                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="prompt-textarea" className="font-semibold text-gray-700 mb-2 block">
                                What should the story be about?
                            </label>
                            <textarea
                                id="prompt-textarea"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-24 p-3 border border-gray-500 bg-gray-700 text-white placeholder-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                                placeholder="e.g., A brave little bee on a big adventure"
                                aria-label="Story prompt input"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-gray-700 mb-2 block">
                                Select a language level (CEFR):
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {cefrLevels.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`p-3 border-2 rounded-lg font-bold transition-colors ${selectedLevel === level ? 'bg-amber-400 border-amber-500 text-white' : 'bg-white border-gray-300 hover:border-amber-400'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                         <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim()}
                            className="w-full mt-4 bg-amber-500 text-white font-bold py-3 px-4 rounded-full hover:bg-amber-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                            Create Story
                        </button>
                    </div>
                );
        }
    };

    return (
         <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Let's Create a Story!</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded-full"
                        aria-label="Close story creator"
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