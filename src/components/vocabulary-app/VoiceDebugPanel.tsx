
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { mobileVoiceManager } from '@/services/speech/mobileVoiceManager';
import { isMobileChrome } from '@/utils/speech/mobileVoiceDetection';

interface VoiceDebugPanelProps {
  currentRegion: 'US' | 'UK';
  onClose: () => void;
}

const VoiceDebugPanel: React.FC<VoiceDebugPanelProps> = ({ currentRegion, onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDebugInfo = async () => {
    setIsRefreshing(true);
    
    try {
      // Get comprehensive debug info
      const speechDebug = directSpeechService.getDebugInfo();
      const voiceManagerDebug = mobileVoiceManager.getDebugInfo();
      const allVoicesList = mobileVoiceManager.getAllVoices();
      
      const usVoiceInfo = directSpeechService.getCurrentVoiceInfo('US');
      const ukVoiceInfo = directSpeechService.getCurrentVoiceInfo('UK');
      
      setDebugInfo({
        isMobileChrome: isMobileChrome(),
        speechService: speechDebug,
        voiceManager: voiceManagerDebug,
        currentVoices: {
          US: usVoiceInfo,
          UK: ukVoiceInfo
        },
        synthesizerState: {
          pending: window.speechSynthesis?.pending || false,
          speaking: window.speechSynthesis?.speaking || false,
          paused: window.speechSynthesis?.paused || false
        }
      });
      
      setAllVoices(allVoicesList);
      
    } catch (error) {
      console.error('Error refreshing debug info:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshVoices = async () => {
    setIsRefreshing(true);
    mobileVoiceManager.refreshVoices();
    await mobileVoiceManager.initialize();
    await refreshDebugInfo();
  };

  useEffect(() => {
    refreshDebugInfo();
  }, [currentRegion]);

  if (!debugInfo) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-4">
          <div className="text-center">Loading debug info...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Voice Debug Panel</CardTitle>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshDebugInfo}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefreshVoices}
            disabled={isRefreshing}
          >
            Reload Voices
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Environment Info */}
        <div>
          <h3 className="font-semibold mb-2">Environment</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Mobile Chrome: <Badge variant={debugInfo.isMobileChrome ? "default" : "secondary"}>
              {debugInfo.isMobileChrome ? "Yes" : "No"}
            </Badge></div>
            <div>Service Initialized: <Badge variant={debugInfo.speechService.isInitialized ? "default" : "destructive"}>
              {debugInfo.speechService.isInitialized ? "Yes" : "No"}
            </Badge></div>
          </div>
        </div>

        {/* Current Voice Selection */}
        <div>
          <h3 className="font-semibold mb-2">Current Voice Selection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['US', 'UK'].map((region) => {
              const voiceInfo = debugInfo.currentVoices[region];
              return (
                <div key={region} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{region} Voice</h4>
                    <Badge variant={region === currentRegion ? "default" : "secondary"}>
                      {region === currentRegion ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={voiceInfo.isValid ? "default" : "destructive"}>
                      {voiceInfo.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Name:</strong> {voiceInfo.name}</div>
                    <div><strong>Lang:</strong> {voiceInfo.lang}</div>
                    <div><strong>Local:</strong> {voiceInfo.localService ? "Yes" : "No"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speech Synthesizer State */}
        <div>
          <h3 className="font-semibold mb-2">Speech Synthesizer State</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>Pending: <Badge variant={debugInfo.synthesizerState.pending ? "destructive" : "default"}>
              {debugInfo.synthesizerState.pending ? "Yes" : "No"}
            </Badge></div>
            <div>Speaking: <Badge variant={debugInfo.synthesizerState.speaking ? "default" : "secondary"}>
              {debugInfo.synthesizerState.speaking ? "Yes" : "No"}
            </Badge></div>
            <div>Paused: <Badge variant={debugInfo.synthesizerState.paused ? "destructive" : "default"}>
              {debugInfo.synthesizerState.paused ? "Yes" : "No"}
            </Badge></div>
          </div>
        </div>

        {/* Available Voices */}
        <div>
          <h3 className="font-semibold mb-2">Available Voices ({allVoices.length})</h3>
          <div className="max-h-60 overflow-y-auto border rounded p-2">
            {allVoices.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No voices loaded</div>
            ) : (
              <div className="space-y-2">
                {allVoices.map((voice, index) => (
                  <div key={index} className="flex items-center justify-between text-sm border-b pb-1">
                    <div>
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-muted-foreground">{voice.lang}</div>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {voice.localService ? "Local" : "Remote"}
                      </Badge>
                      {voice.lang.startsWith('en') && (
                        <Badge variant="secondary" className="text-xs">English</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceDebugPanel;
