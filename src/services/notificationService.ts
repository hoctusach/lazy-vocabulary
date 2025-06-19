
export interface NotificationOptions {
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSubscribed: boolean = false;
  private applicationServerPublicKey: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY; // VAPID key loaded from environment
  
  async initialize() {
    if (!this.applicationServerPublicKey) {
      console.warn('VAPID public key is missing. Push notification setup skipped.');
      return false;
    }
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
        console.log('Service Worker registered with scope:', registration.scope);
        
        this.checkSubscription();
        return true;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
      }
    } else {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }
  }
  
  private async checkSubscription() {
    if (!this.swRegistration) return;
    
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = !(subscription === null);
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  }
  
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
  
  async subscribe(): Promise<boolean> {
    if (!this.swRegistration) return false;
    if (!this.applicationServerPublicKey) {
      console.error('Cannot subscribe: VAPID public key is missing.');
      return false;
    }

    try {
      const applicationServerKey = this.urlB64ToUint8Array(this.applicationServerPublicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      
      console.log('User is subscribed:', subscription);
      this.isSubscribed = true;
      
      // In a real app, you would send the subscription to your server here
      localStorage.setItem('pushSubscription', JSON.stringify(subscription));
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
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
      console.error('Error unsubscribing:', error);
      return false;
    }
  }
  
  sendNotification(options: NotificationOptions): void {
    if (!this.swRegistration || !this.isSubscribed) {
      console.warn('Cannot send notification: not subscribed');
      return;
    }
    
    // In a real app, you would send this to your server which would then send the push notification
    // Here we'll simulate it with a local notification if we have permission
    if (Notification.permission === 'granted') {
      this.swRegistration.showNotification(options.title, {
        body: options.body,
        icon: '/favicon.ico',
        data: options.data
      });
    }
  }
  
  // Helper function to convert base64 to Uint8Array
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
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }
  
  get notificationPermission(): NotificationPermission | null {
    return 'Notification' in window ? Notification.permission : null;
  }
  
  get subscribed(): boolean {
    return this.isSubscribed;
  }
  
  async scheduleVocabularyNotification(word: string, meaning: string): Promise<boolean> {
    if (!this.isSubscribed) return false;
    
    this.sendNotification({
      title: word,
      body: meaning,
      data: { url: window.location.href }
    });
    
    return true;
  }
}

export const notificationService = new NotificationService();
