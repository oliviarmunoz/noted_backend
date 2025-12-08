import { actions, Frames, Sync } from "@engine";
import { UserAuthentication, Friending, Requesting, Session } from "@concepts";

const INVALID_SESSION_ERROR = "Invalid session. Please sign in.";
const SELF_REQUEST_ERROR = "Cannot send a friend request to yourself.";
const SELF_ACTION_ERROR = "Cannot perform this action on yourself.";
const UNAUTHORIZED_ACTION_ERROR =
  "You are not authorized to perform this action.";

const userNotFoundMessage = (username?: string) =>
  `User '${username ?? "unknown"}' not found.`;

// ---------------------------------------------------------------------------
// Send Friend Request
// ---------------------------------------------------------------------------

export const RequestSendFriendRequest: Sync = ({
  request,
  session,
  targetUsername,
  currentUser,
  targetUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/sendFriendRequest", session, targetUsername },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      { user: currentUser }
    );
    frames = frames.filter(($) => $[currentUser] !== undefined);

    frames = await frames.query(
      UserAuthentication._getUserByUsername,
      { username: targetUsername },
      { user: targetUser }
    );
    frames = frames.filter(($) => $[targetUser] !== undefined);

    return frames.filter(($) => $[currentUser] !== $[targetUser]);
  },
  then: actions([
    Friending.sendFriendRequest,
    { user: currentUser, target: targetUser },
  ]),
});

export const SendFriendRequestGuardResponse: Sync = ({
  request,
  session,
  targetUsername,
  currentUser,
  targetUser,
  errorMessage,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/sendFriendRequest", session, targetUsername },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = (frames[0] ?? {}) as Record<symbol, unknown>;
    const requestedUsername = originalFrame[targetUsername] as
      | string
      | undefined;

    let working = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    working = working.filter(($) => $[currentUser] !== undefined);
    if (working.length === 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: INVALID_SESSION_ERROR,
      });
    }

    working = await working.query(
      UserAuthentication._getUserByUsername,
      { username: targetUsername },
      { user: targetUser }
    );
    working = working.filter(($) => $[targetUser] !== undefined);
    if (working.length === 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: userNotFoundMessage(requestedUsername),
      });
    }

    const selfFrames = working.filter(($) => $[currentUser] === $[targetUser]);
    if (selfFrames.length > 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: SELF_REQUEST_ERROR,
      });
    }

    return new Frames();
  },
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});

export const SendFriendRequestSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Friending/sendFriendRequest" }, { request }],
    [Friending.sendFriendRequest, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const SendFriendRequestErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friending/sendFriendRequest" }, { request }],
    [Friending.sendFriendRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ---------------------------------------------------------------------------
// Accept Friend Request
// ---------------------------------------------------------------------------

export const RequestAcceptFriendRequest: Sync = ({
  request,
  session,
  requester,
  currentUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/acceptFriendRequest", session, requester },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    frames = frames.filter(($) => $[currentUser] !== undefined);
    return frames.filter(($) => $[currentUser] !== $[requester]);
  },
  then: actions([
    Friending.acceptFriendRequest,
    { requester, target: currentUser },
  ]),
});

export const AcceptFriendRequestGuardResponse: Sync = ({
  request,
  session,
  requester,
  currentUser,
  errorMessage,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/acceptFriendRequest", session, requester },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = (frames[0] ?? {}) as Record<symbol, unknown>;

    let working = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    working = working.filter(($) => $[currentUser] !== undefined);
    if (working.length === 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: INVALID_SESSION_ERROR,
      });
    }

    const selfFrames = working.filter(($) => $[currentUser] === $[requester]);
    if (selfFrames.length > 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: SELF_ACTION_ERROR,
      });
    }

    return new Frames();
  },
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});

export const AcceptFriendRequestSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friending/acceptFriendRequest" },
      { request },
    ],
    [Friending.acceptFriendRequest, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const AcceptFriendRequestErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friending/acceptFriendRequest" },
      { request },
    ],
    [Friending.acceptFriendRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ---------------------------------------------------------------------------
// Remove Friend Request
// ---------------------------------------------------------------------------

export const RequestRemoveFriendRequest: Sync = ({
  request,
  session,
  requester,
  target,
  currentUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/removeFriendRequest", session, requester, target },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    return frames.filter(($) => {
      const userId = $[currentUser];
      return (
        userId !== undefined &&
        (userId === $[requester] || userId === $[target])
      );
    });
  },
  then: actions([Friending.removeFriendRequest, { requester, target }]),
});

export const RemoveFriendRequestGuardResponse: Sync = ({
  request,
  session,
  requester,
  target,
  currentUser,
  errorMessage,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/removeFriendRequest", session, requester, target },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = (frames[0] ?? {}) as Record<symbol, unknown>;

    let working = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    working = working.filter(($) => $[currentUser] !== undefined);
    if (working.length === 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: INVALID_SESSION_ERROR,
      });
    }

    const authorized = working.filter(($) => {
      const userId = $[currentUser];
      return userId === $[requester] || userId === $[target];
    });

    if (authorized.length === 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: UNAUTHORIZED_ACTION_ERROR,
      });
    }

    return new Frames();
  },
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});

export const RemoveFriendRequestSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friending/removeFriendRequest" },
      { request },
    ],
    [Friending.removeFriendRequest, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RemoveFriendRequestErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friending/removeFriendRequest" },
      { request },
    ],
    [Friending.removeFriendRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ---------------------------------------------------------------------------
// Remove Friend
// ---------------------------------------------------------------------------

export const RequestRemoveFriend: Sync = ({
  request,
  session,
  friend,
  currentUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/removeFriend", session, friend },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    return frames.filter(
      ($) => $[currentUser] !== undefined && $[currentUser] !== $[friend]
    );
  },
  then: actions([Friending.removeFriend, { user: currentUser, friend }]),
});

export const RemoveFriendGuardResponse: Sync = ({
  request,
  session,
  friend,
  currentUser,
  errorMessage,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/removeFriend", session, friend },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = (frames[0] ?? {}) as Record<symbol, unknown>;

    let working = await frames.query(
      Session._getUser,
      { session },
      {
        user: currentUser,
      }
    );
    working = working.filter(($) => $[currentUser] !== undefined);
    if (working.length === 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: INVALID_SESSION_ERROR,
      });
    }

    const selfFrames = working.filter(($) => $[currentUser] === $[friend]);
    if (selfFrames.length > 0) {
      return new Frames({
        ...originalFrame,
        [errorMessage]: SELF_ACTION_ERROR,
      });
    }

    return new Frames();
  },
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});

export const RemoveFriendSuccessResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Friending/removeFriend" }, { request }],
    [Friending.removeFriend, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RemoveFriendErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friending/removeFriend" }, { request }],
    [Friending.removeFriend, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
