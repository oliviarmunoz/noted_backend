---
timestamp: 'Sun Nov 23 2025 13:14:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_131439.8b5ee1dd.md]]'
content_id: 40fe6174260cb1d14c1119dd20f25baf67deee5d8f662b282198990dfd507b3b
---

# concept: LikertSurvey \[Author, Respondent]

**Purpose**: To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale. \
**Principle**: If an author creates a survey with several questions on a 1-5 scale, and a respondent submits their answers to those questions, then the author can view the collected responses to analyze the respondent's opinions.

**State**

* A set of `Surveys` with
  * an `author` of type `Author`
  * a `title` of type `String`
  * a `scaleMin` of type `Number`
  * a `scaleMax` of type `Number`
* A set of `Questions` with
  * a `survey` of type `Survey`
  * a `text` of type `String`
* A set of `Responses` with
  * a `respondent` of type `Respondent`
  * a `question` of type `Question`
  * a `value` of type `Number`

**Actions**

* `createSurvey (author: Author, title: String, scaleMin: Number, scaleMax: Number): (survey: Survey)`
  * **requires**: `scaleMin < scaleMax`
  * **effects**: Creates a new survey with the given author, title, and scale; returns the ID of the new survey.
* `addQuestion (survey: Survey, text: String): (question: Question)`
  * **requires**: The `survey` must exist.
  * **effects**: Adds a new question to the specified survey; returns the ID of the new question.
* `submitResponse (respondent: Respondent, question: Question, value: Number)`
  * **requires**: The `question` must exist. The `respondent` must not have already submitted a response for this `question`. The `value` must be within the `survey`'s scale.
  * **effects**: Records the respondent's answer for the given question.
* `updateResponse (respondent: Respondent, question: Question, value: Number)`
  * **requires**: The `question` must exist. The `respondent` must have already submitted a response for this `question`. The `value` must be within the `survey`'s scale.
  * **effects**: Updates the respondent's existing answer for the given question.
* `_getSurveyQuestions (survey: Survey): (text: String, questionId: Question)[]`
  * **requires**: The `survey` must exist.
  * **effects**: Returns a list of all questions (text and ID) for the specified survey.
* `_getSurveyResponses (survey: Survey): (respondent: Respondent, question: Question, value: Number)[]`
  * **requires**: The `survey` must exist.
  * **effects**: Returns a list of all responses for the questions within the specified survey.
* `_getRespondentAnswers (respondent: Respondent): (question: Question, value: Number)[]`
  * **requires**: The `respondent` must exist (implicitly, as `Respondent` is a generic ID).
  * **effects**: Returns a list of all responses submitted by the specified respondent.

***
