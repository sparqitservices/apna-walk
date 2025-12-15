
// Check if browser supports notifications
const isSupported = () => 'Notification' in window;

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isSupported()) return false;
  
  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendNotification = (title: string, body: string, icon: string = '/icon.png') => {
  if (!isSupported() || Notification.permission !== 'granted') return;

  // Mobile browsers might require a service worker for some features, 
  // but standard Notification API works for local triggers in active tabs.
  try {
      new Notification(title, {
          body,
          icon,
          badge: icon,
          vibrate: [200, 100, 200]
      } as any);
  } catch (e) {
      console.warn("Notification failed", e);
  }
};

export const scheduleReminders = (
    settings: { water: boolean, walk: boolean, breath: boolean },
    lastWaterTime: number,
    stepsToday: number
) => {
    const now = Date.now();
    const HOURS_2 = 2 * 60 * 60 * 1000;
    const HOURS_4 = 4 * 60 * 60 * 1000;

    // Water Reminder (Every 2 hours if not logged)
    if (settings.water && (now - lastWaterTime > HOURS_2)) {
        // We actually check this in the main loop, this function just generates the object
        sendNotification(
            "💧 Hydration Time!", 
            "It's been a while. Drink a glass of water to stay energetic."
        );
        return 'water_sent';
    }

    // Walk Reminder (If sedentary for 4 hours - purely time based mock here)
    // In a real app we'd track last step timestamp
    if (settings.walk && stepsToday < 1000 && new Date().getHours() > 10) {
        sendNotification(
            "🚶 Time to Move!", 
            "You haven't walked much today. Let's take a 5-minute stroll!"
        );
    }
    
    return null;
};