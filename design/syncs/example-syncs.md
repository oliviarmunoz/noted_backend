# example sync file with frames

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, FileUploading, Sharing, UserAuthentication } from "@concepts";

//-- Phase 1: Request Upload URL --//
export const RequestUploadURL: Sync = ({ request, session, filename, user }) => ({
  when: actions([Requesting.request, { path: "/FileUploading/requestUploadURL", session, filename }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user })
    return frames
  },
  then: actions([FileUploading.requestUploadURL, { owner: user, filename }]),
});

export const RequestUploadURLResponse: Sync = ({ request, file, uploadURL }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/requestUploadURL" }, { request }],
    [FileUploading.requestUploadURL, {}, { file, uploadURL }],
  ),
  then: actions([Requesting.respond, { request, file, uploadURL }]),
});

//-- Phase 2: Confirm Upload --//
export const ConfirmUploadRequest: Sync = ({ request, session, file, user, owner }) => ({
  when: actions([Requesting.request, { path: "/FileUploading/confirmUpload", session, file }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(FileUploading._getOwner, { file }, { owner });
    return frames.filter(($) => $[user] === $[owner]);
  },
  then: actions([FileUploading.confirmUpload, { file }]),
});

export const ConfirmUploadResponseSuccess: Sync = ({ request, file }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/confirmUpload" }, { request }],
    [FileUploading.confirmUpload, {}, { file }],
  ),
  then: actions([Requesting.respond, { request, status: "confirmed" }]),
});

export const ConfirmUploadResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/confirmUpload" }, { request }],
    [FileUploading.confirmUpload, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- List User's Files --//
export const ListMyFilesRequest: Sync = ({ request, session, user, file, filename, results }) => ({
  when: actions([Requesting.request, { path: "/my-files", session }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(FileUploading._getFilesByOwner, { owner: user }, { file, filename });
    if (frames.length === 0) {
      const response = {...originalFrame, [results]: []}
      return new Frames(response)
    }
    return frames.collectAs([file, filename], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

export const ListSharedFilesRequest: Sync = ({ request, session, user, file, filename, owner, ownerUsername, results }) => ({
  when: actions([Requesting.request, { path: "/my-shares", session }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    // If the session is invalid, return an empty list immediately.
    if (frames.length === 0) {
      return new Frames({...originalFrame, [results]: []});
    }
    
    // 2. Find files shared with the user
    frames = await frames.query(Sharing._getFilesSharedWithUser, { user }, { file });
    
    // If no files are shared, return an empty list.
    if (frames.length === 0) {
      return new Frames({...originalFrame, [results]: []});
    }

    // 3. & 4. Enrich each file with its details
    frames = await frames.query(FileUploading._getFilename, { file }, { filename });
    frames = await frames.query(FileUploading._getOwner, { file }, { owner });
    frames = await frames.query(UserAuthentication._getUsername, { user: owner }, { username: ownerUsername });

    // 5. Collect into final response structure
    return frames.collectAs([file, filename, ownerUsername], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

//-- Download a File --//
export const DownloadFileRequest: Sync = ({ request, session, file, user, owner, isShared, downloadURL }) => ({
  when: actions([Requesting.request, { path: "/download", session, file }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(FileUploading._getOwner, { file }, { owner });
    frames = await frames.query(Sharing._isSharedWith, { file, user }, { access: isShared });
    // Authorization Logic: Keep frames where the user is the owner OR the file is shared.
    frames = frames.filter(($) => $[user] === $[owner] || $[isShared] === true);
    // If any authorized frames remain, get the download URL for them.
    return await frames.query(FileUploading._getDownloadURL, { file }, { downloadURL });
  },
  then: actions([Requesting.respond, { request, downloadURL }]),
});
```
