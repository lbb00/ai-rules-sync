/**
 * Shell completion scripts for bash, zsh, and fish
 */

export const bashScript = `
# ais bash completion
_ais_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"
  local pprev="\${COMP_WORDS[COMP_CWORD-2]}"
  local ppprev="\${COMP_WORDS[COMP_CWORD-3]}"

  # cursor commands add
  if [[ "\$ppprev" == "cursor" && "\$pprev" == "commands" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete cursor-commands 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # cursor add
  if [[ "\$pprev" == "cursor" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete cursor 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # copilot instructions add
  if [[ "\$ppprev" == "copilot" && "\$pprev" == "instructions" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete copilot-instructions 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # copilot skills add
  if [[ "\$ppprev" == "copilot" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete copilot-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # claude skills add
  if [[ "\$ppprev" == "claude" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete claude-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # claude agents add
  if [[ "\$ppprev" == "claude" && "\$pprev" == "agents" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete claude-agents 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # trae rules add
  if [[ "\$ppprev" == "trae" && "\$pprev" == "rules" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete trae-rules 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # trae skills add
  if [[ "\$ppprev" == "trae" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete trae-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # cursor skills add
  if [[ "\$ppprev" == "cursor" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete cursor-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # cursor agents add
  if [[ "\$ppprev" == "cursor" && "\$pprev" == "agents" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete cursor-agents 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # cursor rules add
  if [[ "\$pprev" == "rules" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete cursor 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # cursor commands
  if [[ "\$pprev" == "cursor" && "\$prev" == "commands" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # cursor skills
  if [[ "\$pprev" == "cursor" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # cursor agents
  if [[ "\$pprev" == "cursor" && "\$prev" == "agents" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # cursor rules
  if [[ "\$pprev" == "cursor" && "\$prev" == "rules" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # claude skills
  if [[ "\$pprev" == "claude" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # claude agents
  if [[ "\$pprev" == "claude" && "\$prev" == "agents" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # trae rules
  if [[ "\$pprev" == "trae" && "\$prev" == "rules" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # trae skills
  if [[ "\$pprev" == "trae" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # agents-md add
  if [[ "\$pprev" == "agents-md" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete agents-md 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # opencode agents
  if [[ "\$ppprev" == "opencode" && "\$pprev" == "agents" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete opencode-agents 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # opencode skills
  if [[ "\$ppprev" == "opencode" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete opencode-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # opencode commands
  if [[ "\$ppprev" == "opencode" && "\$pprev" == "commands" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete opencode-commands 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # opencode tools
  if [[ "\$ppprev" == "opencode" && "\$pprev" == "tools" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete opencode-tools 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # codex rules add
  if [[ "\$ppprev" == "codex" && "\$pprev" == "rules" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete codex-rules 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # codex skills add
  if [[ "\$ppprev" == "codex" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete codex-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # gemini commands add
  if [[ "\$ppprev" == "gemini" && "\$pprev" == "commands" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete gemini-commands 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # gemini skills add
  if [[ "\$ppprev" == "gemini" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete gemini-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # gemini agents add
  if [[ "\$ppprev" == "gemini" && "\$pprev" == "agents" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete gemini-agents 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # warp skills add
  if [[ "\$ppprev" == "warp" && "\$pprev" == "skills" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete warp-skills 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # agents-md
  if [[ "\$pprev" == "agents-md" && "\$prev" == "add" ]]; then
    COMPREPLY=( $(compgen -W "$(ais _complete agents-md 2>/dev/null)" -- "\$cur") )
    return 0
  fi

  # opencode agents
  if [[ "\$pprev" == "opencode" && "\$prev" == "agents" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # opencode skills
  if [[ "\$pprev" == "opencode" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # opencode commands
  if [[ "\$pprev" == "opencode" && "\$prev" == "commands" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # opencode tools
  if [[ "\$pprev" == "opencode" && "\$prev" == "tools" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # codex rules
  if [[ "\$pprev" == "codex" && "\$prev" == "rules" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # codex skills
  if [[ "\$pprev" == "codex" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # gemini commands
  if [[ "\$pprev" == "gemini" && "\$prev" == "commands" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # gemini skills
  if [[ "\$pprev" == "gemini" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # gemini agents
  if [[ "\$pprev" == "gemini" && "\$prev" == "agents" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # warp skills
  if [[ "\$pprev" == "warp" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # agents-md
  if [[ "\$prev" == "agents-md" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "cursor" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import rules commands skills agents" -- "\$cur") )
    return 0
  fi

  # copilot instructions
  if [[ "\$pprev" == "copilot" && "\$prev" == "instructions" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  # copilot skills
  if [[ "\$pprev" == "copilot" && "\$prev" == "skills" ]]; then
    COMPREPLY=( $(compgen -W "add remove install import" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "copilot" ]]; then
    COMPREPLY=( $(compgen -W "instructions skills install" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "claude" ]]; then
    COMPREPLY=( $(compgen -W "skills agents install" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "trae" ]]; then
    COMPREPLY=( $(compgen -W "rules skills install" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "opencode" ]]; then
    COMPREPLY=( $(compgen -W "agents skills commands tools install import" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "codex" ]]; then
    COMPREPLY=( $(compgen -W "rules skills install import" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "gemini" ]]; then
    COMPREPLY=( $(compgen -W "commands skills agents install add-all import" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "warp" ]]; then
    COMPREPLY=( $(compgen -W "skills install import" -- "\$cur") )
    return 0
  fi

  if [[ "\$prev" == "ais" ]]; then
    COMPREPLY=( $(compgen -W "cursor copilot claude trae opencode codex gemini warp agents-md use list git add remove install import completion" -- "\$cur") )
    return 0
  fi
}
complete -F _ais_complete ais
`;

export const zshScript = `
# ais zsh completion
_ais() {
  local -a subcmds
subcmds=(
    'cursor:Manage Cursor rules, commands, and skills'
    'copilot:Manage Copilot instructions'
    'claude:Manage Claude skills, agents, and plugins'
    'trae:Manage Trae rules and skills'
    'opencode:Manage OpenCode agents, skills, commands, and tools'
    'codex:Manage Codex rules and skills'
    'gemini:Manage Gemini CLI commands, skills, and agents'
    'warp:Manage Warp agent skills'
    'agents-md:Manage AGENTS.md files (agents.md standard)'
    'use:Configure rules repository'
    'list:List configured repositories'
    'git:Run git commands in rules repository'
    'add:Add a rule (smart dispatch)'
    'remove:Remove a rule (smart dispatch)'
    'install:Install all rules (smart dispatch)'
    'import:Import entry to rules repository'
    'completion:Output shell completion script'
  )

  local -a cursor_subcmds copilot_subcmds claude_subcmds trae_subcmds opencode_subcmds codex_subcmds gemini_subcmds warp_subcmds agents_md_subcmds cursor_rules_subcmds cursor_commands_subcmds cursor_skills_subcmds cursor_agents_subcmds copilot_instructions_subcmds copilot_skills_subcmds claude_skills_subcmds claude_agents_subcmds trae_rules_subcmds trae_skills_subcmds opencode_agents_subcmds opencode_skills_subcmds opencode_commands_subcmds opencode_tools_subcmds codex_rules_subcmds codex_skills_subcmds gemini_commands_subcmds gemini_skills_subcmds gemini_agents_subcmds warp_skills_subcmds
  cursor_subcmds=('add:Add a Cursor rule' 'remove:Remove a Cursor rule' 'install:Install all Cursor entries' 'import:Import entry to repository' 'rules:Manage rules explicitly' 'commands:Manage commands' 'skills:Manage skills' 'agents:Manage agents')
  copilot_subcmds=('instructions:Manage Copilot instructions' 'skills:Manage Copilot skills' 'install:Install all Copilot entries')
  copilot_instructions_subcmds=('add:Add a Copilot instruction' 'remove:Remove a Copilot instruction' 'install:Install all Copilot instructions' 'import:Import instruction to repository')
  copilot_skills_subcmds=('add:Add a Copilot skill' 'remove:Remove a Copilot skill' 'install:Install all Copilot skills' 'import:Import skill to repository')
  claude_subcmds=('skills:Manage Claude skills' 'agents:Manage Claude agents' 'install:Install all Claude components')
  trae_subcmds=('rules:Manage Trae rules' 'skills:Manage Trae skills' 'install:Install all Trae entries')
  opencode_subcmds=('agents:Manage OpenCode agents' 'skills:Manage OpenCode skills' 'commands:Manage OpenCode commands' 'tools:Manage OpenCode tools' 'install:Install all OpenCode entries' 'import:Import entry to repository')
  agents_md_subcmds=('add:Add an AGENTS.md file' 'remove:Remove an AGENTS.md file' 'install:Install AGENTS.md' 'import:Import AGENTS.md to repository')
  cursor_rules_subcmds=('add:Add a Cursor rule' 'remove:Remove a Cursor rule' 'install:Install all Cursor rules' 'import:Import rule to repository')
  cursor_commands_subcmds=('add:Add a Cursor command' 'remove:Remove a Cursor command' 'install:Install all Cursor commands' 'import:Import command to repository')
  cursor_skills_subcmds=('add:Add a Cursor skill' 'remove:Remove a Cursor skill' 'install:Install all Cursor skills' 'import:Import skill to repository')
  cursor_agents_subcmds=('add:Add a Cursor agent' 'remove:Remove a Cursor agent' 'install:Install all Cursor agents' 'import:Import agent to repository')
  claude_skills_subcmds=('add:Add a Claude skill' 'remove:Remove a Claude skill' 'install:Install all Claude skills' 'import:Import skill to repository')
  claude_agents_subcmds=('add:Add a Claude agent' 'remove:Remove a Claude agent' 'install:Install all Claude agents' 'import:Import agent to repository')
  trae_rules_subcmds=('add:Add a Trae rule' 'remove:Remove a Trae rule' 'install:Install all Trae rules' 'import:Import rule to repository')
  trae_skills_subcmds=('add:Add a Trae skill' 'remove:Remove a Trae skill' 'install:Install all Trae skills' 'import:Import skill to repository')
  opencode_agents_subcmds=('add:Add an OpenCode agent' 'remove:Remove an OpenCode agent' 'install:Install all OpenCode agents' 'import:Import agent to repository')
  opencode_skills_subcmds=('add:Add an OpenCode skill' 'remove:Remove an OpenCode skill' 'install:Install all OpenCode skills' 'import:Import skill to repository')
  opencode_commands_subcmds=('add:Add an OpenCode command' 'remove:Remove an OpenCode command' 'install:Install all OpenCode commands' 'import:Import command to repository')
  opencode_tools_subcmds=('add:Add an OpenCode tool' 'remove:Remove an OpenCode tool' 'install:Install all OpenCode tools' 'import:Import tool to repository')
  codex_subcmds=('rules:Manage Codex rules' 'skills:Manage Codex skills' 'install:Install all Codex entries' 'import:Import entry to repository')
  codex_rules_subcmds=('add:Add a Codex rule' 'remove:Remove a Codex rule' 'install:Install all Codex rules' 'import:Import rule to repository')
  codex_skills_subcmds=('add:Add a Codex skill' 'remove:Remove a Codex skill' 'install:Install all Codex skills' 'import:Import skill to repository')
  gemini_subcmds=('commands:Manage Gemini commands' 'skills:Manage Gemini skills' 'agents:Manage Gemini agents' 'install:Install all Gemini entries' 'add-all:Add all Gemini entries' 'import:Import entry to repository')
  gemini_commands_subcmds=('add:Add a Gemini command' 'remove:Remove a Gemini command' 'install:Install all Gemini commands' 'import:Import command to repository')
  gemini_skills_subcmds=('add:Add a Gemini skill' 'remove:Remove a Gemini skill' 'install:Install all Gemini skills' 'import:Import skill to repository')
  gemini_agents_subcmds=('add:Add a Gemini agent' 'remove:Remove a Gemini agent' 'install:Install all Gemini agents' 'import:Import agent to repository')
  warp_subcmds=('skills:Manage Warp skills' 'install:Install all Warp entries' 'import:Import entry to repository')
  warp_skills_subcmds=('add:Add a Warp skill' 'remove:Remove a Warp skill' 'install:Install all Warp skills' 'import:Import skill to repository')

  _arguments -C \\
    '1:command:->command' \\
    '2:subcommand:->subcommand' \\
    '3:subsubcommand:->subsubcommand' \\
    '4:name:->name' \\
    '*::arg:->args'

  case "\$state" in
    command)
      _describe 'command' subcmds
      ;;
    subcommand)
      case "\$words[2]" in
        cursor)
          _describe 'subcommand' cursor_subcmds
          ;;
        copilot)
          _describe 'subcommand' copilot_subcmds
          ;;
        claude)
          _describe 'subcommand' claude_subcmds
          ;;
        trae)
          _describe 'subcommand' trae_subcmds
          ;;
        opencode)
          _describe 'subcommand' opencode_subcmds
          ;;
        codex)
          _describe 'subcommand' codex_subcmds
          ;;
        gemini)
          _describe 'subcommand' gemini_subcmds
          ;;
        warp)
          _describe 'subcommand' warp_subcmds
          ;;
        agents-md)
          _describe 'subcommand' agents_md_subcmds
          ;;
      esac
      ;;
    subsubcommand)
      case "\$words[2]" in
        cursor)
          case "\$words[3]" in
            add)
              local -a rules
              rules=(\${(f)"\$(ais _complete cursor 2>/dev/null)"})
              if (( \$#rules )); then
                compadd "\$rules[@]"
              fi
              ;;
            rules)
              _describe 'subsubcommand' cursor_rules_subcmds
              ;;
            commands)
              _describe 'subsubcommand' cursor_commands_subcmds
              ;;
            skills)
              _describe 'subsubcommand' cursor_skills_subcmds
              ;;
            agents)
              _describe 'subsubcommand' cursor_agents_subcmds
              ;;
            *)
              _describe 'subsubcommand' cursor_subcmds
              ;;
          esac
          ;;
        copilot)
          case "\$words[3]" in
            instructions)
              _describe 'subsubcommand' copilot_instructions_subcmds
              ;;
            skills)
              _describe 'subsubcommand' copilot_skills_subcmds
              ;;
            *)
              _describe 'subsubcommand' copilot_subcmds
              ;;
          esac
          ;;
        claude)
          case "\$words[3]" in
            skills)
              _describe 'subsubcommand' claude_skills_subcmds
              ;;
            agents)
              _describe 'subsubcommand' claude_agents_subcmds
              ;;
            *)
              _describe 'subsubcommand' claude_subcmds
              ;;
          esac
          ;;
        trae)
          case "\$words[3]" in
            rules)
              _describe 'subsubcommand' trae_rules_subcmds
              ;;
            skills)
              _describe 'subsubcommand' trae_skills_subcmds
              ;;
            *)
              _describe 'subsubcommand' trae_subcmds
              ;;
          esac
          ;;
        opencode)
          case "\$words[3]" in
            agents)
              _describe 'subsubcommand' opencode_agents_subcmds
              ;;
            skills)
              _describe 'subsubcommand' opencode_skills_subcmds
              ;;
            commands)
              _describe 'subsubcommand' opencode_commands_subcmds
              ;;
            tools)
              _describe 'subsubcommand' opencode_tools_subcmds
              ;;
            *)
              _describe 'subsubcommand' opencode_subcmds
              ;;
          esac
          ;;
        codex)
          case "\$words[3]" in
            rules)
              _describe 'subsubcommand' codex_rules_subcmds
              ;;
            skills)
              _describe 'subsubcommand' codex_skills_subcmds
              ;;
            *)
              _describe 'subsubcommand' codex_subcmds
              ;;
          esac
          ;;
        gemini)
          case "\$words[3]" in
            commands)
              _describe 'subsubcommand' gemini_commands_subcmds
              ;;
            skills)
              _describe 'subsubcommand' gemini_skills_subcmds
              ;;
            agents)
              _describe 'subsubcommand' gemini_agents_subcmds
              ;;
            *)
              _describe 'subsubcommand' gemini_subcmds
              ;;
          esac
          ;;
        warp)
          case "\$words[3]" in
            skills)
              _describe 'subsubcommand' warp_skills_subcmds
              ;;
            *)
              _describe 'subsubcommand' warp_subcmds
              ;;
          esac
          ;;
        agents-md)
          case "\$words[3]" in
            add)
              local -a agents_md
              agents_md=(\${(f)"\$(ais _complete agents-md 2>/dev/null)"})
              if (( \$#agents_md )); then
                compadd "\$agents_md[@]"
              fi
              ;;
            *)
              _describe 'subsubcommand' agents_md_subcmds
              ;;
          esac
          ;;
      esac
      ;;
    name)
      case \"\$words[2]\" in
        cursor)
          case \"\$words[3]\" in
            add)
              local -a rules
              rules=(\${(f)\"$(ais _complete cursor 2>/dev/null)\"})
              if (( \$#rules )); then
                compadd \"\$rules[@]\"
              fi
              ;;
            rules)
              case \"\$words[4]\" in
                add)
                  local -a rules
                  rules=(\${(f)\"$(ais _complete cursor 2>/dev/null)\"})
                  if (( \$#rules )); then
                    compadd \"\$rules[@]\"
                  fi
                  ;;
              esac
              ;;
            commands)
              case "\$words[4]" in
                add)
                  local -a commands
                  commands=(\${(f)"$(ais _complete cursor-commands 2>/dev/null)"})
                  if (( \$#commands )); then
                    compadd "\$commands[@]"
                  fi
                  ;;
              esac
              ;;
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete cursor-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
            agents)
              case \"\$words[4]\" in
                add)
                  local -a agents
                  agents=(\${(f)\"$(ais _complete cursor-agents 2>/dev/null)\"})
                  if (( \$#agents )); then
                    compadd \"\$agents[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        copilot)
          case \"\$words[3]\" in
            instructions)
              case \"\$words[4]\" in
                add)
                  local -a instructions
                  instructions=(\${(f)\"$(ais _complete copilot-instructions 2>/dev/null)\"})
                  if (( \$#instructions )); then
                    compadd \"\$instructions[@]\"
                  fi
                  ;;
              esac
              ;;
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete copilot-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        claude)
          case \"\$words[3]\" in
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete claude-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
            agents)
              case \"\$words[4]\" in
                add)
                  local -a agents
                  agents=(\${(f)\"$(ais _complete claude-agents 2>/dev/null)\"})
                  if (( \$#agents )); then
                    compadd \"\$agents[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        trae)
          case \"\$words[3]\" in
            rules)
              case \"\$words[4]\" in
                add)
                  local -a rules
                  rules=(\${(f)\"$(ais _complete trae-rules 2>/dev/null)\"})
                  if (( \$#rules )); then
                    compadd \"\$rules[@]\"
                  fi
                  ;;
              esac
              ;;
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete trae-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        opencode)
          case \"\$words[3]\" in
            agents)
              case \"\$words[4]\" in
                add)
                  local -a agents
                  agents=(\${(f)\"$(ais _complete opencode-agents 2>/dev/null)\"})
                  if (( \$#agents )); then
                    compadd \"\$agents[@]\"
                  fi
                  ;;
              esac
              ;;
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete opencode-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
            commands)
              case \"\$words[4]\" in
                add)
                  local -a commands
                  commands=(\${(f)\"$(ais _complete opencode-commands 2>/dev/null)\"})
                  if (( \$#commands )); then
                    compadd \"\$commands[@]\"
                  fi
                  ;;
              esac
              ;;
            tools)
              case \"\$words[4]\" in
                add)
                  local -a tools
                  tools=(\${(f)\"$(ais _complete opencode-tools 2>/dev/null)\"})
                  if (( \$#tools )); then
                    compadd \"\$tools[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        codex)
          case \"\$words[3]\" in
            rules)
              case \"\$words[4]\" in
                add)
                  local -a rules
                  rules=(\${(f)\"$(ais _complete codex-rules 2>/dev/null)\"})
                  if (( \$#rules )); then
                    compadd \"\$rules[@]\"
                  fi
                  ;;
              esac
              ;;
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete codex-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        gemini)
          case \"\$words[3]\" in
            commands)
              case \"\$words[4]\" in
                add)
                  local -a commands
                  commands=(\${(f)\"$(ais _complete gemini-commands 2>/dev/null)\"})
                  if (( \$#commands )); then
                    compadd \"\$commands[@]\"
                  fi
                  ;;
              esac
              ;;
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete gemini-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
            agents)
              case \"\$words[4]\" in
                add)
                  local -a agents
                  agents=(\${(f)\"$(ais _complete gemini-agents 2>/dev/null)\"})
                  if (( \$#agents )); then
                    compadd \"\$agents[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        warp)
          case \"\$words[3]\" in
            skills)
              case \"\$words[4]\" in
                add)
                  local -a skills
                  skills=(\${(f)\"$(ais _complete warp-skills 2>/dev/null)\"})
                  if (( \$#skills )); then
                    compadd \"\$skills[@]\"
                  fi
                  ;;
              esac
              ;;
          esac
          ;;
        agents-md)
          case \"\$words[3]\" in
            add)
              local -a agents_md
              agents_md=(\${(f)\"$(ais _complete agents-md 2>/dev/null)\"})
              if (( \$#agents_md )); then
                compadd \"\$agents_md[@]\"
              fi
              ;;
          esac
          ;;
      esac
      ;;
    args)
      # Handle additional arguments
      ;;
  esac
}

# Only define completion if compdef is available (zsh completion initialized)
command -v compdef >/dev/null 2>&1 && compdef _ais ais
`;

export const fishScript = `
# ais fish completion
complete -c ais -f

# Top-level commands
complete -c ais -n "__fish_use_subcommand" -a "cursor" -d "Manage Cursor rules, commands, and skills"
complete -c ais -n "__fish_use_subcommand" -a "copilot" -d "Manage Copilot instructions"
complete -c ais -n "__fish_use_subcommand" -a "claude" -d "Manage Claude skills, agents, and plugins"
complete -c ais -n "__fish_use_subcommand" -a "trae" -d "Manage Trae rules and skills"
complete -c ais -n "__fish_use_subcommand" -a "opencode" -d "Manage OpenCode agents, skills, commands, and tools"
complete -c ais -n "__fish_use_subcommand" -a "codex" -d "Manage Codex rules and skills"
complete -c ais -n "__fish_use_subcommand" -a "gemini" -d "Manage Gemini CLI commands, skills, and agents"
complete -c ais -n "__fish_use_subcommand" -a "warp" -d "Manage Warp agent skills"
complete -c ais -n "__fish_use_subcommand" -a "agents-md" -d "Manage AGENTS.md files (agents.md standard)"
complete -c ais -n "__fish_use_subcommand" -a "use" -d "Configure rules repository"
complete -c ais -n "__fish_use_subcommand" -a "list" -d "List configured repositories"
complete -c ais -n "__fish_use_subcommand" -a "git" -d "Run git commands in rules repository"
complete -c ais -n "__fish_use_subcommand" -a "add" -d "Add a rule (smart dispatch)"
complete -c ais -n "__fish_use_subcommand" -a "remove" -d "Remove a rule (smart dispatch)"
complete -c ais -n "__fish_use_subcommand" -a "install" -d "Install all rules (smart dispatch)"
complete -c ais -n "__fish_use_subcommand" -a "import" -d "Import entry to rules repository"
complete -c ais -n "__fish_use_subcommand" -a "completion" -d "Output shell completion script"

# cursor subcommands
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "add" -d "Add a Cursor rule"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "remove" -d "Remove a Cursor rule"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "install" -d "Install all Cursor entries"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "import" -d "Import entry to repository"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "rules" -d "Manage rules explicitly"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "commands" -d "Manage commands"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "skills" -d "Manage skills"
complete -c ais -n "__fish_seen_subcommand_from cursor; and not __fish_seen_subcommand_from add remove install import rules commands skills agents" -a "agents" -d "Manage agents"

# cursor rules subcommands
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Cursor rule"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Cursor rule"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Cursor rules"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import rule to repository"

# cursor commands subcommands
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Cursor command"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Cursor command"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Cursor commands"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import command to repository"

# cursor skills subcommands
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Cursor skill"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Cursor skill"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Cursor skills"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# cursor agents subcommands
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Cursor agent"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Cursor agent"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Cursor agents"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import agent to repository"

# copilot subcommands
complete -c ais -n "__fish_seen_subcommand_from copilot; and not __fish_seen_subcommand_from instructions skills install" -a "instructions" -d "Manage Copilot instructions"
complete -c ais -n "__fish_seen_subcommand_from copilot; and not __fish_seen_subcommand_from instructions skills install" -a "skills" -d "Manage Copilot skills"
complete -c ais -n "__fish_seen_subcommand_from copilot; and not __fish_seen_subcommand_from instructions skills install" -a "install" -d "Install all Copilot entries"

# copilot instructions subcommands
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from instructions; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Copilot instruction"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from instructions; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Copilot instruction"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from instructions; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Copilot instructions"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from instructions; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import instruction to repository"

# copilot skills subcommands
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Copilot skill"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Copilot skill"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Copilot skills"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# claude subcommands
complete -c ais -n "__fish_seen_subcommand_from claude; and not __fish_seen_subcommand_from skills agents install" -a "skills" -d "Manage Claude skills"
complete -c ais -n "__fish_seen_subcommand_from claude; and not __fish_seen_subcommand_from skills agents install" -a "agents" -d "Manage Claude agents"
complete -c ais -n "__fish_seen_subcommand_from claude; and not __fish_seen_subcommand_from skills agents install" -a "install" -d "Install all Claude components"

# trae subcommands
complete -c ais -n "__fish_seen_subcommand_from trae; and not __fish_seen_subcommand_from rules skills install" -a "rules" -d "Manage Trae rules"
complete -c ais -n "__fish_seen_subcommand_from trae; and not __fish_seen_subcommand_from rules skills install" -a "skills" -d "Manage Trae skills"
complete -c ais -n "__fish_seen_subcommand_from trae; and not __fish_seen_subcommand_from rules skills install" -a "install" -d "Install all Trae entries"

# claude skills subcommands
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Claude skill"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Claude skill"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Claude skills"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# claude agents subcommands
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Claude agent"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Claude agent"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Claude agents"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import agent to repository"

# trae rules subcommands
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Trae rule"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Trae rule"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Trae rules"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import rule to repository"

# trae skills subcommands
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Trae skill"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Trae skill"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Trae skills"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# opencode subcommands
complete -c ais -n "__fish_seen_subcommand_from opencode; and not __fish_seen_subcommand_from install import agents skills commands tools" -a "install" -d "Install all OpenCode entries"
complete -c ais -n "__fish_seen_subcommand_from opencode; and not __fish_seen_subcommand_from install import agents skills commands tools" -a "import" -d "Import entry to repository"
complete -c ais -n "__fish_seen_subcommand_from opencode; and not __fish_seen_subcommand_from install import agents skills commands tools" -a "agents" -d "Manage OpenCode agents"
complete -c ais -n "__fish_seen_subcommand_from opencode; and not __fish_seen_subcommand_from install import agents skills commands tools" -a "skills" -d "Manage OpenCode skills"
complete -c ais -n "__fish_seen_subcommand_from opencode; and not __fish_seen_subcommand_from install import agents skills commands tools" -a "commands" -d "Manage OpenCode commands"
complete -c ais -n "__fish_seen_subcommand_from opencode; and not __fish_seen_subcommand_from install import agents skills commands tools" -a "tools" -d "Manage OpenCode tools"

# opencode agents subcommands
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add an OpenCode agent"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove an OpenCode agent"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all OpenCode agents"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import agent to repository"

# opencode skills subcommands
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add an OpenCode skill"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove an OpenCode skill"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all OpenCode skills"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# opencode commands subcommands
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add an OpenCode command"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove an OpenCode command"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all OpenCode commands"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import command to repository"

# opencode tools subcommands
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from tools; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add an OpenCode tool"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from tools; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove an OpenCode tool"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from tools; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all OpenCode tools"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from tools; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import tool to repository"

# codex subcommands
complete -c ais -n "__fish_seen_subcommand_from codex; and not __fish_seen_subcommand_from install import rules skills" -a "install" -d "Install all Codex entries"
complete -c ais -n "__fish_seen_subcommand_from codex; and not __fish_seen_subcommand_from install import rules skills" -a "import" -d "Import entry to repository"
complete -c ais -n "__fish_seen_subcommand_from codex; and not __fish_seen_subcommand_from install import rules skills" -a "rules" -d "Manage Codex rules"
complete -c ais -n "__fish_seen_subcommand_from codex; and not __fish_seen_subcommand_from install import rules skills" -a "skills" -d "Manage Codex skills"

# codex rules subcommands
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Codex rule"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Codex rule"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Codex rules"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from rules; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import rule to repository"

# codex skills subcommands
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Codex skill"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Codex skill"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Codex skills"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# gemini subcommands
complete -c ais -n "__fish_seen_subcommand_from gemini; and not __fish_seen_subcommand_from install add-all import commands skills agents" -a "install" -d "Install all Gemini entries"
complete -c ais -n "__fish_seen_subcommand_from gemini; and not __fish_seen_subcommand_from install add-all import commands skills agents" -a "add-all" -d "Add all Gemini entries"
complete -c ais -n "__fish_seen_subcommand_from gemini; and not __fish_seen_subcommand_from install add-all import commands skills agents" -a "import" -d "Import entry to repository"
complete -c ais -n "__fish_seen_subcommand_from gemini; and not __fish_seen_subcommand_from install add-all import commands skills agents" -a "commands" -d "Manage Gemini commands"
complete -c ais -n "__fish_seen_subcommand_from gemini; and not __fish_seen_subcommand_from install add-all import commands skills agents" -a "skills" -d "Manage Gemini skills"
complete -c ais -n "__fish_seen_subcommand_from gemini; and not __fish_seen_subcommand_from install add-all import commands skills agents" -a "agents" -d "Manage Gemini agents"

# gemini commands subcommands
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Gemini command"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Gemini command"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Gemini commands"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from commands; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import command to repository"

# gemini skills subcommands
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Gemini skill"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Gemini skill"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Gemini skills"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# gemini agents subcommands
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Gemini agent"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Gemini agent"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Gemini agents"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from agents; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import agent to repository"

# warp subcommands
complete -c ais -n "__fish_seen_subcommand_from warp; and not __fish_seen_subcommand_from install import skills" -a "skills" -d "Manage Warp skills"
complete -c ais -n "__fish_seen_subcommand_from warp; and not __fish_seen_subcommand_from install import skills" -a "install" -d "Install all Warp entries"
complete -c ais -n "__fish_seen_subcommand_from warp; and not __fish_seen_subcommand_from install import skills" -a "import" -d "Import entry to repository"

# warp skills subcommands
complete -c ais -n "__fish_seen_subcommand_from warp; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add a Warp skill"
complete -c ais -n "__fish_seen_subcommand_from warp; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove a Warp skill"
complete -c ais -n "__fish_seen_subcommand_from warp; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install all Warp skills"
complete -c ais -n "__fish_seen_subcommand_from warp; and __fish_seen_subcommand_from skills; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import skill to repository"

# agents-md subcommands
complete -c ais -n "__fish_seen_subcommand_from agents-md; and not __fish_seen_subcommand_from add remove install import" -a "add" -d "Add an AGENTS.md file"
complete -c ais -n "__fish_seen_subcommand_from agents-md; and not __fish_seen_subcommand_from add remove install import" -a "remove" -d "Remove an AGENTS.md file"
complete -c ais -n "__fish_seen_subcommand_from agents-md; and not __fish_seen_subcommand_from add remove install import" -a "install" -d "Install AGENTS.md"
complete -c ais -n "__fish_seen_subcommand_from agents-md; and not __fish_seen_subcommand_from add remove install import" -a "import" -d "Import AGENTS.md to repository"

complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from add" -a "(ais _complete cursor 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from rules; and __fish_seen_subcommand_from add" -a "(ais _complete cursor 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from commands; and __fish_seen_subcommand_from add" -a "(ais _complete cursor-commands 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete cursor-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from cursor; and __fish_seen_subcommand_from agents; and __fish_seen_subcommand_from add" -a "(ais _complete cursor-agents 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from instructions; and __fish_seen_subcommand_from add" -a "(ais _complete copilot-instructions 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from copilot; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete copilot-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete claude-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from claude; and __fish_seen_subcommand_from agents; and __fish_seen_subcommand_from add" -a "(ais _complete claude-agents 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from rules; and __fish_seen_subcommand_from add" -a "(ais _complete trae-rules 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from trae; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete trae-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from agents; and __fish_seen_subcommand_from add" -a "(ais _complete opencode-agents 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete opencode-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from commands; and __fish_seen_subcommand_from add" -a "(ais _complete opencode-commands 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from opencode; and __fish_seen_subcommand_from tools; and __fish_seen_subcommand_from add" -a "(ais _complete opencode-tools 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from rules; and __fish_seen_subcommand_from add" -a "(ais _complete codex-rules 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from codex; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete codex-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from commands; and __fish_seen_subcommand_from add" -a "(ais _complete gemini-commands 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete gemini-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from gemini; and __fish_seen_subcommand_from agents; and __fish_seen_subcommand_from add" -a "(ais _complete gemini-agents 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from warp; and __fish_seen_subcommand_from skills; and __fish_seen_subcommand_from add" -a "(ais _complete warp-skills 2>/dev/null)"
complete -c ais -n "__fish_seen_subcommand_from agents-md; and __fish_seen_subcommand_from add" -a "(ais _complete agents-md 2>/dev/null)"
`;

/**
 * Get the completion script for a shell
 */
export function getCompletionScript(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'bash':
      return bashScript.trim();
    case 'zsh':
      return zshScript.trim();
    case 'fish':
      return fishScript.trim();
    default:
      throw new Error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
  }
}
