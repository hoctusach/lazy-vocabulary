
export interface NotificationOptions {
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSubscribed: boolean = false;
  private applicationServerPublicKey: string | undefined;
  
  constructor() {
    // Only load VAPID key in browser environment
    this.applicationServerPublicKey = typeof window !== 'undefined' 
      ? import.meta.env.VITE_VAPID_PUBLIC_KEY 
      : undefined;
  }
  
  async initialize(): Promise<boolean> {
    // Skip initialization in non-browser environments
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    if (!this.applicationServerPublicKey) {
      console.log('VAPID public key not configured - push notifications disabled');
      return false;
    }
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
        console.log('Service Worker registered successfully');
        
        await this.checkSubscription();
        return true;
      } catch (error) {
        console.log('Service Worker registration skipped:', error);
        return false;
      }
    } else {
      console.log('Push notifications not supported');
      return false;
    }
  }
  
  private async checkSubscription(): Promise<void> {
    if (!this.swRegistration) return;
    
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = subscription !== null;
    } catch (error) {
      console.log('Subscription check failed:', error);
      this.isSubscribed = false;
    }
  }
  
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.log('Permission request failed:', error);
      return false;
    }
  }
  
  async subscribe(): Promise<boolean> {
    if (!this.swRegistration || !this.applicationServerPublicKey) {
      return false;
    }

    try {
      const applicationServerKey = this.urlB64ToUint8Array(this.applicationServerPublicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      
      this.isSubscribed = true;
      localStorage.setItem('pushSubscription', JSON.stringify(subscription));
      return true;
    } catch (error) {
      console.log('Subscription failed:', error);
      return false;
    }
  }
  
  async unsubscribe(): Promise<boolean> {
    if (!this.swRegistration) return false;
    
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        this.isSubscribed = false;
        localStorage.removeItem('pushSubscription');
        return true;
      }
      return false;
    } catch (error) {
      console.log('Unsubscribe failed:', error);
      return false;
    }
  }
  
  sendNotification(options: NotificationOptions): void {
    if (!this.swRegistration || !this.isSubscribed) {
      console.log('Cannot send notification: not properly initialized');
      return;
    }
    
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      this.swRegistration.showNotification(options.title, {
        body: options.body,
        icon: '/favicon.ico',
        data: options.data
      }).catch(error => {
        console.log('Notification display failed:', error);
      });
    }
  }
  
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  get isNotificationsSupported(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }
  
  get notificationPermission(): NotificationPermission | null {
    return typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : null;
  }
  
  get subscribed(): boolean {
    return this.isSubscribed;
  }
  
  async scheduleVocabularyNotification(word: string, meaning: string): Promise<boolean> {
    if (!this.isSubscribed) return false;
    
    this.sendNotification({
      title: word,
      body: meaning,
      data: { url: typeof window !== 'undefined' ? window.location.href : '/' }
    });
    
    return true;
  }
}

export const notificationService = new NotificationService();
