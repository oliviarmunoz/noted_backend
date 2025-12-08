---
timestamp: 'Mon Dec 08 2025 16:20:37 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_162037.95e14e33.md]]'
content_id: 873525d566ba5845c390408ae8f3c6db32ad0d1712d863b685b4cdca39357c2e
---

# file: src/syncs/sample.sync.ts

```typescript
// /**
//  * Sample synchronizations: feel free to delete this entire file!
//  */

// import { LikertSurvey, Requesting } from "@concepts";
// import { actions, Sync } from "@engine";

// export const CreateSurveyRequest: Sync = (
//   { request, author, title, scaleMin, scaleMax },
// ) => ({
//   when: actions([
//     Requesting.request,
//     { path: "/LikertSurvey/createSurvey", author, title, scaleMin, scaleMax },
//     { request },
//   ]),
//   then: actions([LikertSurvey.createSurvey, {
//     author,
//     title,
//     scaleMin,
//     scaleMax,
//   }]),
// });

// export const CreateSurveyResponse: Sync = ({ request, survey }) => ({
//   when: actions(
//     [Requesting.request, { path: "/LikertSurvey/createSurvey" }, { request }],
//     [LikertSurvey.createSurvey, {}, { survey }],
//   ),
//   then: actions([Requesting.respond, { request, survey }]),
// });

// export const AddQuestionRequest: Sync = ({ request, survey, text }) => ({
//   when: actions([
//     Requesting.request,
//     { path: "/LikertSurvey/addQuestion", survey, text },
//     { request },
//   ]),
//   then: actions([LikertSurvey.addQuestion, { survey, text }]),
// });

// export const AddQuestionResponse: Sync = ({ request, question }) => ({
//   when: actions(
//     [Requesting.request, { path: "/LikertSurvey/addQuestion" }, { request }],
//     [LikertSurvey.addQuestion, {}, { question }],
//   ),
//   then: actions([Requesting.respond, { request, question }]),
// });

```
