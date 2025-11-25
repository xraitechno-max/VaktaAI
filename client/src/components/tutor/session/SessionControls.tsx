import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  MessageSquareOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  X,
  Phone,
  Settings,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface SessionControlsProps {
  showChat: boolean;
  isMuted: boolean;
  showCamera: boolean;
  onToggleChat: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndSession: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

export default function SessionControls({
  showChat,
  isMuted,
  showCamera,
  onToggleChat,
  onToggleMute,
  onToggleCamera,
  onEndSession,
  onToggleFullscreen,
  isFullscreen = false,
  className = "",
}: SessionControlsProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-all ${
          showChat
            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        onClick={onToggleChat}
        data-testid="button-toggle-chat"
      >
        {showChat ? (
          <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5" />
        ) : (
          <MessageSquareOff className="w-4 h-4 lg:w-5 lg:h-5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-all ${
          !isMuted
            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        onClick={onToggleMute}
        data-testid="button-toggle-mute"
      >
        {!isMuted ? (
          <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />
        ) : (
          <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-all ${
          showCamera
            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        onClick={onToggleCamera}
        data-testid="button-toggle-camera"
      >
        {showCamera ? (
          <Video className="w-4 h-4 lg:w-5 lg:h-5" />
        ) : (
          <VideoOff className="w-4 h-4 lg:w-5 lg:h-5" />
        )}
      </Button>

      {onToggleFullscreen && (
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 lg:w-10 lg:h-10 rounded-full text-white/60 hover:text-white hover:bg-white/10"
          onClick={onToggleFullscreen}
          data-testid="button-toggle-fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 lg:w-5 lg:h-5" />
          ) : (
            <Maximize2 className="w-4 h-4 lg:w-5 lg:h-5" />
          )}
        </Button>
      )}

      <Separator orientation="vertical" className="h-6 bg-white/20 mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
        onClick={onEndSession}
        data-testid="button-end-session"
      >
        <X className="w-4 h-4 lg:w-5 lg:h-5" />
      </Button>
    </div>
  );
}
