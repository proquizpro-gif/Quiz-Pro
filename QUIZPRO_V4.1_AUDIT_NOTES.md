# QuizPro v4.1 — whole-app audit and fixes

14 October 2026. Builds on v4.0 (QAAPF). Every Netlify build now runs the
bank checks, the 28 QAAPF tests and 14 new app tests before deploying.

## Deploy, in this order

1. **Upload the files** in this package to GitHub (Add file → Upload files),
   commit to `main`, and let Netlify rebuild. Do it when no quiz is being
   written. Papers in progress under the old version are picked up by the
   new one.
2. **Check the site** loads and looks normal. Styles are now built during
   deployment instead of in the browser, so if the build fails with
   "Cannot find module 'tailwindcss'", remove any `NODE_ENV=production`
   variable from Netlify's environment settings and redeploy.
3. **Then run `STEP6_recommended_exam_security.sql`** in the Supabase SQL
   Editor. **Only after step 2**, and again when no quiz is running. The
   old app cannot work with it: students would see "Not enough questions
   in bank". The query at the end should list one policy, four functions
   and two triggers.
4. **Sign in with a student account** and open a quiz to confirm it loads.

Optional clean-up on GitHub: delete the five old copies at the top level
of the repository (`App.jsx`, `QAAPF.jsx`, `csv.js`, `db.js`, `ui.jsx`).
The build never uses them, but they are easy to edit by mistake. The same
goes for `src/components/QuizProAI.jsx`, which nothing uses.

To undo STEP6, run the commented block at the bottom of that file.

## Exam integrity and fairness

| Problem | Fix |
|---|---|
| The exam timer stopped when the tab was closed: a student could close the quiz, look things up and reopen it with the same time left. It also ran slow in background tabs. | The timer is a fixed deadline. Closing the tab, sleeping the laptop or reopening the page doesn't stop it. |
| Opening the quiz in another browser, or after clearing site data, gave a fresh full timer. | The clock is anchored to the server's record of when the sitting began. Earlier violations carry over and the event is flagged for the invigilator. |
| On 1366×768 laptops, going fullscreen counted as "screen resized", and so did every "Return to quiz". Five violations auto-submit, so honest students could be submitted early. | Resizes caused by fullscreen, rotation and zoom are ignored. Split-screen and shrinking the window are still caught. |
| The developer-tools check misfired on zoomed pages and browsers with side panels. | It now measures change from the settled state instead of a fixed gap. |
| Reloading the page reset the violation count to 0, and the warning on the lock screen could lag the real count. | The count survives reloads and the warning always shows the real number. |
| The AI chat button floated above the exam on phones and wherever fullscreen was blocked. | Students don't see the assistant while a quiz is open. |
| If the connection dropped after the paper was saved, pressing Retry saved it again as a second attempt. | Each sitting has a token, and a retry finds the saved paper instead of storing it twice. |
| A paper whose time ran out while the tab was closed stayed open at 00:00. | It submits as soon as it is reopened. |
| If the browser refused to go fullscreen (slow connection after "Start now"), there was no way in. | A "Go fullscreen" button appears. |
| On phones, a student who briefly switched apps showed as "Left the exam" for the rest of the sitting. | The heartbeat resets the status to writing. |
| **Every student's browser downloaded every question with its correct answer**, readable in developer tools before and during a quiz. **Scores were calculated in the browser and stored as sent.** The attempt limit was checked only in the browser. | **STEP6**: students can't read the question bank. The exam gets its paper without answers from a server function, and the database re-marks every paper, numbers attempts, timestamps them and enforces the limit. Tested on PostgreSQL 16 with 25 scenarios across two schema variants. |

## Data and performance

| Problem | Fix |
|---|---|
| Supabase returns at most 1,000 rows per request. Beyond 1,000 questions or attempts, data silently went missing. | All lists are read in pages. |
| The faculty dashboard re-downloaded every attempt, each with its full question list, every 20 seconds. On a test day that's megabytes per refresh per open tab, enough to use up the free tier's bandwidth. | Only new attempts are downloaded, and only while the tab is visible. |
| A login race could load a faculty member's data as if they were a student, and everything reloaded on every hourly login refresh. | Data loads once per signed-in user, after the profile is known. |
| Styles were compiled in every visitor's browser by the Tailwind CDN script (about 400 KB). If the CDN was slow or blocked, the page showed unstyled. | Styles are compiled at deploy time into a 7.7 KB (compressed) file. |
| Students downloaded the QAAPF analytics, admin panel and classroom manager. | These load only when faculty open them. The student download is down from 237 KB to 194 KB compressed. |
| Admin role counts stopped at 1,000 users. | Exact counts come from the database. |

## Smaller bugs

- Class rank on the result screen matched students by name, so two students with the same name collided. It now uses the account.
- Spreadsheet import treated an option that was the number `0` as empty. It also missed duplicates within the same file and options that were identical.
- A quiz could be saved with 0 minutes (auto-submits at once), 0 attempts, or a close time before its open time.
- Editing a quiz let faculty publish it to all students on the platform, which only admins can do when creating one.
- Editing a quiz in an archived classroom silently moved it to another classroom.
- "Add question" errors showed in green.
- The admin panel crashed on a user with no name, and pointed to a setting (`VITE_AI_PROVIDER`) that doesn't exist.
- The quiz-detail screen showed baseline papers with raw scores and pass/fail grades. It now uses the verified QAAPF key and Q-bands, like the QAAPF screens.
- Co-teachers couldn't see classrooms they had been added to.
- The "auto-submitted" log line was counted as a sixth violation.

## Still open (not fixed here)

- **QAAPF answer keys ship inside the app's JavaScript.** The built-in bank has to be in the browser for scoring and the generator, so a determined student could find the key to a baseline item. Acceptable for an ungraded diagnostic. Moving the bank into the database would close it.
- **A student can read the key of their own submitted paper** through the API, even when the quiz shows answers only after it closes. Hiding it needs the attempts table split by role, which is a larger change.
- **AI keys are visible in the browser.** Use free-tier keys only, as the admin panel says.
- **`xlsx` 0.18.5 has known vulnerabilities** in parsing crafted files. Only faculty upload spreadsheets, so the risk is low. The maintained version (0.20.x) is published only on cdn.sheetjs.com, not npm.
- **Lockdown is a deterrent, not proof.** It can't see a second device. Treat flags as signals.

## Files

New: `STEP6_recommended_exam_security.sql`, `src/lib/exam-logic.js`, `scripts/test-app.mjs`, `tailwind.config.js`, `postcss.config.js`.
Changed: `index.html`, `package.json`, `package-lock.json`, `src/App.jsx`, `src/index.css`, `src/lib/{db.js, supabase.js, AuthContext.jsx, lockdown.js, xlsx-import.js}`, `src/components/{AdminPanel.jsx, Classrooms.jsx}`.
Removed: `src/components/QuizProAI.jsx` (unused).
