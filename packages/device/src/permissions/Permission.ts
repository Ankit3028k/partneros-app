export type Permission =
  | 'CONTACTS'
  | 'CALL_PHONE'
  | 'SEND_SMS'
  | 'CAMERA'
  | 'LOCATION'
  | 'ACCESSIBILITY_SERVICE'
  | 'CALENDAR'
  | 'MICROPHONE';

export interface PermissionStatus {
  permission: Permission;
  granted: boolean;
}
