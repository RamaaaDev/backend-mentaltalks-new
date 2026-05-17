export interface UploadedFileResult {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export interface UpdateAvatarResponse {
  message: string;
  avatarUrl: string;
}
