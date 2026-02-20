import { ImageModelType, VideoModelType } from './types';

// 管理员手机号白名单
export const ADMIN_PHONES: string[] = [
  '18112521254',
];

// 管理员邮箱白名单
export const ADMIN_EMAILS: string[] = [
  'admin@smileai.studio',
];

export const IMAGE_MODELS: { id: ImageModelType; label: string; comingSoon?: boolean }[] = [
  { id: 'seedream', label: 'Seedream 4.5' },
  { id: 'banana', label: 'Banana Pro (香蕉)', comingSoon: true },
];

export const VIDEO_MODELS: { id: VideoModelType; label: string }[] = [
  { id: 'seedance', label: 'Seedance' },
  { id: 'kling', label: 'Kling AI (可灵)' },
  { id: 'wan', label: 'Wan' },
  { id: 'minimax', label: 'Minimax' },
  { id: 'runway', label: 'Runway' },
  { id: 'pixverse', label: 'PixVerse v5' },
  { id: 'ltx', label: 'LTX' },
];