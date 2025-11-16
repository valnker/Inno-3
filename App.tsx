import React, { useState, useCallback, useEffect } from 'react';
import { stories as defaultStories } from './constants/stories';
import type { Story, WordCounts } from './types';
import { StoryViewer } from './components/StoryViewer';
import { clearCaches, generateStoryCover, summarizeStoryForImagePrompt } from './services/geminiService';
import { CoverEditModal } from './components/CoverEditModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

// Helper to load stories from localStorage and merge with defaults.
const getInitialStories = (): Story[] => {
  try {
    const userStoriesJson = localStorage.getItem('bookibee-user-stories');
    const userStories = userStoriesJson ? JSON.parse(userStoriesJson) : [];

    // Apply saved covers to default stories.
    const processedDefaultStories = defaultStories.map(story => {
      const storedImage = localStorage.getItem(`bookibee-cover-${story.id}`);
      if (storedImage) {
        return { ...story, coverImage: storedImage };
      }
      return story;
    });

    return [...userStories, ...processedDefaultStories];
  } catch (e) {
    console.warn('Could not read stories from localStorage on init', e);
    return defaultStories;
  }
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
        <circle cx="43" cy="58" r="3" fill="#4F3B00" />
        <circle cx="57" cy="58" r="3" fill="#4F3B00" />
        <path d="M45 68 Q 50 72, 55 68" stroke="#4F3B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Antennae */}
        <path d="M38 45 Q 35 30, 30 30" stroke="#4F3B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M62 45 Q 65 30, 70 30" stroke="#4F3B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
);

const CloudSvg = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 130 80" className={className} fill="white" xmlns="http://www.w3.org/2000/svg" style={{ ...style, opacity: 0.6, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.05))' }}>
        <path d="M45.5 80C29.4264 80 16.5 67.0736 16.5 51C16.5 34.9264 29.4264 22 45.5 22C46.9942 22 48.4632 22.1408 49.8947 22.4116C55.2368 9.50745 68.3246 0.5 83.5 0.5C102.735 0.5 118.5 16.2655 118.5 35.5C118.5 40.835 117.288 45.8954 115.2 50.437C123.504 53.0763 129.5 60.892 129.5 70C129.5 75.799 126.397 80 121.5 80H45.5Z"/>
    </svg>
);

const StarSvg = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
);


const getLevelClasses = (level: Story['level']) => {
  switch (level) {
    case 'Easy':
      return 'bg-lime-200 text-lime-900';
    case 'Medium':
      return 'bg-amber-200 text-amber-900';
    case 'Hard':
      return 'bg-rose-200 text-rose-900';
    case 'Super Hard':
        return 'bg-red-200 text-red-900';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};


const App: React.FC = () => {
  const [stories, setStories] = useState<Story[]>(getInitialStories);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [wordCounts, setWordCounts] = useState<WordCounts>(() => {
    try {
      const savedCounts = localStorage.getItem('bookibee-word-counts');
      return savedCounts ? JSON.parse(savedCounts) : {};
    } catch (e) {
      return {};
    }
  });

  const [coverEditStory, setCoverEditStory] = useState<Story | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

  // This effect runs once on mount to generate initial covers for default stories
  // if they haven't been generated and cached before.
  useEffect(() => {
    const generateInitialCovers = async () => {
      const storiesToUpdate = stories.filter(s => s.coverImage.startsWith('data:image/png;base64,iVBORw0KGgoAAA') && s.coverPrompt);
      if (storiesToUpdate.length === 0) return;

      console.log(`Generating initial covers for ${storiesToUpdate.length} stories...`);
      
      const updatedStories = [...stories];
      
      for (const story of storiesToUpdate) {
        try {
          const storedImage = localStorage.getItem(`bookibee-cover-${story.id}`);
          if (storedImage) {
            const index = updatedStories.findIndex(s => s.id === story.id);
            if (index !== -1) {
              updatedStories[index] = { ...updatedStories[index], coverImage: storedImage };
            }
          } else {
            console.log(`Generating cover for: "${story.title}"`);
            const imageUrl = await generateStoryCover(story.coverPrompt!);
            const index = updatedStories.findIndex(s => s.id === story.id);
            if (index !== -1) {
              updatedStories[index] = { ...updatedStories[index], coverImage: imageUrl };
              localStorage.setItem(`bookibee-cover-${story.id}`, imageUrl);
            }
          }
        } catch (error) {
          console.error(`Failed to generate cover for story ID ${story.id}:`, error);
        }
      }
      setStories(updatedStories);
    };

    generateInitialCovers();
  }, []); // Empty dependency array means this runs only once on mount.


  const handleStorySelect = useCallback((story: Story) => {
    clearCaches(); // Clear session caches when opening a new story
    setSelectedStory(story);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedStory(null);
  }, []);

  const handleWordTapped = useCallback((word: string) => {
    const cleanedWord = word.toLowerCase();
    setWordCounts(prevCounts => {
      const newCounts = { ...prevCounts, [cleanedWord]: (prevCounts[cleanedWord] || 0) + 1 };
      try {
        localStorage.setItem('bookibee-word-counts', JSON.stringify(newCounts));
      } catch (e) {
        console.warn('Could not save word counts to localStorage', e);
      }
      return newCounts;
    });
  }, []);
  
  const handleCoverUpdate = useCallback((imageUrl: string) => {
    if (!coverEditStory) return;

    const storyId = coverEditStory.id;
    setStories(prevStories => prevStories.map(story => 
      story.id === storyId ? { ...story, coverImage: imageUrl } : story
    ));
    
    try {
        if (storyId > 1000) { // Assume user stories have high IDs
            const userStories = JSON.parse(localStorage.getItem('bookibee-user-stories') || '[]');
            const updatedUserStories = userStories.map((s: Story) => s.id === storyId ? { ...s, coverImage: imageUrl } : s);
            localStorage.setItem('bookibee-user-stories', JSON.stringify(updatedUserStories));
        } else {
            localStorage.setItem(`bookibee-cover-${storyId}`, imageUrl);
        }
    } catch (e) {
      console.warn('Could not save cover to localStorage', e);
    }
    
    setCoverEditStory(null);
  }, [coverEditStory]);

  const handleStoryCreated = useCallback(async (storyData: Omit<Story, 'id' | 'color' | 'hoverColor' | 'coverImage'>) => {
    setIsCreateModalOpen(false);

    const newStoryId = Date.now();
    const colors = {
      'Easy': { color: 'bg-lime-200', hoverColor: 'hover:bg-lime-300' },
      'Medium': { color: 'bg-amber-200', hoverColor: 'hover:bg-amber-300' },
      'Hard': { color: 'bg-rose-200', hoverColor: 'hover:bg-rose-300' },
      'Super Hard': { color: 'bg-red-200', hoverColor: 'hover:bg-red-300' },
    };
    const { color, hoverColor } = colors[storyData.level];

    const placeholderStory: Story = {
      ...storyData,
      id: newStoryId,
      color,
      hoverColor,
      coverImage: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Transparent pixel
    };

    setStories(prev => [placeholderStory, ...prev]);

    try {
      const coverPrompt = await summarizeStoryForImagePrompt(storyData.title, storyData.content.join('\n'));
      const coverImage = await generateStoryCover(coverPrompt);

      const finalStory: Story = { ...placeholderStory, coverImage, coverPrompt };
      
      setStories(prev => prev.map(s => s.id === newStoryId ? finalStory : s));

      const userStories = JSON.parse(localStorage.getItem('bookibee-user-stories') || '[]');
      localStorage.setItem('bookibee-user-stories', JSON.stringify([finalStory, ...userStories]));
    } catch (error) {
      console.error("Failed to generate cover for new story:", error);
      const userStories = JSON.parse(localStorage.getItem('bookibee-user-stories') || '[]');
      localStorage.setItem('bookibee-user-stories', JSON.stringify([placeholderStory, ...userStories]));
    }
  }, []);

  const handleDeleteConfirm = useCallback((storyToDelete: Story) => {
    // Also remove associated cached data from localStorage
    localStorage.removeItem(`bookibee-questions-${storyToDelete.id}`);
    localStorage.removeItem(`bookibee-story-audio-${storyToDelete.id}`);

    // Filter from main state
    setStories(prevStories => prevStories.filter(story => story.id !== storyToDelete.id));

    // Filter from user stories in localStorage
    try {
      const userStories = JSON.parse(localStorage.getItem('bookibee-user-stories') || '[]');
      const updatedUserStories = userStories.filter((s: Story) => s.id !== storyToDelete.id);
      localStorage.setItem('bookibee-user-stories', JSON.stringify(updatedUserStories));
    } catch (e) {
      console.warn('Could not update user stories in localStorage after deletion', e);
    }

    setStoryToDelete(null);
  }, []);

  if (selectedStory) {
    return <StoryViewer story={selectedStory} onBack={handleBack} wordCounts={wordCounts} onWordTapped={handleWordTapped} />;
  }

  return (
    <div className="min-h-screen bg-sky-100 text-gray-800 p-4 sm:p-8 relative overflow-hidden">
        {coverEditStory && <CoverEditModal story={coverEditStory} onClose={() => setCoverEditStory(null)} onCoverUpdate={handleCoverUpdate} />}
        {isCreateModalOpen && <CreateStoryModal onClose={() => setIsCreateModalOpen(false)} onStoryCreated={handleStoryCreated} />}
        {storyToDelete && <DeleteConfirmationModal story={storyToDelete} onClose={() => setStoryToDelete(null)} onConfirm={handleDeleteConfirm} />}

        <CloudSvg className="absolute -top-10 -left-20 w-80 h-80 animate-float-slow" />
        <CloudSvg className="absolute top-1/4 -right-24 w-96 h-96 animate-float" style={{animationDelay: '-5s'}}/>
        <CloudSvg className="absolute bottom-0 -left-24 w-96 h-96 animate-float" style={{animationDelay: '-8s'}}/>
        <CloudSvg className="absolute bottom-[-100px] right-[-100px] w-96 h-96 animate-float-slow" style={{animationDelay: '-2s'}}/>

        <StarSvg className="absolute top-[10%] left-[5%] sm:left-[15%] w-6 h-6 text-yellow-300 animate-twinkle opacity-80" style={{ animationDelay: '-0.5s' }} />
        <StarSvg className="absolute top-[20%] right-[8%] sm:right-[12%] w-4 h-4 text-yellow-300 animate-twinkle" style={{ animationDelay: '-1.5s' }} />
        <StarSvg className="absolute bottom-[40%] right-[5%] sm:right-[15%] w-5 h-5 text-yellow-300 animate-twinkle" style={{ animationDelay: '-4s' }} />
        <StarSvg className="absolute bottom-[10%] left-[10%] sm:left-[20%] w-8 h-8 text-yellow-300 animate-twinkle opacity-90" style={{ animationDelay: '-2.5s' }} />
        <StarSvg className="absolute top-[55%] left-[12%] sm:left-[25%] w-4 h-4 text-yellow-300 animate-twinkle" style={{ animationDelay: '-3s' }} />
        <StarSvg className="absolute top-[70%] right-[10%] sm:right-[20%] w-6 h-6 text-yellow-300 animate-twinkle opacity-80" style={{ animationDelay: '-5s' }} />
        <StarSvg className="absolute top-[5%] right-[25%] sm:right-[30%] w-5 h-5 text-yellow-300 animate-twinkle" style={{ animationDelay: '-0.2s' }} />
        <StarSvg className="absolute bottom-[25%] left-[2%] sm:left-[5%] w-5 h-5 text-yellow-300 animate-twinkle" style={{ animationDelay: '-3.5s' }} />
        <BeeSvg className="absolute top-[35%] left-[8%] w-10 h-10 animate-float" style={{ animationDelay: '-6s', transform: 'scaleX(-1)' }} />
        <BeeSvg className="absolute bottom-[15%] right-[6%] w-14 h-14 animate-float-slow" style={{ animationDelay: '-1s' }} />
        <BeeSvg className="absolute top-[8%] right-[5%] w-12 h-12 animate-float-slow" style={{ animationDelay: '-3s', transform: 'scaleX(-1)' }} />
        <BeeSvg className="absolute bottom-[5%] left-[25%] w-9 h-9 animate-float" style={{ animationDelay: '-9s' }} />


        <header className="text-center mb-12 sm:mb-16 relative z-10">
            <h1 className="text-5xl sm:text-6xl font-bold text-stone-800 drop-shadow-lg flex items-center justify-center gap-x-2 sm:gap-x-4">
                BookiBee
                <BeeSvg className="w-16 h-16 sm:w-20 sm:h-20 -mt-2" />
            </h1>
            <p className="mt-2 text-lg sm:text-xl text-stone-600">
                Buzz into a reading adventure!
            </p>
        </header>

      <main className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {stories.map(story => (
            <div 
                key={story.id} 
                className="group bg-white rounded-2xl shadow-lg cursor-pointer transform hover:-translate-y-2 transition-transform duration-300 overflow-hidden flex flex-col"
                onClick={() => handleStorySelect(story)}
                aria-label={`Read story: ${story.title}`}
                role="button"
            >
                <div className="relative w-full h-40 overflow-hidden bg-gray-200">
                    <img 
                        src={story.coverImage} 
                        alt={`Cover for ${story.title}`} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                     <div className="absolute top-2 right-2 flex flex-col gap-2 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCoverEditStory(story);
                            }}
                            className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white hover:text-amber-500 transition-all"
                            aria-label="Edit cover"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                               <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </button>
                        {story.id > 1000 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStoryToDelete(story);
                                }}
                                className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:bg-red-500 hover:text-white transition-all"
                                aria-label="Delete story"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <div className="p-4 flex-grow flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 flex-grow">{story.title}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full self-start ${getLevelClasses(story.level)}`}>
                        {story.level}
                    </span>
                </div>
            </div>
            ))}
            <div
                key="create-story"
                className="group bg-white rounded-2xl shadow-lg cursor-pointer transform hover:-translate-y-2 transition-transform duration-300 overflow-hidden flex flex-col items-center justify-center border-4 border-dashed border-sky-300 hover:border-sky-400 hover:bg-sky-50 min-h-[224px]"
                onClick={() => setIsCreateModalOpen(true)}
                aria-label="Create a new story"
                role="button"
            >
                <div className="text-sky-500 group-hover:text-sky-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <p className="mt-4 text-lg font-bold text-gray-700">Create a New Story</p>
            </div>
        </div>
      </main>

       <footer className="text-center mt-8 sm:mt-12 pb-4 relative z-10">
          <div className="inline-block bg-amber-200/50 text-amber-900 font-semibold px-6 py-3 rounded-full shadow-md">
              <p>✨ Click on any word in a story to see a picture and hear how it's said!</p>
          </div>
      </footer>
    </div>
  );
};

export default App;