import { actions, Sync } from "@engine";
import { UserAuthentication, Playlist } from "@concepts";

export const CreateListenLater: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Playlist.createPlaylist, { user, playlistName: "Listen Later" }],
  ),
});

export const CreateFavorites: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Playlist.createPlaylist, { user, playlistName: "Favorites" }],
  ),
});