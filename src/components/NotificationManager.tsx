import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VocabularyWord } from '@/types/vocabulary';
import { speak, formatSpeechText } from '@/utils/speech';

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  const result = await Notification.requestPermission();
  return result;
};

interface NotificationManagerProps {
  onNotificationsEnabled: () => void;
  currentWord?: VocabularyWord | null;
  voiceRegion?: 'US' | 'UK' | 'AU';
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ 
  onNotificationsEnabled,
  currentWord,
  voiceRegion = 'US'
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<string>('default');
  const { toast } = useToast();
  
  useEffect(() => {
    const checkPermission = async () => {
      if ('Notification' in window) {
        const permission = Notification.permission;
        setPermissionState(permission);
        setNotificationsEnabled(permission === 'granted');
      } else {
        setPermissionState('unsupported');
      }
    };
    
    checkPermission();
  }, []);
  
  useEffect(() => {
    if (notificationsEnabled) {
      const registerServiceWorker = async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        }
      };
      
      registerServiceWorker();
    }
  }, [notificationsEnabled]);
  
  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    
    setPermissionState(permission);
    
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      onNotificationsEnabled();
      
      const notification = new Notification('Vocabulary Notifications Enabled', {
        body: 'You will now receive vocabulary notifications.',
        icon: '/favicon.ico'
      });
      
      setTimeout(() => notification.close(), 4000);
      
    } else if (permission === 'denied') {
      toast({
        title: "Notification Permission Denied",
        description: "Please enable notifications in your browser settings to receive vocabulary reminders.",
        variant: "destructive",
      });
    } else if (permission === 'unsupported') {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
    }
  };
  
  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    toast({
      title: "Notifications Disabled",
      description: "You will no longer receive vocabulary notifications.",
    });
  };
  
  const showVocabularyNotification = () => {
    if (!notificationsEnabled || !currentWord) return;
    
    const { word, meaning, example } = currentWord;
    
    const notification = new Notification(`Vocabulary: ${word}`, {
      body: `${meaning}\n\nExample: ${example}`,
      icon: '/favicon.ico',
      silent: false
    });
    
    notification.onclick = async () => {
      notification.close();
      const fullText = formatSpeechText({ word, meaning, example });
      await speak(fullText);
    };
    
    setTimeout(() => {
      notification.close();
    }, 10000);
  };
  
  useEffect(() => {
    if (currentWord && notificationsEnabled) {
      const timer = setTimeout(() => {
        showVocabularyNotification();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, notificationsEnabled]);
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardContent className="p-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Notifications</h2>
          
          <p className="text-sm text-gray-500">
            {notificationsEnabled
              ? "Vocabulary notifications are enabled. You'll receive notifications even when the browser is minimized."
              : "Enable notifications to receive vocabulary reminders even when your browser is minimized."}
          </p>
          
          <Button
            variant={notificationsEnabled ? "outline" : "default"}
            className="w-full flex justify-center items-center gap-2"
            onClick={notificationsEnabled ? handleDisableNotifications : handleEnableNotifications}
            disabled={permissionState === 'unsupported'}
          >
            {notificationsEnabled ? (
              <>
                <BellOff size={16} /> Disable Notifications
              </>
            ) : (
              <>
                <Bell size={16} /> Enable Notifications
              </>
            )}
          </Button>
          
          {permissionState === 'unsupported' && (
            <p className="text-xs text-red-500 mt-2">
              Your browser doesn't support notifications.
            </p>
          )}
          
          {permissionState === 'denied' && (
            <p className="text-xs text-amber-500 mt-2">
              Notification permission was denied. You need to enable notifications in your browser settings.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationManager;
