# Enchronofy: Your Private Journaling Vault

Enchronofy is your private, offline-friendly daily journaling vault that loves consistency, hates data leaks, and happily runs without the internet.  Think of it as a mood-aware, markdown‑friendly diary that lives on your device, not on some random server in the cloud. 

***

## 1. What Enchronofy Actually Is

Enchronofy is a **privacy‑first** journaling app designed for Android (and built with React Native) that helps you build a daily writing habit without sacrificing your personal data. 

- Everything important is encrypted and stored locally on your device in a secure vault. 
- It works offline; you can write on a plane, underground, or in the middle of nowhere. 
- It encourages consistency with streaks, weekly reviews, prompts, and a calendar view. 
- It supports open formats (JSON, Markdown, PDF) and encrypted exports, so you can always take your data with you. 

If big social media platforms are a loud bar, Enchronofy is that quiet corner table where you talk only to yourself.

***

## 2. Getting Started (Signup, Login, Recovery)

### First Launch: Creating Your Secure Vault

On first launch you’ll see the Signup screen, not Login.  This is where you create your private vault. 

You’ll be asked to:

1. **Create a password** (at least 8 characters).
   - This password encrypts your vault.  
   - You’ll need it every time you unlock the app. 

2. **Choose 3 security questions** and provide answers.
   - These are used for account recovery if you forget your password.  
   - Pick answers that are memorable for you, but not easy to guess. 

3. **Save your Recovery Key**.
   - The app generates a long recovery key (UUID-like string).  
   - It is shown once in an alert and you’re clearly asked to save it somewhere safe. 
   - This key can be used to reset your password later. 

Once this is done:

- A secure vault is created and stored locally on your device. 
- Your encryption key (DK) is unlocked in memory so the app can read/write your journals. 
- You are marked as authenticated and taken into the main app. 

Yes, it’s a bit more serious than “Sign in with Google” – that’s the point.

### Logging In

On subsequent launches you’ll see the Login screen. 

- Enter your password and tap “Unlock”. 
- The app uses your password to decrypt and unlock the vault. 
- If successful, you’re logged in and taken to the Home screen. 

If it can’t find a vault (e.g., first install), it will guide you to Signup instead. 

### Forgot Password (Don’t Panic, Just Read)

If you forget your password, tap **“Forgot password?”** on the Login screen.  You’ll see a recovery flow with two options: 

1. **Security Questions**  
   - Answer the questions you selected at signup. 
   - If answers are correct, you can set a new password for your vault. 

2. **Recovery Key**  
   - Enter the long recovery key you saved earlier. 
   - If it’s valid, you can also set a new password. 

In both flows:

- The app carefully rebuilds or resets the vault with your new password, preserving your existing entries. 
- After reset, you’re logged in again and the encryption key is updated in the app state. 

If you lose both the password and recovery methods, the vault remains locked. The app is intentionally designed this way to preserve your privacy.

***

## 3. Home Screen: Your Journaling Cockpit

Once logged in, you land on the Home screen: a clean dashboard of your journaling life. 

Here’s what you’ll see:

- **Weekly Review card** at the top  
  - Shows the current week label, how many days you wrote, and a mood emoji. 
  - If you have entries for the week, it can auto-open the Weekly Review once per week to help you reflect. 

- **Hero stats card**  
  - Total entries (with a fun 📝 icon). 
  - Current streak with a 🔥 icon. 
  - Longest streak shown in a small trophy chip. 
  - These update as you keep journaling and gently nudge your consistency. 

- **Recent activity row**  
  - Shows activity for recent days (last few days), including date labels and an indicator or emoji based on mood. 

- **Today’s Prompt**  
  - A journaling prompt with a “Shuffle” button and a “Write…” button. 
  - Tapping “Write…” opens the Journal Editor preloaded with this prompt. 

- **Memory calendar**  
  - A monthly calendar where days with entries are marked. 
  - Tapping any past or current date opens the Journal List for that day. 
  - Future dates are blocked with a friendly message hinting at an upcoming “Todo & Reminders” feature. 

- **Quick actions**  
  - Buttons for “View All”, “New entry”, “Import/Export”, and “Settings”. 

If your journaling life were a video game, this is your stats and quest screen.

***

## 4. Creating and Editing Journal Entries

### Opening the Editor

You can create or edit entries from:

- Home → “New entry” button. 
- Home → Today’s Prompt → “Write…”. 
- Calendar → select a date → Journal List → “New entry” (or select an existing one). 
- Journal Detail → “Edit Entry”. 

The editor is designed to feel clean, focused, and flexible. 

### Date Handling (No Time Travel… Yet)

When you create an entry:

- If opened from a specific date (e.g., from the calendar), that date is shown as a chip and used for the journal’s date. 
- The app explicitly prevents creating entries for **future** dates. 
  - You get a clear alert explaining that you can only write for today or the past, with a note that future planning features are coming. 

Editing an existing entry keeps its original date. 

### Title and Text (with Markdown)

In the Journal Editor:

- Title field at the top, multi-line, can be pre-filled with a prompt text for new entries. 
- Main body field supports Markdown formatting and can switch between **Edit mode** and **Preview mode** using an eye icon. 

In Preview mode, if there’s no text yet, you’ll see a helpful mini-guide showing examples of Markdown syntax (headers, lists, bold, italic) and how to toggle preview. 

Markdown examples you can use:

- `# Heading` for big headings. 
- `## Subheading` for smaller headings. 
- `- List item` for bullet lists. 
- `**bold**` and `*italic*` for emphasis. 

This lets you keep your entries structured without complicated editors.

### Mood Tracking

Under the main editor, you’ll find the **Mood Selector**. 

- A horizontal list of small emoji buttons like Grateful, Happy, Calm, Anxious, Frustrated, etc. 
- These moods are based on psychology-informed categories to help you become more aware of your emotional state. 
- You can tap a mood to select it, or tap again / “Clear” to remove it. 

This mood is saved with the entry and later:

- Shown as a badge in Journal Detail. 
- Used in weekly summaries to highlight your top moods. 
- Displayed as emojis in the recent days row on Home. 

### Adding Images

You can attach photos to your entry:

- Use “Add Image” (or the attachments section when you already have images). 
- The app uses the system image picker and then converts images to base64 to store them alongside encrypted text. 
- You can delete individual images from the attachments section with a small ✕ button. 

Attached images:

- Show as a horizontal gallery in the editor. 
- Show as a grid or full-width layout in the Journal Detail screen. 
- Can be tapped to open a full-screen image viewer. 

### Saving Behavior (and Auto-Save Style)

The editor is careful about saving so you don’t lose your writing:

- An internal `handleSave` function validates that you’ve written something before saving. 
- On Android back button inside the editor, it triggers a save and then goes back, showing you a friendly alert that the entry has been saved securely if changes were made. 
- The editor also attempts periodic save-like behavior on focus changes and when fields change, so your latest state is kept as much as possible. 

Entries are encrypted and written into your local vault using your current encryption key. 

***

## 5. Viewing and Reflecting on Your Entries

### Journal List

From Home (Quick actions, Recent days, or Calendar) you can open the Journal List screen. 

There, you can:

- See all entries, or entries for a specific date. 
- Open a specific entry to see its full detail. 

### Journal Detail View

The Journal Detail screen focuses on readability and reflection. 

It includes:

- Date and time of the entry, with icons. 
- Mood badge with emoji and label if you selected one. 
- A big title (or “Untitled Entry” if you didn’t set one). 
- Images displayed as a responsive grid or full-width image. 
- Markdown-rendered content with nice typography. 

You can:

- Tap an image for a full-screen zoomable view. 
- Edit the entry via the “Edit Entry” button. 
- Delete the entry using the “Delete” button in the floating bottom bar. 
  - Deletion is confirmed via an “Are you sure?” alert. 

### Weekly Review

Weekly Review helps you see patterns over the week. 

- The app builds a weekly summary based on your journals: entry count, how many days you wrote, and top mood. 
- Home shows a Weekly Review Story card that you can tap to open the full Weekly Review screen. 
- It automatically marks when you’ve viewed a week’s review, so it doesn’t spam you. 

This is where your streaks and moods become more meaningful than random scribbles.

***

## 6. Exporting and Importing Your Data

Enchronofy gives you control over your data with flexible export/import options. 

### Export Formats

From Home → Quick actions → Import/Export → Export Journals, you can export your journals. 

You can:

- **Select entries**  
  - Export all entries, or  
  - Filter by date range (start & end date, using ISO `YYYY-MM-DD` format in text fields). 

- **Choose format**:
  1. **Encrypted Backup**  
     - Password-protected export file. 
     - Uses a separate password you set at export time. 
     - Best for full backups and moving to other devices. 

  2. **JSON**  
     - A structured data file containing your entries and metadata. 
     - Great if you’re a developer or want to move data into another app or script. 

  3. **Markdown Text**  
     - All entries exported as Markdown, preserving headings, lists, and formatting. 

  4. **PDF**  
     - Nicely styled PDF with headers, dates, mood tags, images, summaries, and typography defined by a dedicated stylesheet. 

Images are embedded in exports where applicable. 

There’s also a clear warning:

- Plain exports (JSON, text, PDF) are not encrypted; you must keep them safe. 
- Encrypted Backup is recommended for privacy-sensitive backups. 

On mobile platforms, exports are shared using the platform’s share sheet, so you can “Save to Files” or share to your preferred storage. 

### Importing

From the same Import/Export screen, there’s an **Import Existing Journals** card. 

- You can import from compatible encrypted backups or JSON files produced by this app. 
- Import uses the same secure mechanisms and respects your vault’s encryption. 

That means you can move your journaling life between devices without moving to “the cloud”.

***

## 7. Privacy & Security Features

This is where Enchronofy is a bit obsessive, in a good way.

### On-Device Encryption

- Your journals are stored in an encrypted SQLite vault, with keys derived using a high iteration count and salts. 
- All sensitive data – vault, settings, security question answers, recovery key hash – are stored under namespaced keys tied to a consistent app prefix. 

### Screen Protection

The app uses a screen protection hook on the main stack. 

- Prevents screenshots and screen recording while you’re in the main (authenticated) part of the app. 
- On Android it sets `FLAG_SECURE` so your recent apps view shows a protected screen instead of your private text. 
- On iOS it blocks screen recording of sensitive screens. 

In short: someone standing behind you with a camera has to work a lot harder.

### Auto-Lock and Logout

- There are configurable lock timeout options (1 min, 5 min, 15 min, 30 min, 1 hour) to auto-lock the app after inactivity. 
- There’s a quick lock/logout button in the header of the main screens to immediately lock the vault. 

### No Forced Cloud Sync

- Journals are intentionally stored locally and encrypted. 
- Any backup/export is explicit and under your control. 

If you’ve ever thought “I wish this diary didn’t secretly sync to 14 servers,” this is that wish fulfilled.

***

## 8. Settings, Themes, and Personalization

### Themes

- Enchronofy respects your system theme (light/dark) or lets you override it in settings. 
- It uses a ThemeProvider based on React Native Paper’s light and dark themes. 

So your journaling screen can match your night-mode coding aesthetic or your daytime reading vibe.

### Notifications

On supported platforms, the app requests notification permissions at signup to later remind you to journal. 
If permissions are denied, it gently nudges you to enable them in device settings. 

### Personalize the App
Enchronofy supports Light, Dark, and “Auto” theme modes, where Auto follows your device’s current color scheme. 
This is handled centrally via the app’s ThemeProvider, so the look stays consistent across screens (no random “why is *this* page neon” surprises). 

- If you prefer the app to match your phone: set theme to **auto**. 
- If your eyes prefer peace at 2 AM: choose dark theme. 

### Time, Dates, and “I Swear It Was Yesterday”
The app includes a cross-platform time picker: native picker on Android/iOS, and an HTML time input on web. 
Times are stored/handled in a “HH:mm” format (example: “20:00”), but displayed in a friendly AM/PM style in the UI. 

Practical use cases:
- Backfill an entry you forgot to write when you were busy being a functional adult.
- Log multiple entries in a day and keep the timeline accurate without guesswork.

### Privacy Protections (Your Journal Is Not a Public Billboard)
The app includes a screen-protection hook that prevents screenshots/screen recording while protected screens are mounted, and re-allows capture when leaving those screens. 
On Android this uses FLAG_SECURE behavior (black in Recents, no screenshots), and it also re-applies protection on screen focus for extra safety. 

Good privacy habits (low effort, high payoff):
- Turn on a short auto-lock timeout if you journal in public places. 
- Assume your phone will be grabbed by a curious cousin at some point, and plan accordingly.

***

## 9. How to Use Enchronofy Effectively (Psychology-Aware Tips)

Enchronofy is built around practices shown to help mental well-being and clarity.

Here’s how to get more out of it:

- **Write daily, not perfectly**  
  - Use the streaks and the “New entry” quick action to write even a few lines. 
  - Your brain cares more about the habit than about literary quality.

- **Track your mood honestly**  
  - Use the mood selector each time, especially when you’re not feeling great. 
  - Over time, Weekly Review and calendar moods help you see patterns (e.g., Sundays are “anxious”, Fridays are “relieved”). 

- **Use prompts when stuck**  
  - If the blank page scares you, just tap Today’s Prompt or shuffle for a new one. 
  - You can use the prompt as the title and let that guide your writing. 

- **Reflect weekly**  
  - Open Weekly Review and skim your week: what did you feel most? When did you write most? What changed? 
  - This short reflection strengthens self-awareness and emotional regulation. 

- **Keep exports secure**  
  - Use Encrypted Backup for serious backups. 
  - If you export as JSON, Markdown, or PDF, treat those files like a physical diary lying open on your desk. 

And remember: your future self will probably be kinder to you than you are now, so give them something real to read.

***

## 10. Common Questions (Quick FAQs)

**Q: Do I need internet to use Enchronofy?**  
No. Journaling, viewing, mood tracking, and most features work completely offline. 

**Q: Where is my data stored?**  
On your device, in an encrypted vault which uses SQLite in Android. 

**Q: What if I forget my password?**  
Use either security questions or your recovery key in the Password Recovery screen to reset it. 

**Q: Can I move to another device?**  
Yes. Export an encrypted backup or JSON file, move it manually, and import it on the new device. 

**Q: Can someone take screenshots of my journals?**  
The app actively blocks screenshots and screen recording while you’re in the main journaling area (platform permitting). 

**Q: How do lock timeouts work?**  
Choose from 1 minute to 1 hour auto-lock options, or enable "Instant Lock" to lock immediately when you leave the app. 

**Q: Can I change my password after signup?**  
Yes, in Settings. Enter your current password, then set a new one (minimum 8 characters). Your journals stay intact. 

**Q: What happens if I reset the app?**  
The app forces you to create an encrypted backup first, so you can restore your journals later. 

**Q: How do daily reminders work?**  
Toggle reminders in Settings and pick your preferred time (mobile only, not web). 

**Q: Can I import journals from other apps?**  
Only from Enchronofy's own JSON or encrypted backup files. Choose to skip or overwrite duplicates. 

**Q: What does "Instant Lock on Background" do?**  
Locks the app immediately when you switch away, ignoring the timeout setting. 

**Q: How are images stored securely?**  
Converted to base64 and encrypted with your journal text. Not accessible through your photo gallery. 

**Q: Can I see my encryption key?**  
No. It's derived from your password and only kept in memory while logged in, never displayed. 

**Q: What's "auto" theme?**  
Follows your device's light/dark mode. Or pick "light" or "dark" to override it. 

**Q: Why can't I journal future dates?**  
To keep journaling authentic. A "Todo & Reminders" feature is coming for future planning. 

**Q: How does Weekly Review work?**  
Tracks your last 7 days: total entries, days written, most common mood, and activity timeline. 

**Q: Do notifications work on web?**  
No, they require native mobile APIs. Mobile only. 

**Q: Can I use Markdown everywhere?**  
In journal body text, yes. Titles stay plain for clean scanning. 

**Q: How long does encrypted export take?**  
Usually a few seconds for hundreds of entries. Progress indicator shows while processing. 

**Q: What if I lose my phone?**  
If you have an encrypted backup stored safely, restore it on a new device via Import. No backup = no recovery. 
