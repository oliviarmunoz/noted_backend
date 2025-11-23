[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@playlist-concept](./Playlist.md)

[@example-implementation](../LikertSurvey/implementation.md)

# implement: Playlist concept
# response:

Here is the `LikertSurvey` concept specification and its implementation in TypeScript, followed by the `Playlist` concept implementation.

The `LikertSurvey` concept helps in creating and managing surveys where respondents rate statements on a numerical scale. It supports creating surveys, adding questions, and submitting/updating responses.

---

# concept: LikertSurvey \[Author, Respondent]

**Purpose**: To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale. \
**Principle**: If an author creates a survey with several questions on a 1-5 scale, and a respondent submits their answers to those questions, then the author can view the collected responses to analyze the respondent's opinions.

**State**

*   A set of `Surveys` with
    *   an `author` of type `Author`
    *   a `title` of type `String`
    *   a `scaleMin` of type `Number`
    *   a `scaleMax` of type `Number`
*   A set of `Questions` with
    *   a `survey` of type `Survey`
    *   a `text` of type `String`
*   A set of `Responses` with
    *   a `respondent` of type `Respondent`
    *   a `question` of type `Question`
    *   a `value` of type `Number`

**Actions**

*   `createSurvey (author: Author, title: String, scaleMin: Number, scaleMax: Number): (survey: Survey)`
    *   **requires**: `scaleMin < scaleMax`
    *   **effects**: Creates a new survey with the given author, title, and scale; returns the ID of the new survey.
*   `addQuestion (survey: Survey, text: String): (question: Question)`
    *   **requires**: The `survey` must exist.
    *   **effects**: Adds a new question to the specified survey; returns the ID of the new question.
*   `submitResponse (respondent: Respondent, question: Question, value: Number)`
    *   **requires**: The `question` must exist. The `respondent` must not have already submitted a response for this `question`. The `value` must be within the `survey`'s scale.
    *   **effects**: Records the respondent's answer for the given question.
*   `updateResponse (respondent: Respondent, question: Question, value: Number)`
    *   **requires**: The `question` must exist. The `respondent` must have already submitted a response for this `question`. The `value` must be within the `survey`'s scale.
    *   **effects**: Updates the respondent's existing answer for the given question.
*   `_getSurveyQuestions (survey: Survey): (text: String, questionId: Question)[]`
    *   **requires**: The `survey` must exist.
    *   **effects**: Returns a list of all questions (text and ID) for the specified survey.
*   `_getSurveyResponses (survey: Survey): (respondent: Respondent, question: Question, value: Number)[]`
    *   **requires**: The `survey` must exist.
    *   **effects**: Returns a list of all responses for the questions within the specified survey.
*   `_getRespondentAnswers (respondent: Respondent): (question: Question, value: Number)[]`
    *   **requires**: The `respondent` must exist (implicitly, as `Respondent` is a generic ID).
    *   **effects**: Returns a list of all responses submitted by the specified respondent.

---

# file: src/likertsurvey/LikertSurveyConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "LikertSurvey" + ".";

// Generic types for the concept's external dependencies
type Author = ID;
type Respondent = ID;

// Internal entity types, represented as IDs
type Survey = ID;
type Question = ID;
type Response = ID;

/**
 * State: A set of Surveys with an author, title, and scale.
 */
interface SurveyDoc {
  _id: Survey; // Unique ID for the survey
  author: Author;
  title: string;
  scaleMin: number;
  scaleMax: number;
}

/**
 * State: A set of Questions, each linked to a survey and containing text.
 */
interface QuestionDoc {
  _id: Question; // Unique ID for the question
  survey: Survey;
  text: string;
}

/**
 * State: A set of Responses, linking a respondent, a question, and their chosen value.
 * Each response from a given respondent to a given question is unique.
 */
interface ResponseDoc {
  _id: Response; // Unique ID for the response entry
  respondent: Respondent;
  question: Question;
  value: number;
}

/**
 * @concept LikertSurvey
 * @purpose To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
 */
export default class LikertSurveyConcept {
  surveys: Collection<SurveyDoc>;
  questions: Collection<QuestionDoc>;
  responses: Collection<ResponseDoc>;

  constructor(private readonly db: Db) {
    this.surveys = this.db.collection(PREFIX + "surveys");
    this.questions = this.db.collection(PREFIX + "questions");
    this.responses = this.db.collection(PREFIX + "responses");
  }

  /**
   * createSurvey (author: Author, title: String, scaleMin: Number, scaleMax: Number): (survey: Survey)
   *
   * **requires** scaleMin must be less than scaleMax.
   *
   * **effects** Creates a new survey with the given author, title, and scale; returns the ID of the new survey.
   */
  async createSurvey({ author, title, scaleMin, scaleMax }: { author: Author; title: string; scaleMin: number; scaleMax: number }): Promise<{ survey: Survey } | { error: string }> {
    if (scaleMin >= scaleMax) {
      return { error: "scaleMin must be less than scaleMax" };
    }

    const surveyId = freshID() as Survey;
    await this.surveys.insertOne({ _id: surveyId, author, title, scaleMin, scaleMax });
    return { survey: surveyId };
  }

  /**
   * addQuestion (survey: Survey, text: String): (question: Question)
   *
   * **requires** The survey must exist.
   *
   * **effects** Adds a new question to the specified survey; returns the ID of the new question.
   */
  async addQuestion({ survey, text }: { survey: Survey; text: string }): Promise<{ question: Question } | { error: string }> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return { error: `Survey with ID ${survey} not found.` };
    }

    const questionId = freshID() as Question;
    await this.questions.insertOne({ _id: questionId, survey, text });
    return { question: questionId };
  }

  /**
   * submitResponse (respondent: Respondent, question: Question, value: Number)
   *
   * **requires** The question must exist. The respondent must not have already submitted a response for this question. The value must be within the survey's scale.
   *
   * **effects** Records the respondent's answer for the given question.
   */
  async submitResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      // This indicates a data integrity issue but is a good safeguard.
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const existingResponse = await this.responses.findOne({ respondent, question });
    if (existingResponse) {
      return { error: "Respondent has already answered this question. Use updateResponse to change it." };
    }

    const responseId = freshID() as Response;
    await this.responses.insertOne({ _id: responseId, respondent, question, value });

    return {};
  }

  /**
   * updateResponse (respondent: Respondent, question: Question, value: Number)
   *
   * **requires** The question must exist. The respondent must have already submitted a response for this question. The value must be within the survey's scale.
   *
   * **effects** Updates the respondent's existing answer for the given question.
   */
  async updateResponse({ respondent, question, value }: { respondent: Respondent; question: Question; value: number }): Promise<Empty | { error: string }> {
    const questionDoc = await this.questions.findOne({ _id: question });
    if (!questionDoc) {
      return { error: `Question with ID ${question} not found.` };
    }

    const surveyDoc = await this.surveys.findOne({ _id: questionDoc.survey });
    if (!surveyDoc) {
      return { error: "Associated survey for the question not found." };
    }

    if (value < surveyDoc.scaleMin || value > surveyDoc.scaleMax) {
      return { error: `Response value ${value} is outside the survey's scale [${surveyDoc.scaleMin}, ${surveyDoc.scaleMax}].` };
    }

    const result = await this.responses.updateOne({ respondent, question }, { $set: { value } });

    if (result.matchedCount === 0) {
      return { error: "No existing response found to update. Use submitResponse to create one." };
    }

    return {};
  }

  /**
   * _getSurveyQuestions (survey: Survey): (text: String, questionId: Question)[]
   *
   * **requires** The survey must exist.
   *
   * **effects** Returns a list of all questions (text and ID) for the specified survey.
   */
  async _getSurveyQuestions({ survey }: { survey: Survey }): Promise<{ text: string; questionId: Question }[]> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return []; // Return empty array if survey not found, as per query convention
    }
    const questions = await this.questions.find({ survey }).toArray();
    return questions.map((q) => ({ text: q.text, questionId: q._id }));
  }

  /**
   * _getSurveyResponses (survey: Survey): (respondent: Respondent, question: Question, value: Number)[]
   *
   * **requires** The survey must exist.
   *
   * **effects** Returns a list of all responses for the questions within the specified survey.
   */
  async _getSurveyResponses({ survey }: { survey: Survey }): Promise<{ respondent: Respondent; question: Question; value: number }[]> {
    const existingSurvey = await this.surveys.findOne({ _id: survey });
    if (!existingSurvey) {
      return [];
    }

    // Find all questions associated with the survey
    const surveyQuestions = await this.questions.find({ survey }).project({ _id: 1 }).toArray();
    const questionIds = surveyQuestions.map((q) => q._id as Question);

    if (questionIds.length === 0) {
      return []; // No questions, so no responses
    }

    // Find all responses for these questions
    const responses = await this.responses.find({ question: { $in: questionIds } }).toArray();
    return responses.map((r) => ({
      respondent: r.respondent,
      question: r.question,
      value: r.value,
    }));
  }

  /**
   * _getRespondentAnswers (respondent: Respondent): (question: Question, value: Number)[]
   *
   * **requires** The respondent must exist (implicitly, as Respondent is a generic ID).
   *
   * **effects** Returns a list of all responses submitted by the specified respondent.
   */
  async _getRespondentAnswers({ respondent }: { respondent: Respondent }): Promise<{ question: Question; value: number }[]> {
    const responses = await this.responses.find({ respondent }).toArray();
    return responses.map((r) => ({
      question: r.question,
      value: r.value,
    }));
  }
}
```

---

# file: src/concepts/PlaylistConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Playlist" + ".";

// Generic types of this concept, representing external entities
type User = ID;
type Item = ID;

// Internal type for a Playlist entity's unique ID
type Playlist = ID;

/**
 * State: A set of Playlists.
 * Each document in the 'playlists' collection represents a Playlist entity.
 * It includes its unique ID (_id), a descriptive name, a public/private flag,
 * the ID of the user who owns it, and an array of generic Item IDs it contains.
 */
interface PlaylistDoc {
  _id: Playlist;
  playlistName: string;
  isPublic: boolean;
  user: User;
  items: Item[]; // Array of Item IDs
}

/**
 * @concept Playlist
 * @purpose Enable users to establish and manage collections of items.
 * @principle A user can create a playlist; add items to a playlist; remove items from a playlist; and retrieve the items in a playlist.
 *
 * This concept manages collections of generic items (e.g., songs, videos, articles)
 * for specific users. Playlists are identified by their name within the context of a user.
 */
export default class PlaylistConcept {
  playlists: Collection<PlaylistDoc>;

  constructor(private readonly db: Db) {
    this.playlists = this.db.collection(PREFIX + "playlists");
  }

  /**
   * createPlaylist (user: User, playlistName: String): (playlist: Playlist)
   *
   * **requires** A playlist with the given `playlistName` must not already exist for the `user`.
   *
   * **effects** Creates a new Playlist associated with the `user`, with the given `playlistName` and an empty `items` list; returns the ID of the newly created playlist.
   */
  async createPlaylist({ user, playlistName }: { user: User; playlistName: string }): Promise<{ playlist: Playlist } | { error: string }> {
    const existingPlaylist = await this.playlists.findOne({ user, playlistName });
    if (existingPlaylist) {
      return { error: `Playlist with name '${playlistName}' already exists for user '${user}'.` };
    }

    const playlistId = freshID() as Playlist;
    // Default to not public on creation, as a reasonable initial state.
    await this.playlists.insertOne({ _id: playlistId, user, playlistName, isPublic: false, items: [] });
    return { playlist: playlistId };
  }

  /**
   * deletePlaylist (user: User, playlistName: String)
   *
   * **requires** A playlist with the given `playlistName` must exist for the `user`.
   *
   * **effects** Deletes the specified playlist.
   */
  async deletePlaylist({ user, playlistName }: { user: User; playlistName: string }): Promise<Empty | { error: string }> {
    const result = await this.playlists.deleteOne({ user, playlistName });
    if (result.deletedCount === 0) {
      return { error: `Playlist with name '${playlistName}' not found for user '${user}'.` };
    }
    return {};
  }

  /**
   * addItem (user: User, item: Item, playlistName: String)
   *
   * **requires** A playlist with the given `playlistName` must exist for the `user`. The `item` must not already be present in that playlist.
   *
   * **effects** Adds the `item` to the specified playlist's list of items.
   */
  async addItem({ user, item, playlistName }: { user: User; item: Item; playlistName: string }): Promise<Empty | { error: string }> {
    const existingPlaylist = await this.playlists.findOne({ user, playlistName });
    if (!existingPlaylist) {
      return { error: `Playlist with name '${playlistName}' not found for user '${user}'.` };
    }

    if (existingPlaylist.items.includes(item)) {
      return { error: `Item '${item}' is already in playlist '${playlistName}' for user '${user}'.` };
    }

    const result = await this.playlists.updateOne(
      { _id: existingPlaylist._id },
      { $push: { items: item } }
    );

    if (result.modifiedCount === 0) {
      // This should ideally not happen if checks pass, but is a safeguard.
      return { error: `Failed to add item '${item}' to playlist '${playlistName}'.` };
    }
    return {};
  }

  /**
   * deleteItem (user: User, item: Item, playlistName: String)
   *
   * **requires** A playlist with the given `playlistName` must exist for the `user`. The `item` must be present in that playlist.
   *
   * **effects** Removes the `item` from the specified playlist's list of items.
   */
  async deleteItem({ user, item, playlistName }: { user: User; item: Item; playlistName: string }): Promise<Empty | { error: string }> {
    const existingPlaylist = await this.playlists.findOne({ user, playlistName });
    if (!existingPlaylist) {
      return { error: `Playlist with name '${playlistName}' not found for user '${user}'.` };
    }

    if (!existingPlaylist.items.includes(item)) {
      return { error: `Item '${item}' is not in playlist '${playlistName}' for user '${user}'.` };
    }

    const result = await this.playlists.updateOne(
      { _id: existingPlaylist._id },
      { $pull: { items: item } }
    );

    if (result.modifiedCount === 0) {
      // This should ideally not happen if checks pass, but is a safeguard.
      return { error: `Failed to remove item '${item}' from playlist '${playlistName}'.` };
    }
    return {};
  }

  /**
   * _getPlaylistItems (user: User, playlistName: String): (item: Item)[]
   *
   * **requires** A playlist with the given `playlistName` must exist for the `user`.
   *
   * **effects** Returns an array of dictionaries, where each dictionary contains the `item` ID from the specified playlist.
   */
  async _getPlaylistItems({ user, playlistName }: { user: User; playlistName: string }): Promise<{ item: Item }[]> {
    const playlist = await this.playlists.findOne({ user, playlistName });
    if (!playlist) {
      // Per concept design guidelines, queries return an empty array if no results, not an error.
      return [];
    }
    // Transform the array of Item IDs into an array of dictionaries { item: Item }
    return playlist.items.map(item => ({ item }));
  }

  /**
   * _getUserPlaylists (user: User): (playlistName: String, isPublic: Flag, playlistId: Playlist, items: Item[])[]
   *
   * **requires** The `user` exists (implicitly, as `User` is a generic ID).
   *
   * **effects** Returns an array of dictionaries, each representing a playlist owned by the `user`,
   * including its name, public status, ID, and contained items.
   */
  async _getUserPlaylists({ user }: { user: User }): Promise<{ playlistName: string, isPublic: boolean, playlistId: Playlist, items: Item[] }[]> {
    const userPlaylists = await this.playlists.find({ user }).toArray();
    // Map the fetched documents to the specified output format
    return userPlaylists.map(p => ({
      playlistName: p.playlistName,
      isPublic: p.isPublic,
      playlistId: p._id,
      items: p.items
    }));
  }
}
```