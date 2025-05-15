
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
      <div className="flex justify-between">
        {/* Left controls group - simplified based on image */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleMute}
            title={mute ? "Unmute" : "Mute"}
            aria-label={mute ? "Unmute" : "Mute"}
          >
            {mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={onTogglePause}
            title={isPaused ? "Resume" : "Pause"}
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          
          {/* Prominent Play button for direct user interaction */}
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

        {/* Right controls group - simplified based on image */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onChangeVoice}
            title="Change Voice"
            className="text-xs px-3 h-9"
          >
            <Mic className="h-4 w-4 mr-1" />
            <span>{voiceOption}</span>
          </Button>

          {nextCategory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchCategory}
              title={`Switch to ${nextCategory}`}
              className="text-xs px-3 h-9"
            >
              <Globe className="h-4 w-4 mr-1" />
              <span>
                {`Switch to ${nextCategory}`}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {displayTime > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{
              width: `${Math.min(100, (displayTime / 10) * 100)}%`,
              transition: "width 0.5s linear",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VocabularyControls;
