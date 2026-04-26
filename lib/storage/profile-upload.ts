import type { ProfileUploadResponse } from "@/types/mingle";
import {
  PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE,
  PROFILE_PHOTO_UPLOAD_FAILED_FALLBACK_MESSAGE
} from "@/lib/storage/upload-messages";

export {
  PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE,
  PROFILE_PHOTO_UPLOAD_FAILED_FALLBACK_MESSAGE
} from "@/lib/storage/upload-messages";

export async function requestProfileUploadUrl(
  file: File,
  contentType: string,
  profileSubjectId: string
): Promise<ProfileUploadResponse> {
  const response = await fetch("/api/uploads/presigned-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType,
      profileSubjectId
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "프로필 사진 업로드 URL을 생성하지 못했습니다.");
  }

  return (await response.json()) as ProfileUploadResponse;
}

export async function uploadProfilePhotoFile(
  file: File,
  options: { profileSubjectId: string }
): Promise<{
  photoUrl: string;
  usedFallback: boolean;
  helperMessage?: string;
}> {
  const payload = await requestProfileUploadUrl(
    file,
    file.type || "application/octet-stream",
    options.profileSubjectId
  );
  if (!payload.uploadEnabled) {
    return {
      photoUrl: "",
      usedFallback: true,
      helperMessage: payload.helperMessage || PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE
    };
  }

  const uploadResponse = await fetch(payload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error("프로필 사진 업로드에 실패했습니다.");
  }

  return {
    photoUrl: payload.assetUrl,
    usedFallback: false
  };
}
