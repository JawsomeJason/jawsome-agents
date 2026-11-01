---
extends:
when: Testing a change in a real browser, your own or a PR under review, including "QA my change", "break it" or "verify the UI".
---

1. **Pick the surface.** Test where users meet the change, the consuming app's screen as well as the component's story. Serve it from the worktree under test. A server another checkout started renders that checkout's code, so confirm the listener's working directory before you trust a render. Start each environment the way the repo's agent docs say. Never guess a port or a login. Start a logged-in surface from a session the environment tooling mints, never from a password typed into a form.
2. **Check the browser tool first.** Read the page's visibility state before any measurement. A background tab can freeze timers, animation frames and fetches. When the tab stays hidden, switch tools and say why.
3. **Capture the before state.** Shoot each screen the change touches from the base commit, before the first edit. When that moment has passed, shoot it from a detached worktree at the merge base, never from memory. Record the viewport, the crop and the state of each shot.
4. **Read the change.** Diff against the branch's base, never an assumed trunk. List what is new, its inputs, its edge cases and the nearby features it could break.
5. **Plan the attacks.** Plan as a user trying to break the change, not as a checklist that confirms it renders. Cover empty and missing data, boundaries, state changes, repeated and rapid input, keyboard and focus, display math such as NaN or a zero amount, error paths and narrow viewports.
6. **Run each attack.** Act through real clicks and keys, never through component internals or DOM state set by hand. Capture what shows, read the console and record pass or fail with what you saw. Count console errors that relate to the change. Against a shared local backend, run at most four browsers at once. Then check one adjacent feature for regressions.
7. **Fix what breaks.** On your own change, fix each break, then rerun that attack and the ones next to it. On someone else's PR, edit nothing. Report each break with its repro steps, the expected and actual result, and the evidence path.
8. **Capture the after state.** Shoot each before shot again from the final head, with the same viewport, crop and state.
9. **Report.** Give a table of test, input, expected, actual and status, with one row for console errors across every page. List what you could not test and why. Hand the before and after pairs to Opening a PR for the PR's screenshots.
