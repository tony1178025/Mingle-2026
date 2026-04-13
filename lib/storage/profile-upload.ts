export interface ProfileUploadPayload {
  uploadUrl: string;
  assetUrl: string;
  key: string;
}

export async function requestProfileUploadUrl(file: File): Promise<ProfileUploadPayload> {
  const response = await fetch("/api/uploads/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream"
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "프로필 사진 업로드 URL을 생성하지 못했습니다.");
  }

  return (await response.json()) as ProfileUploadPayload;
}

export async function uploadProfilePhotoFile(file: File) {
  const payload = await requestProfileUploadUrl(file);

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

  return payload.assetUrl;
}
