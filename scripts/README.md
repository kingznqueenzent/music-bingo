# Push to GitHub

**One-time setup:** Create a new **repository** (not Project) on GitHub named `music-bingo`:  
https://github.com/new → Repository name: `music-bingo` → Create repository.

**Then run:**

```powershell
cd "c:\Users\archi\OneDrive\Desktop\music-bingo"
.\scripts\push-to-github.ps1
```

If you see "Git is not installed", install Git first: https://git-scm.com/download/win  
Then open a **new** PowerShell window and run the script again.

**If your GitHub repo has a different name or username**, edit `scripts\push-to-github.ps1` and change the `$remoteUrl` line to your repo URL (e.g. `https://github.com/YOUR_USERNAME/YOUR_REPO.git`).
