"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/ui";
import { DEFAULT_AVATAR_BY_GENDER, type ParticipantGender } from "@/types/mingle";
import { preprocessProfileSquareImage } from "@/lib/images/preprocess-profile-square";
import {
  PROFILE_PHOTO_UPLOAD_FAILED_FALLBACK_MESSAGE,
  PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE,
  uploadProfilePhotoFile
} from "@/lib/storage/profile-upload";

export function ProfilePhotoUploader({
  profileSubjectId,
  avatarGender,
  value,
  onChange
}: {
  profileSubjectId: string;
  avatarGender: ParticipantGender;
  value: string;
  onChange: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectPreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const defaultAvatarUrl = DEFAULT_AVATAR_BY_GENDER[avatarGender];
  const hasCustomImage = Boolean(localPreviewUrl || value);
  const displayUrl = localPreviewUrl || value || defaultAvatarUrl;

  return (
    <div className="field field-span-2">
      <span>프로필 사진</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={isUploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          revokeObjectPreview();
          setIsUploading(true);
          setError(null);
          setHelperMessage(null);

          try {
            const { file: processed } = await preprocessProfileSquareImage(file);
            const nextPreview = URL.createObjectURL(processed);
            objectUrlRef.current = nextPreview;
            setLocalPreviewUrl(nextPreview);

            const result = await uploadProfilePhotoFile(processed, {
              profileSubjectId
            });
            onChange(result.photoUrl);
            revokeObjectPreview();
            if (result.usedFallback) {
              setHelperMessage(result.helperMessage ?? PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE);
            }
          } catch (uploadError) {
            revokeObjectPreview();
            onChange("");
            setHelperMessage(PROFILE_PHOTO_UPLOAD_FAILED_FALLBACK_MESSAGE);
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
      {displayUrl ? (
        <div className="upload-preview">
          <img
            src={displayUrl}
            alt="프로필 사진 미리보기"
            className="upload-preview-image"
            style={{ opacity: isUploading ? 0.65 : 1 }}
          />
        </div>
      ) : null}
      {isUploading ? <p className="field-help">처리 및 업로드 중입니다…</p> : null}
      <p className="field-help">사진은 선택사항입니다. 기본 이미지로 진행할 수 있어요.</p>
      {helperMessage ? <p className="field-help">{helperMessage}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
      <Button
        variant="ghost"
        type="button"
        disabled={isUploading}
        onClick={() => {
          revokeObjectPreview();
          onChange("");
          setError(null);
          setHelperMessage(null);
        }}
      >
        {isUploading ? "업로드 중..." : hasCustomImage ? "사진 지우기" : "사진 업로드"}
      </Button>
    </div>
  );
}
