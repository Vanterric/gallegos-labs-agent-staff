# GitHub App push auth

OpenClaw should refresh the git remote with a fresh GitHub App installation token before any push.

## Local helper

Use the helper stored on the Mac mini:

```sh
/Users/derrick/openclaw-staff/github-refresh-remote.sh /Users/derrick/gallegos-labs-agent-staff Vanterric/gallegos-labs-agent-staff
```

That script:
- generates a fresh installation token via `/Users/derrick/openclaw-staff/github-token.sh`
- updates `origin` to use `https://x-access-token:TOKEN@github.com/Vanterric/gallegos-labs-agent-staff.git`

## Commit attribution

For bot-attributed test commits, use:

- name: `gallegos-labs-agent-staff[bot]`
- email: `272805015+gallegos-labs-agent-staff[bot]@users.noreply.github.com`

## Push flow

```sh
/Users/derrick/openclaw-staff/github-refresh-remote.sh /Users/derrick/gallegos-labs-agent-staff Vanterric/gallegos-labs-agent-staff
git checkout -b your-branch
git add .
git -c user.name='gallegos-labs-agent-staff[bot]' \
    -c user.email='272805015+gallegos-labs-agent-staff[bot]@users.noreply.github.com' \
    commit -m 'chore: test GitHub App push auth'
git push -u origin your-branch
```
