
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, VolumeX, Volume2, Mic, Globe } from "lucide-react";
import React from "react";

interface VocabularyControlsProps {
  mute: boolean;
  isPaused: boolean;
  isSoundPlaying: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onNext: () => void;
  onPlay?: () => void; // Added play handler
  onChangeVoice: () => void;
  onSwitchCategory: () => void;
  currentCategory: string;
  nextCategory: string;
  voiceOption: string;
  displayTime?: number;
}

const VocabularyControls: React.FC<VocabularyControlsProps> = ({
  mute,
  isPaused,
  isSoundPlaying,
  onToggleMute,
  onTogglePause,
  onNext,
  onPlay, // New play handler
  onChangeVoice,
  onSwitchCategory,
  currentCategory,
  nextCategory,
  voiceOption,
  displayTime = 0,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {/* Sound controls */}
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleMute}
            title={mute ? "Unmute" : "Mute"}
            aria-label={mute ? "Unmute" : "Mute"}
          >
            {mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {/* Pause/Play toggle button */}
          <Button
            variant={isPaused ? "default" : "outline"}
            size="icon"
            onClick={onTogglePause}
            title={isPaused ? "Resume" : "Pause"}
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          
          {/* Explicit Play button for direct user interaction */}
          {onPlay && (
            <Button
              variant="default"
              size="icon"
              onClick={onPlay}
              title="Play Current Word"
              aria-label="Play Current Word"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}

          {/* Next button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            title="Next Word"
            aria-label="Next Word"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          {/* Voice toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeVoice}
            title="Change Voice"
            aria-label="Change Voice"
            className="text-xs px-2 py-1 h-9"
          >
            <Mic className="h-4 w-4 mr-1" />
            <span>{voiceOption}</span>
          </Button>

          {/* Category switch button */}
          {nextCategory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchCategory}
              title={`Switch to ${nextCategory}`}
              aria-label={`Switch to ${nextCategory}`}
              className="text-xs px-2 py-1 h-9"
            >
              <Globe className="h-4 w-4 mr-1" />
              <span>
                {currentCategory !== "All words"
                  ? `Switch to ${nextCategory}`
                  : nextCategory}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Display time indicator */}
      {displayTime > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${Math.min(100, (displayTime / 10) * 100)}%`,
              transition: "width 0.5s linear",
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default VocabularyControls;
