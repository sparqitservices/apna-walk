// Check if browser supports notifications
const isSupported = () => 'Notification' in window;

/**
 * MANUAL VAULT: Edit these texts if you want to change them manually.
 * They are used as fallbacks if the AI is busy or user is offline.
 */
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

/**
 * Sends a notification. 
 * If aiOverride is provided, it uses that text. 
 * Otherwise, it picks a random one from the manual vault.
 */
export const sendNotification = (
    type: keyof typeof DESI_NOTIFICATIONS, 
    aiOverride?: { title: string, body: string }
) => {
  if (!isSupported() || Notification.permission !== 'granted') return;

  let title = "";
  let body = "";

  if (aiOverride && aiOverride.title && aiOverride.body) {
      title = aiOverride.title;
      body = aiOverride.body;
  } else {
      const options = DESI_NOTIFICATIONS[type];
      const choice = options[Math.floor(Math.random() * options.length)];
      title = choice.title;
      body = choice.body;
  }

  try {
      new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: type,
          renotify: true
      } as any);

      if (typeof navigator.vibrate === 'function') {
          navigator.vibrate([200, 100, 200]);
      }
  } catch (e) {
      console.warn("Notification failed", e);
  }
};