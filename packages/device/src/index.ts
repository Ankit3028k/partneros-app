export type { Permission, PermissionStatus } from './permissions/Permission';
export { PermissionManager, permissionManager } from './PermissionManager';

export { DevicePackageManager, devicePackageManager, KNOWN_PACKAGES } from './PackageManager';
export { ContactResolver, contactResolver } from './ContactResolver';
export type { ResolvedContact, ContactMatch } from './ContactResolver';
export { IntentRouter, intentRouter } from './IntentRouter';
export { AppLauncher, appLauncher } from './AppLauncher';

export type { DeviceAction, DeviceActionResult } from './actions/DeviceAction';
export { whatsappAction, WhatsAppAction } from './actions/whatsapp';
export type { WhatsAppParams } from './actions/whatsapp';
export { callAction, CallAction } from './actions/call';
export { smsAction, SmsAction } from './actions/sms';
export { mapsAction, MapsAction } from './actions/maps';
export { alarmAction, AlarmAction } from './actions/alarm';
export { calendarAction, CalendarAction } from './actions/calendar';
export { flashlightAction, FlashlightAction } from './actions/flashlight';
export { browserAction, BrowserAction } from './actions/browser';
export { spotifyAction, SpotifyAction } from './actions/spotify';
export { instagramAction, InstagramAction } from './actions/instagram';
export { telegramAction, TelegramAction } from './actions/telegram';
export { cameraAction, CameraAction } from './actions/camera';
export { phoneAction, PhoneAction } from './actions/phone';

export { DeviceExecutor, deviceExecutor } from './executor/DeviceExecutor';
export type { ExecutionPlan } from './executor/DeviceExecutor';
