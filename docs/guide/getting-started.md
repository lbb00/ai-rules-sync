# Getting Started

## Installation

### Via npm (Recommended)

```bash
npm install -g ai-rules-sync
```

### Via Homebrew (macOS)

```bash
brew tap lbb00/ai-rules-sync https://github.com/lbb00/ai-rules-sync
brew install ais
```

Or one-off install without tap:

```bash
brew install --formula https://raw.githubusercontent.com/lbb00/ai-rules-sync/main/Formula/ais.rb
```

### Verify Installation

```bash
ais --version
```

### Enable Tab Completion (Optional)

```bash
ais completion install
```

## Quick Start

### Scenario 1: Use Existing Rules

You have a rules repository and want to use its rules in your project.

```bash
# 1. Go to your project
cd your-project

# 2. Add a rule (specify repository URL the first time)
ais cursor add react -t https://github.com/your-org/rules-repo.git

# Done! The rule is now linked to your project
```

What happened:
- AIS cloned the repository to `~/.config/ai-rules-sync/repos/`
- Set it as your current repository
- Created a symlink: `rules-repo/.cursor/rules/react` → `your-project/.cursor/rules/react`
- Saved the configuration to [`ai-rules-sync.json`](/reference/configuration)

Next time, you can omit the `-t` flag:

```bash
ais cursor add vue
ais cursor add testing
```

### Scenario 2: Share Your Existing Rules

You have rules in your project and want to share them via a repository.

```bash
# 1. Create a rules repository
mkdir ~/my-rules-repo && cd ~/my-rules-repo
git init
ais init
ais use .

# 2. Import your existing rule
cd your-project
ais cursor rules import my-custom-rule

# Done! Your rule is now in the repository and linked
```

### Scenario 3: Join a Team Project

Clone a project that already uses AIS:

```bash
git clone https://github.com/team/project.git
cd project
ais install
# All rules are now set up!
```
