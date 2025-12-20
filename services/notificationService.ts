// Check if browser supports notifications
const isSupported = () => 'Notification' in window;

export const DESI_NOTIFICATIONS = {
    SEDENTARY: [
        { title: "Arre Boss, Utho! 🚶‍♂️", body: "Chair se chipak gaye ho kya? Chalo 5 min walk karlo!" },
        { title: "Break Toh Banta Hai! ☕", body: "Kaam chalta rahega, thoda tehel lo. Body ko recharge karo!" }
    ],
    GOAL_50: [
        { title: "Half Century! 🏏", body: "Shabaash! Aadhe raaste pahunch gaye. Ek number stamina hai!" }
    ],
    GOAL_100: [
        { title: "Jhandey Gaad Diye! 🎉", body: "100% Goal Complete! Aaj toh party banti hai!" }
    ],
    HYDRATION: [
        { title: "Engine Check! 💧", body: "Pani piyo mere bhai! Stamina engine ko fuel chahiye." },
        { title: "Galat Baat! 🥛", body: "Pani peena bhul gaye? Ek glass piyo aur fresh ho jao." }
    ],
    MORNING: [
        { title: "Suprabhat, Guru! ☀️", body: "Naya din, naya target. Chalo jootey pehno aur nikal pado!" }
    ]
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isSupported()) return false;
  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendNotification = (type: keyof typeof DESI_NOTIFICATIONS) => {
  if (!isSupported() || Notification.permission !== 'granted') return;

  const options = DESI_NOTIFICATIONS[type];
  const choice = options[Math.floor(Math.random() * options.length)];

  try {
      // Basic browser notification
      const n = new Notification(choice.title, {
          body: choice.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: type, // Prevents duplicate notifications of same type
          renotify: true
      } as any);

      // Play a subtle sound if possible
      if (typeof navigator.vibrate === 'function') {
          navigator.vibrate([200, 100, 200]);
      }
  } catch (e) {
      console.warn("Notification failed", e);
  }
};

/**
 * Logic to check if we should trigger a notification based on app state
 */
export const checkAndNotify = (
    currentSteps: number, 
    goal: number, 
    lastSteps: number, 
    lastNotifyTimes: Record<string, number>
) => {
    const now = Date.now();
    const results: Record<string, number> = { ...lastNotifyTimes };
    
    // 1. Goal Progress (One-time triggers)
    const progress = (currentSteps / goal) * 100;
    
    if (progress >= 100 && !lastNotifyTimes.goal_100) {
        sendNotification('GOAL_100');
        results.goal_100 = now;
    } else if (progress >= 50 && !lastNotifyTimes.goal_50) {
        sendNotification('GOAL_50');
        results.goal_50 = now;
    }

    // 2. Sedentary Check (Every 1 hour of no movement during 9 AM - 9 PM)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 21) {
        const timeSinceLastMove = now - (lastNotifyTimes.last_move_time || now);
        if (currentSteps === lastSteps && timeSinceLastMove > 3600000) { // 1 hour
            if (!lastNotifyTimes.last_sedentary_notify || (now - lastNotifyTimes.last_sedentary_notify > 7200000)) {
                sendNotification('SEDENTARY');
                results.last_sedentary_notify = now;
            }
        } else if (currentSteps > lastSteps) {
            results.last_move_time = now;
        }
    }

    // 3. Hydration (Every 3 hours)
    if (!lastNotifyTimes.last_hydration || (now - lastNotifyTimes.last_hydration > 10800000)) {
        sendNotification('HYDRATION');
        results.last_hydration = now;
    }

    return results;
};