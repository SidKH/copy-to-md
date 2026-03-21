# Privacy policy — Copy to md

**Last updated:** March 21, 2026

This policy describes how the **Copy to md** browser extension (“the extension”) handles information.

## Summary

The extension helps you copy a **Reddit thread** as **Markdown**. It reads the **URL of the active browser tab** when you open the extension and may **fetch public thread data from Reddit** over HTTPS. It does **not** sell your data, run advertising analytics, or require you to create an account for the extension.

## Data the extension uses

### Active tab URL

When you **open the extension’s popup**, it uses the `tabs` permission to read the **URL of the tab you are viewing**. That is used only to:

- Check whether you are on a **Reddit thread page** the extension supports, and  
- Build the correct request to Reddit’s **public JSON** for that thread.

The extension does **not** read your browsing history, bookmarks, or tabs you are not using with the popup in this way.

### Network requests to Reddit

If you are on a supported Reddit thread, the extension **fetches public thread JSON** from **reddit.com** / **www.reddit.com** (for example, the `.json` representation of the thread). Those requests go **directly between your browser and Reddit** over HTTPS.

The extension author does **not** operate a separate backend server that receives your thread content for this core behavior.

### Local processing

Thread data is **converted to Markdown on your device** in the extension popup. The extension does **not** use cloud storage provided by the developer for this purpose.

## Data we do not collect

For the behavior described above, the extension does **not**:

- Require login to the extension  
- Use extension storage (`chrome.storage`) for personal profiles in the current implementation  
- Embed third-party advertising or analytics SDKs in the shipped extension  

If this changes in a future version, this policy will be updated.

## Third parties

**Reddit** receives requests when the extension asks for thread JSON, under Reddit’s own terms and infrastructure. This extension is **not** affiliated with Reddit.

## Contact

For privacy questions about this extension, open an issue on the project’s **GitHub repository** or contact the publisher through the **Chrome Web Store** listing.

## Changes

We may update this policy when the extension changes. The “Last updated” date at the top will reflect substantive edits.
