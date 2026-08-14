import os
import sys
import json
import subprocess
import urllib.request
import urllib.error

def run_cmd(cmd, cwd=None):
    """Executes a shell command and returns output or raises error."""
    res = subprocess.run(cmd, shell=True, cwd=cwd, text=True, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\nError: {res.stderr}")
    return res.stdout.strip()

def main():
    print("=" * 65)
    print("🚀 AUTOMATED GITHUB REPOSITORY CREATOR & PAGES DEPLOYER")
    print("   Created for MD. Mahinur Rahman Prachurza (Prachurza)")
    print("=" * 65)
    print()

    # Step 1: Soliciting user credentials
    username = input("Enter your GitHub Username: ").strip()
    if not username:
        print("❌ Username cannot be empty.")
        sys.exit(1)

    token = input("Enter your GitHub Personal Access Token (PAT): ").strip()
    if not token:
        print("❌ Access token cannot be empty.")
        sys.exit(1)

    repo_name = input("Enter Repository Name (default: hsc-college-selection): ").strip()
    if not repo_name:
        repo_name = "hsc-college-selection"

    project_dir = os.path.abspath(os.path.dirname(__file__))

    print(f"\n📦 Target Repository: https://github.com/{username}/{repo_name}")
    print("⌛ Creating GitHub repository via GitHub REST API...")

    # Step 2: Create Repository via GitHub API
    create_repo_url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Prachurza-Deployer/1.0"
    }
    payload = json.dumps({
        "name": repo_name,
        "description": "Editorial HSC College Selection Index for SSC-26 Students by MD. Mahinur Rahman Prachurza & Fahad's Tutorial",
        "private": False,
        "auto_init": False
    }).encode("utf-8")

    req = urllib.request.Request(create_repo_url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"✅ Repository created successfully: {data.get('html_url')}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        if e.code == 422:
            print(f"ℹ️ Repository '{repo_name}' already exists on GitHub. Continuing with push...")
        else:
            print(f"❌ Failed to create repository (HTTP {e.code}): {err_body}")
            sys.exit(1)

    # Step 3: Initialize Git & Push Code
    print("\n⚙️ Initializing local Git repository and pushing code...")
    try:
        run_cmd("git init", cwd=project_dir)
        run_cmd("git add .", cwd=project_dir)
        
        # Check if there is anything to commit
        status = run_cmd("git status --porcelain", cwd=project_dir)
        if status:
            run_cmd('git commit -m "Initial release - HSC College Selection Portal by Prachurza & FT"', cwd=project_dir)
        
        run_cmd("git branch -M main", cwd=project_dir)
        
        # Set authenticated remote URL
        remote_url = f"https://{token}@github.com/{username}/{repo_name}.git"
        
        # Check existing remote
        remotes = run_cmd("git remote", cwd=project_dir)
        if "origin" in remotes.splitlines():
            run_cmd(f'git remote set-url origin "{remote_url}"', cwd=project_dir)
        else:
            run_cmd(f'git remote add origin "{remote_url}"', cwd=project_dir)

        print("📤 Pushing main branch to GitHub...")
        run_cmd("git push -u origin main --force", cwd=project_dir)
        print("✅ Code successfully pushed to GitHub!")

    except Exception as ex:
        print(f"❌ Git Operation Error: {ex}")
        sys.exit(1)

    # Step 4: Enable GitHub Pages via API
    print("\n🌐 Enabling GitHub Pages automatically...")
    pages_url = f"https://api.github.com/repos/{username}/{repo_name}/pages"
    pages_payload = json.dumps({
        "source": {
            "branch": "main",
            "path": "/"
        }
    }).encode("utf-8")

    req_pages = urllib.request.Request(pages_url, data=pages_payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req_pages) as resp:
            data = json.loads(resp.read().decode())
            html_url = data.get("html_url", f"https://{username}.github.io/{repo_name}/")
            print(f"✅ GitHub Pages enabled! Live Site URL: {html_url}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f"ℹ️ GitHub Pages is already enabled. Site URL: https://{username}.github.io/{repo_name}/")
        else:
            print(f"⚠️ Pages API Notice (HTTP {e.code}): Enable GitHub Pages manually under Repo Settings -> Pages.")

    # Clean up token from git remote config for safety
    try:
        clean_remote = f"https://github.com/{username}/{repo_name}.git"
        run_cmd(f'git remote set-url origin "{clean_remote}"', cwd=project_dir)
    except Exception:
        pass

    print("\n" + "=" * 65)
    print("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!")
    print(f"   Live Website URL: https://{username}.github.io/{repo_name}/")
    print("=" * 65)

    # Self-deletion step
    script_path = os.path.abspath(__file__)
    print("\n🧹 Self-deleting deployment script for security...")
    try:
        os.remove(script_path)
        print("✅ Script deleted cleanly.")
    except Exception as e:
        print(f"⚠️ Could not delete script: {e}")

if __name__ == "__main__":
    main()
