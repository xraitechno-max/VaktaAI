import { forwardRef, useState } from "react";
import { Loader2, AlertCircle, CheckCircle, Mic, MicOff } from "lucide-react";
import UnityAvatar, { UnityAvatarHandle } from "../UnityAvatar";

interface MentorStageProps {
  avatarReady: boolean;
  avatarLoading: boolean;
  avatarError: string | null;
  isListening?: boolean;
  isSpeaking?: boolean;
  mentorName?: string;
  onAvatarReady: () => void;
  onAvatarError: (error: string) => void;
  onMessage?: (message: any) => void;
  className?: string;
}

const MentorStage = forwardRef<UnityAvatarHandle, MentorStageProps>(
  (
    {
      avatarReady,
      avatarLoading,
      avatarError,
      isListening = false,
      isSpeaking = false,
      mentorName = "Garima",
      onAvatarReady,
      onAvatarError,
      onMessage,
      className = "",
    },
    ref
  ) => {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <div className="relative w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
          
          {avatarLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
              <div className="text-center px-4">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/30" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                  <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <p className="text-white/90 text-base font-medium">Loading {mentorName}...</p>
                <p className="text-white/50 text-sm mt-1">Preparing your AI mentor</p>
              </div>
            </div>
          )}
          
          {avatarError && !avatarLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
              <div className="text-center px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-white/90 text-base font-medium">Avatar Unavailable</p>
                <p className="text-white/50 text-sm mt-1 max-w-xs">{avatarError}</p>
              </div>
            </div>
          )}
          
          <UnityAvatar
            ref={ref}
            className="w-full h-full"
            defaultAvatar="priya"
            onReady={onAvatarReady}
            onError={onAvatarError}
            onMessage={onMessage}
          />
          
          {avatarReady && (
            <div className="absolute top-3 right-3 lg:top-4 lg:right-4 z-30">
              <div className={`px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 ${
                isSpeaking 
                  ? 'bg-blue-500/20 border-blue-400/30' 
                  : 'bg-green-500/20 border-green-400/30'
              }`}>
                {isSpeaking ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-medium text-blue-300">Speaking</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-green-300">Ready</span>
                  </>
                )}
              </div>
            </div>
          )}

          {isListening && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 lg:bottom-4 z-30">
              <div className="px-4 py-2 rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 flex items-center gap-2">
                <div className="relative">
                  <Mic className="w-4 h-4 text-red-400" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                </div>
                <span className="text-sm font-medium text-red-300">Listening...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MentorStage.displayName = "MentorStage";

export default MentorStage;
