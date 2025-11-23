---
timestamp: 'Sun Nov 23 2025 12:57:33 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_125733.eb6223b5.md]]'
content_id: 3faf1461685a02cc39dd4d04c91f8183035bb6fbf572b1fe318e16b541ef9da3
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

***
