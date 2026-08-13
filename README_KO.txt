FoxBear v1.6.95 - PATCH_MANIFEST deletion hotfix (Git CLI not required)

1) 이 ZIP의 내용을 GitHub Desktop 저장소 루트에 압축 해제합니다.
   - PATCH_MANIFEST.json, package.json, src 폴더가 있는 같은 위치여야 합니다.

2) APPLY_MANIFEST_DELETE_NO_GIT.cmd 를 실행합니다.

3) GitHub Desktop을 열고 Changes에서 아래 항목을 확인합니다.
   Deleted: PATCH_MANIFEST.json

4) 해당 삭제를 커밋하고 Push origin 합니다.
   권장 커밋 메시지:
   Remove legacy PATCH_MANIFEST for strict source hygiene

중요:
- 이 패치는 Git CLI가 필요하지 않습니다.
- CMD 파일 자체를 커밋할 필요는 없습니다.
- PATCH_MANIFEST.json 삭제가 GitHub Desktop의 Changes에 표시되어야 CI가 통과합니다.
