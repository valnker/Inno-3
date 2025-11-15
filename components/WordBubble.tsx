import React, { useState, useEffect, useCallback } from 'react';
import { generateImageForWord, generateAudioForWord, getAudioContext } from '../services/geminiService';
import type { WordBubbleInfo } from '../types';

interface WordBubbleProps {
  info: WordBubbleInfo;
  onClose: () => void;
}

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-red-600 text-sm p-4 bg-red-100 rounded-lg text-center flex flex-col items-center w-full h-full justify-center">
      <p className="font-semibold">Oops!</p>
      <p>{message}</p>
    </div>
);

export const WordBubble: React.FC<WordBubbleProps> = ({ info, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchImage = useCallback(async (word: string, context: string) => {
    setIsImageLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const imgUrl = await generateImageForWord(word, context);
      setImageUrl(imgUrl);
    } catch (err) {
      let message = 'Could not load the image.';
      if (err instanceof Error) {
        const lowerCaseMessage = err.message.toLowerCase();
        if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('limit') || lowerCaseMessage.includes('resource has been exhausted')) {
            message = "The bee is tired! Please wait a moment and try again.";
        }
      }
      setError(message);
      console.error(err);
    } finally {
      setIsImageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (info.word) {
      fetchImage(info.word, info.context);
      // Reset audio-related state when word changes
      setAudioBuffer(null);
      setIsPlaying(false);
      setIsAudioLoading(false);
    }
  }, [info.word, info.context, fetchImage]);

  const playAudio = useCallback(async () => {
    if (isPlaying || isAudioLoading) return;

    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const playBuffer = (buffer: AudioBuffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      setIsPlaying(true);
      source.start(0);
    };

    if (audioBuffer) {
      playBuffer(audioBuffer);
    } else {
      setIsAudioLoading(true);
      setError(null);
      try {
        const newAudioBuffer = await generateAudioForWord(info.word);
        setAudioBuffer(newAudioBuffer);
        playBuffer(newAudioBuffer);
      } catch (err) {
        let message = 'Could not load audio.';
        if (err instanceof Error) {
          const lowerCaseMessage = err.message.toLowerCase();
          if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('limit') || lowerCaseMessage.includes('resource has been exhausted')) {
            message = "Bee is tired! Audio failed.";
          }
        }
        setError(message);
        console.error(err);
      } finally {
        setIsAudioLoading(false);
      }
    }
  }, [audioBuffer, info.word, isPlaying, isAudioLoading]);


  const handleBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${info.rect.bottom + 8}px`,
    left: `${info.rect.left + info.rect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 50,
  };

  return (
    <div
      style={bubbleStyle}
      onClick={handleBubbleClick}
      className="bg-white rounded-2xl shadow-xl p-3 w-48 border border-gray-200 flex flex-col items-center gap-2"
    >
      <button onClick={onClose} className="absolute top-1 right-1 text-gray-400 hover:text-gray-700 p-1 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
        {isImageLoading && <LoadingSpinner />}
        {error && !isImageLoading && <ErrorDisplay message={error} />}
        {imageUrl && !isImageLoading && !error && (
          <img src={imageUrl} alt={info.word} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex items-center justify-between w-full mt-1">
        <p className="font-bold text-gray-800 capitalize text-lg">{info.word}</p>
        <button
          onClick={playAudio}
          disabled={isImageLoading || isAudioLoading || isPlaying}
          className="disabled:opacity-50 disabled:cursor-not-allowed bg-sky-100 text-sky-600 rounded-full w-10 h-10 flex items-center justify-center hover:bg-sky-200 transition-colors"
          aria-label={`Play pronunciation for ${info.word}`}
        >
          {isAudioLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
          ) : isPlaying ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M11 5.882V19.118a1.75 1.75 0 01-3.07.996L4.243 16.5H2.25A2.25 2.25 0 010 14.25v-4.5A2.25 2.25 0 012.25 7.5h2.003l3.686-3.614a1.75 1.75 0 013.061.996z" />
             </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.118a1.75 1.75 0 01-3.07.996L4.243 16.5H2.25A2.25 2.25 0 010 14.25v-4.5A2.25 2.25 0 012.25 7.5h2.003l3.686-3.614a1.75 1.75 0 013.061.996zM16.5 12a5.25 5.25 0 00-3.447-5.013v10.026A5.25 5.25 0 0016.5 12z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};