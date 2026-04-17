import { PSYCHOLOGIST_PUBLIC_SELECT } from './psychologist-select.constant';

export const DETAIL_SELECT = {
  ...PSYCHOLOGIST_PUBLIC_SELECT,
  psychologist_createdAt: true,
  psychologist_updatedAt: true,
  psychologist_user: {
    select: {
      user_id: true,
      user_username: true,
      user_name: true,
      user_email: true,
      user_phone: true,
      user_photos: true,
      user_isActive: true,
    },
  },
};
