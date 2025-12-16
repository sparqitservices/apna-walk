
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
    lastTimes: { water: number, walk: number, breath: number },
    stepsToday: number
): string[] => {
    const now = Date.now();
    const triggered: string[] = [];
    
    // Constants for Intervals
    const HOURS_2 = 2 * 60 * 60 * 1000;
    const HOURS_3 = 3 * 60 * 60 * 1000;
    const HOURS_4 = 4 * 60 * 60 * 1000;

    // 1. Water Reminder (Every 2 hours)
    if (settings.water && (now - lastTimes.water > HOURS_2)) {
        sendNotification(
            "💧 Hydration Check", 
            "Time to drink a glass of water and stay energetic!"
        );
        triggered.push('water');
    }

    // 2. Breath Exercise (Every 3 hours)
    if (settings.breath && (now - lastTimes.breath > HOURS_3)) {
        sendNotification(
            "🧘 Breathe & Relax", 
            "Take a moment to center yourself with a quick breathing exercise."
        );
        triggered.push('breath');
    }

    // 3. Walk Reminder (Every 4 hours if sedentary)
    // We check if 4 hours passed. Then we check if user has moved enough today.
    // If they have < 3000 steps by the check time, we nudge them.
    if (settings.walk && (now - lastTimes.walk > HOURS_4)) {
        if (stepsToday < 3000) {
            sendNotification(
                "🚶 Time to Move!", 
                "You haven't moved much lately. Let's take a 5-minute stroll!"
            );
            triggered.push('walk');
        } else {
            // Even if we don't send a notification (because they are active), 
            // we treat this as "checked" so we don't spam them immediately again.
            // We push a special tag or just 'walk' to reset the timer.
            triggered.push('walk');
        }
    }
    
    return triggered;
};
