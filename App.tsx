import React, { useState, useCallback } from 'react';
import { stories } from './constants/stories';
import type { Story, WordCounts } from './types';
import { StoryViewer } from './components/StoryViewer';
import { clearCaches } from './services/geminiService';

const StoryCard: React.FC<{ story: Story; onSelect: (story: Story) => void }> = ({ story, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(story)}
      className="cursor-pointer group transition-all duration-300 hover:!scale-105 hover:z-10 w-[240px] bg-white rounded-2xl shadow-lg hover:shadow-2xl flex flex-col"
      role="button"
      aria-label={`Read story: ${story.title}`}
    >
      <div className="w-full h-[180px] rounded-t-2xl overflow-hidden relative">
        <img src={story.coverImage} alt={`Cover for ${story.title}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-md font-bold text-gray-800 flex-grow">{story.title}</h3>
        <span className={`mt-2 self-start px-3 py-1 text-xs font-bold rounded-full ${story.color} text-gray-700`}>
          {story.level}
        </span>
      </div>
    </div>
  );
};


const BeeSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(5)">
            {/* Wings */}
            <path d="M40 35 C 20 10, 20 40, 42 45" fill="rgba(230,245,255,0.9)" stroke="#4F3B00" strokeWidth="4" />
            <path d="M60 35 C 80 10, 80 40, 58 45" fill="rgba(230,245,255,0.9)" stroke="#4F3B00" strokeWidth="4" />
        </g>
        {/* Body */}
        <ellipse cx="50" cy="60" rx="28" ry="22" fill="#FFD633" stroke="#4F3B00" strokeWidth="4" />
        {/* Stripes */}
        <path d="M28 52 Q 50 47, 72 52" stroke="#4F3B00" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <path d="M24 62 Q 50 57, 76 62" stroke="#4F3B00" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <path d="M28 72 Q 50 67, 72 72" stroke="#4F3B00" strokeWidth="7" fill="none" strokeLinecap="round"/>
        {/* Face */}
        <circle cx="43" cy="58" r="3" fill="#4F3B00"/>
        <circle cx="57" cy="58" r="3" fill="#4F3B00"/>
        {/* Antennae */}
        <path d="M45 42 C 40 28, 35 30, 32 35" stroke="#4F3B00" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M55 42 C 60 28, 65 30, 68 35" stroke="#4F3B00" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </svg>
);


const BookiBeeIcon = () => (
    <div className="w-20 h-20 transform transition-transform hover:scale-110 animate-float" style={{animationDelay: '0.5s'}}>
        <BeeSvg />
    </div>
);


const StarIcon: React.FC<{className?: string; style?: React.CSSProperties}> = ({className, style}) => (
    <div className={className} style={style}>
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-yellow-300 drop-shadow-lg">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/>
        </svg>
    </div>
);

const CloudSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 120 40" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.7" d="M96.19,20.62c-1.7-8.1-9.18-13.88-17.68-13.88-4.38,0-8.38,1.68-11.48,4.48-2.6-4.9-7.8-8.2-13.7-8.2-8.6,0-15.6,6.9-15.6,15.5,0,0.5,0,1,0.1,1.5C37.39,18.12,36.29,17.22,35,17.22c-4.4,0-8,3.6-8,8s3.6,8,8,8h61.2c4.9,0,8.8-3.9,8.8-8.8S101.09,20.62,96.19,20.62z"/>
    </svg>
);

const HomePage: React.FC<{ onSelectStory: (story: Story) => void }> = ({ onSelectStory }) => {
  const levelOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
  const sortedStories = [...stories].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-200 to-cyan-100 p-4 sm:p-8 overflow-hidden">
      {/* ===== DECORATIONS ===== */}
      {/* Stars */}
      <StarIcon className="absolute top-[10%] left-[15%] w-10 h-10 animate-twinkle" style={{animationDelay: '0s'}} />
      <StarIcon className="absolute top-[20%] right-[10%] w-12 h-12 animate-twinkle" style={{animationDelay: '1s'}} />
      <StarIcon className="absolute bottom-[40%] left-[5%] w-8 h-8 animate-twinkle" style={{animationDelay: '2s'}} />
      <StarIcon className="absolute bottom-[15%] right-[25%] w-10 h-10 animate-twinkle" style={{animationDelay: '0.5s'}} />
      <StarIcon className="absolute top-[45%] left-[40%] w-6 h-6 animate-twinkle" style={{animationDelay: '1.5s'}} />

      {/* Bees */}
      <BeeSvg className="absolute top-[15%] left-[5%] w-24 h-24 opacity-20 animate-float" style={{animationDelay: '1.2s', transform: 'rotate(-12deg)'}} />
      <BeeSvg className="absolute bottom-[10%] right-[10%] w-32 h-32 opacity-20 animate-float" style={{animationDelay: '0.2s', transform: 'rotate(6deg)'}} />
      <BeeSvg className="absolute top-[60%] right-[20%] w-20 h-20 opacity-20 animate-float" style={{animationDelay: '2.2s', transform: 'rotate(12deg)'}} />
      <BeeSvg className="absolute top-[50%] left-[25%] w-36 h-36 opacity-20 animate-float-slow" style={{animationDelay: '0.8s', transform: 'rotate(-5deg)'}} />
      <BeeSvg className="absolute bottom-[25%] left-[10%] w-28 h-28 opacity-20 animate-float-slow" style={{animationDelay: '1.8s', transform: 'rotate(15deg)'}} />

      {/* Clouds */}
      <CloudSvg className="absolute top-[15%] -left-10 w-48 animate-float-slow" style={{animationDelay: '0.5s'}} />
      <CloudSvg className="absolute top-[30%] -right-12 w-56 animate-float-slow" style={{animationDelay: '1.5s'}}/>
      <CloudSvg className="absolute bottom-[20%] left-[20%] w-32 animate-float-slow" style={{animationDelay: '2.5s'}}/>
      {/* ======================= */}
      
      <div className="relative z-20">
        <header className="text-center mb-16 pt-8">
          <div className="flex justify-center items-center gap-2 sm:gap-4">
              <h1 className="text-5xl sm:text-6xl font-bold text-amber-900" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.1)'}}>BookiBee</h1>
              <BookiBeeIcon />
          </div>
          <p className="text-lg text-amber-800 mt-2">Buzz into a reading adventure!</p>
        </header>

        <main className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 gap-y-12 justify-items-center">
              {sortedStories.map((story) => (
                <StoryCard key={story.id} story={story} onSelect={onSelectStory} />
              ))}
          </div>
        </main>

        <footer className="text-center mt-20 pb-4 text-amber-800/80 font-semibold">
            <p>Click on any word in a story to see a picture and hear how it's said!</p>
        </footer>
      </div>
    </div>
  );
};

function App() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [wordCounts, setWordCounts] = useState<WordCounts>({});

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
  };

  const handleBackToHome = () => {
    setSelectedStory(null);
    setWordCounts({}); // Reset counts when returning home
    // Fix: Called clearCaches to utilize the imported function and clear session caches when returning to the home screen.
    clearCaches();
  };

  const handleWordTapped = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase();
    setWordCounts(prevCounts => ({
      ...prevCounts,
      [normalizedWord]: (prevCounts[normalizedWord] || 0) + 1,
    }));
  }, []);

  if (selectedStory) {
    return <StoryViewer 
             story={selectedStory} 
             onBack={handleBackToHome}
             wordCounts={wordCounts}
             onWordTapped={handleWordTapped}
           />;
  }

  return <HomePage onSelectStory={handleSelectStory} />;
}

export default App;