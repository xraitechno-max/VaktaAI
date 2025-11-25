/**
 * 🎭 Unity Avatar Context - Global Persistent Avatar
 * Renders Unity avatar once globally, keeps it alive across routes for instant access
 */

import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import UnityAvatar, { UnityAvatarHandle } from '@/components/tutor/UnityAvatar';

interface UnityAvatarContextValue {
  avatarRef: React.RefObject<UnityAvatarHandle>;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  isVisible: boolean;
  isAudioUnlocked: boolean;
  setIsVisible: (visible: boolean) => void;
  displayInViewport: boolean;  // 🎬 Control avatar viewport visibility
  setDisplayInViewport: (display: boolean) => void;
  preloadAvatar: () => Promise<void>;  // 🎭 Preload avatar function
}

const UnityAvatarContext = createContext<UnityAvatarContextValue | null>(null);

interface UnityAvatarProviderProps {
  children: ReactNode;
}

export function UnityAvatarProvider({ children }: UnityAvatarProviderProps) {
  const avatarRef = useRef<UnityAvatarHandle>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [displayInViewport, setDisplayInViewport] = useState(false);  // 🎬 Show avatar in main area

  const handleReady = () => {
    console.log('[Unity Context] ✅ Avatar ready globally!');
    setIsReady(true);
    setIsLoading(false);
  };

  const handleError = (errorMsg: string) => {
    console.error('[Unity Context] ❌ Avatar error:', errorMsg);
    setError(errorMsg);
    setIsLoading(false);
  };

  // 🎭 Preload avatar function - triggers early loading
  const preloadAvatar = async () => {
    console.log('[Unity Context] 🎬 Preload triggered - avatar should already be mounting...');
    
    // If already ready, resolve immediately
    if (isReady) {
      console.log('[Unity Context] ✅ Avatar already ready!');
      return Promise.resolve();
    }
    
    // If loading, wait for ready
    if (isLoading && !error) {
      console.log('[Unity Context] ⏳ Avatar is loading, waiting for ready...');
      return new Promise<void>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (isReady) {
            clearInterval(checkInterval);
            console.log('[Unity Context] ✅ Avatar preload complete!');
            resolve();
          } else if (error) {
            clearInterval(checkInterval);
            console.error('[Unity Context] ❌ Avatar preload failed:', error);
            reject(new Error(error));
          }
        }, 100);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('[Unity Context] ⚠️ Avatar preload timeout');
          resolve(); // Resolve anyway, will load in session
        }, 30000);
      });
    }
    
    return Promise.resolve();
  };

  return (
    <UnityAvatarContext.Provider 
      value={{ 
        avatarRef, 
        isReady, 
        isLoading, 
        error, 
        isVisible, 
        isAudioUnlocked,
        setIsVisible,
        displayInViewport,
        setDisplayInViewport,
        preloadAvatar
      }}
    >
      {/* 🎭 Global Unity Avatar - Disabled to avoid duplicate loading */}
      {/* Pages (Landing.tsx, TutorSession.tsx) render their own UnityAvatar locally */}
      <div 
        id="global-unity-container" 
        className="fixed pointer-events-none"
        style={{ 
          display: 'none'
        }}
        data-testid="global-avatar-unity-container"
      >
        {/* Avatar removed to prevent duplicate 97MB downloads */}
      </div>
      
      {children}
    </UnityAvatarContext.Provider>
  );
}

export function useUnityAvatar() {
  const context = useContext(UnityAvatarContext);
  if (!context) {
    throw new Error('useUnityAvatar must be used within UnityAvatarProvider');
  }
  return context;
}
