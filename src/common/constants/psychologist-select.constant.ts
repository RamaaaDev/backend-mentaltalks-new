export const PSYCHOLOGIST_PUBLIC_SELECT = {
  psychologist_id: true,
  psychologist_name: true,
  psychologist_bio: true,
  psychologist_sipp: true,
  psychologist_location: true,
  psychologist_sessionDone: true,
  psychologist_quotes: true,
  psychologist_specialties: true,
  psychologist_yearsExperience: true,
  psychologist_rating: true,
  psychologist_ratingsCount: true,
  psychologist_education: true,
  psychologist_user: {
    select: {
      user_photos: true,
      user_isActive: true,
    },
  },
  _count: {
    select: {
      pscyhologist_article: true,
    },
  },
};
