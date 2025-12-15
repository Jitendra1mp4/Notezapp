import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification channel for Android
const CHANNEL_ID = 'daily-reminders';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Set up notification channel for Android (required for Android 8.0+)
 */
const setupNotificationChannel = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false; // Notifications not supported on web
  }

  try {
    // Set up notification channel for Android
    await setupNotificationChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedule daily reminder notification
 */
export const scheduleDailyReminder = async (
  hour: number,
  minute: number
): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Ensure notification channel is set up
    await setupNotificationChannel();

    // Cancel all existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Calculate the next occurrence of the scheduled time for logging
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // If the time has already passed today, the next occurrence is tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Schedule new notification with explicit daily trigger
    // Note: DAILY type automatically repeats daily, no need for 'repeats' field
    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    };

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 Time to Journal',
        body: "Don't forget to write in your journal today!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'daily_reminder' },
      },
      trigger,
    });

    console.log(
      `Notification scheduled for ${hour}:${minute.toString().padStart(2, '0')} daily. Next occurrence: ${scheduledTime.toLocaleString()}`
    );

    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async (): Promise<
  Notifications.NotificationRequest[]
> => {
  if (Platform.OS === 'web') {
    return [];
  }

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};
