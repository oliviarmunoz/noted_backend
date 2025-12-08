import { actions, Frames, Sync } from "@engine";
import { Requesting, Session, MusicDiscovery } from "@concepts";


/**
 * Sync: MusicSearchRequest
 * Handles a request to search the music catalog for a given query by an authenticated user.
 *
 * `when` Requesting.request for path "/music/search" with a session and query.
 * `where` Authenticates the user session.
 * `then` Triggers the MusicDiscovery.search action with the authenticated user and query.
 */
export const MusicSearchRequest: Sync = ({
  request,
  session,
  query,
  user,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/MusicDiscovery/search", session, query },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user session
    frames = await frames.query(Session._getUser, { session }, { user });
    return frames;
  },
  then: actions([MusicDiscovery.search, { user, query }]),
});

/**
 * Sync: MusicSearchResponseSuccess
 * Handles the successful response from a MusicDiscovery.search action.
 *
 * `when` A Requesting.request for "/music/search" has occurred and
 *        MusicDiscovery.search has successfully returned music entities.
 * `then` Responds to the original request with the music entities.
 */
export const MusicSearchResponseSuccess: Sync = ({
  request,
  musicEntities,
}) => ({
  when: actions(
    [Requesting.request, { path: "/MusicDiscovery/search" }, { request }],
    [MusicDiscovery.search, {}, { musicEntities }] // Matches the successful output of MusicDiscovery.search
  ),
  then: actions([Requesting.respond, { request, musicEntities }]),
});

/**
 * Sync: MusicSearchResponseError
 * Handles an error response from a MusicDiscovery.search action.
 *
 * `when` A Requesting.request for "/music/search" has occurred and
 *        MusicDiscovery.search has returned an error.
 * `then` Responds to the original request with the error message.
 */
export const MusicSearchResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MusicDiscovery/search" }, { request }],
    [MusicDiscovery.search, {}, { error }] // Matches the error output of MusicDiscovery.search
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Syncs for MusicDiscovery.loadEntityDetails (Authenticated Load) ---

export const LoadMusicEntityDetailsRequest: Sync = ({
  request,
  session,
  externalId,
  type,
  user,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/music/entity/details", session, externalId, type },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user session
    frames = await frames.query(Session._getUser, { session }, { user });
    return frames;
  },
  then: actions([MusicDiscovery.loadEntityDetails, { externalId, type }]),
});

export const LoadMusicEntityDetailsResponseSuccess: Sync = ({ request, music }) => ({
  when: actions(
    [Requesting.request, { path: "/MusicDiscovery/loadEntityDetails" }, { request }],
    [MusicDiscovery.loadEntityDetails, {}, { music }] // Matches the successful output of MusicDiscovery.loadEntityDetails
  ),
  then: actions([Requesting.respond, { request, music }]),
});

export const LoadMusicEntityDetailsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/MusicDiscovery/loadEntityDetails" },
      { request },
    ],
    [MusicDiscovery.loadEntityDetails, {}, { error }] // Matches the error output of MusicDiscovery.loadEntityDetails
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Syncs for MusicDiscovery.clearSearch (Authenticated Clear Search History) ---
export const ClearMySearchRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/MusicDiscovery/clearSearch", session },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user session
    frames = await frames.query(Session._getUser, { session }, { user });
    return frames;
  },
  then: actions([MusicDiscovery.clearSearch, { user }]),
});

export const ClearMySearchResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/MusicDiscovery/clearSearch" }, { request }],
    [MusicDiscovery.clearSearch, {}, {}] // Matches the empty output of MusicDiscovery.clearSearch
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Search history cleared." },
  ]),
});

export const ClearMySearchResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MusicDiscovery/clearSearch" }, { request }],
    [MusicDiscovery.clearSearch, {}, { error }] // Matches the error output of MusicDiscovery.clearSearch
  ),
  then: actions([Requesting.respond, { request, error }]),
});
