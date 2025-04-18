
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { notificationService } from '@/services/notificationService';
import { BellRing, BellOff, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationManagerProps {
  onNotificationsEnabled: () => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ onNotificationsEnabled }) => {
  const [status, setStatus] = useState<'unsupported' | 'denied' | 'default' | 'granted'>('default');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!notificationService.isNotificationsSupported) {
        setStatus('unsupported');
        return;
      }
      
      const initialized = await notificationService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        const permission = notificationService.notificationPermission;
        setStatus(permission || 'default');
        setIsSubscribed(notificationService.subscribed);
        
        if (permission === 'granted' && notificationService.subscribed) {
          onNotificationsEnabled();
        }
      }
    };
    
    initializeNotifications();
  }, [onNotificationsEnabled]);
  
  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setStatus(granted ? 'granted' : 'denied');
    
    if (granted) {
      const subscribed = await notificationService.subscribe();
      setIsSubscribed(subscribed);
      
      if (subscribed) {
        onNotificationsEnabled();
      }
    }
  };
  
  const toggleSubscription = async (checked: boolean) => {
    if (checked) {
      const subscribed = await notificationService.subscribe();
      setIsSubscribed(subscribed);
      
      if (subscribed) {
        onNotificationsEnabled();
      }
    } else {
      const unsubscribed = await notificationService.unsubscribe();
      setIsSubscribed(!unsubscribed);
    }
  };
  
  if (status === 'unsupported') {
    return (
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellOff size={20} className="mr-2 text-muted-foreground" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Try using a modern browser like Chrome, Edge, or Firefox to enable vocabulary notifications.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BellRing size={20} className="mr-2 text-primary" />
          Vocabulary Notifications
        </CardTitle>
        <CardDescription>
          Enable notifications to receive vocabulary words even when the browser is minimized.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'default' && (
          <div className="space-y-4">
            <p className="text-sm">
              Notifications allow you to receive vocabulary reminders even when this tab is closed or your browser is minimized.
            </p>
            <Button onClick={requestPermission} className="w-full">
              Enable Notifications
            </Button>
          </div>
        )}
        
        {status === 'denied' && (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              Notification permission was denied. Please enable notifications in your browser settings to receive vocabulary reminders.
            </p>
          </div>
        )}
        
        {status === 'granted' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch 
                id="notifications" 
                checked={isSubscribed} 
                onCheckedChange={toggleSubscription} 
              />
              <label htmlFor="notifications" className="text-sm font-medium">
                Receive vocabulary notifications
              </label>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    You'll receive notifications with vocabulary words even when this browser tab is closed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationManager;
