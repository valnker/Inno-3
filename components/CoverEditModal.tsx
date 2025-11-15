import React, { useState, useEffect, useCallback, useRef } from 'react';
import { summarizeStoryForImagePrompt, generateStoryCover } from '../services/geminiService';
import type { Story } from '../types';

interface CoverEditModalProps {
  story: Story;
  onClose: () => void;
  onCoverUpdate: (imageUrl: string) => void;
}

type ModalMode = 'options' | 'loadingSummary' | 'editingPrompt' | 'loadingImage' | 'loadingUpload' | 'error';

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center gap-4 text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-500"></div>
        <p className="text-lg font-semibold">{text}</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="text-center p-4 bg-red-100 rounded-lg flex flex-col items-center gap-4">
    <p className="font-semibold text-red-700">Oh no, the bees got stuck!</p>
    <p className="text-red-600">{message}</p>
    <button
        onClick={onRetry}
        className="bg-amber-500 text-white font-bold py-2 px-4 rounded-full hover:bg-amber-600 transition-colors"
    >
        Try Again
    </button>
  </div>
);

export const CoverEditModal: React.FC<CoverEditModalProps> = ({ story, onClose, onCoverUpdate }) => {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<ModalMode>('options');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getSummary = useCallback(async () => {
        setMode('loadingSummary');
        setError(null);
        try {
            const summary = await summarizeStoryForImagePrompt(story.title, story.content.join('\n'));
            setPrompt(summary);
            setMode('editingPrompt');
        } catch (err) {
            setError('Could not create a prompt suggestion.');
            setMode('error');
        }
    }, [story.title, story.content]);

    const handleGenerate = async () => {
        setMode('loadingImage');
        setError(null);
        try {
            const imageUrl = await generateStoryCover(prompt);
            onCoverUpdate(imageUrl);
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

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (e.g., JPG, PNG).');
            setMode('error');
            return;
        }

        setMode('loadingUpload');
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                onCoverUpdate(reader.result);
            } else {
                setError('Could not process the image file.');
                setMode('error');
            }
        };
        reader.onerror = () => {
            setError('Failed to read the file.');
            setMode('error');
        };
        reader.readAsDataURL(file);
    };

    const renderContent = () => {
        switch(mode) {
            case 'loadingSummary':
                return <div className="h-64 flex items-center justify-center"><LoadingSpinner text="Thinking of a cool idea..." /></div>;
            case 'loadingImage':
                return <div className="h-64 flex items-center justify-center"><LoadingSpinner text="Painting your cover..." /></div>;
            case 'loadingUpload':
                return <div className="h-64 flex items-center justify-center"><LoadingSpinner text="Uploading your photo..." /></div>;
            case 'error':
                return <ErrorDisplay message={error!} onRetry={() => setMode('options')} />;
            case 'editingPrompt':
                 return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="prompt-textarea" className="font-semibold text-gray-700 mb-2 block">
                                Describe the cover you want to create:
                            </label>
                            <textarea
                                id="prompt-textarea"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                                placeholder={`e.g., ${prompt}`}
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
                    </div>
                );
            case 'options':
            default:
                return (
                    <div className="flex flex-col gap-4">
                        <img src={story.coverImage} alt={`Current cover for ${story.title}`} className="w-full h-48 object-cover rounded-lg shadow-inner" />
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        <button
                            onClick={handleUploadClick}
                            className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-full hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Upload Photo
                        </button>
                        <button
                            onClick={getSummary}
                            className="w-full bg-amber-500 text-white font-bold py-3 px-4 rounded-full hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Generate with AI
                        </button>
                    </div>
                );
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col gap-4 transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Edit Cover</h2>
                        <p className="text-sm text-gray-500">{story.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded-full"
                        aria-label="Close cover editor"
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
