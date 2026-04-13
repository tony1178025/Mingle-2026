"use client";

import { useState } from "react";
import { Button } from "@/components/shared/ui";
import { uploadProfilePhotoFile } from "@/lib/storage/profile-upload";

export function ProfilePhotoUploader({
  value,
  onChange
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="field field-span-2">
      <span>프로필 사진</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          setIsUploading(true);
          setError(null);

          try {
            const uploadedUrl = await uploadProfilePhotoFile(file);
            onChange(uploadedUrl);
          } catch (uploadError) {
            setError(
              uploadError instanceof Error
                ? uploadError.message
                : "프로필 사진 업로드에 실패했습니다."
            );
          } finally {
            setIsUploading(false);
            event.target.value = "";
          }
        }}
        data-testid="profile-photo-file"
      />
      {value ? (
        <div className="upload-preview">
          <img src={value} alt="프로필 사진 미리보기" className="upload-preview-image" />
        </div>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
      <Button variant="ghost" type="button" disabled={isUploading} onClick={() => value && onChange("")}>
        {value ? "사진 지우기" : isUploading ? "업로드 중..." : "사진 업로드"}
      </Button>
    </div>
  );
}
