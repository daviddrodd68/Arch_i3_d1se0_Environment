# Luke's config for the Zoomer Shell

# Enable colors and change prompt:
autoload -U colors && colors	# Load colors
PS1="%B%{$fg[red]%}[%{$fg[yellow]%}%n%{$fg[green]%}@%{$fg[blue]%}%M %{$fg[magenta]%}%~%{$fg[red]%}]%{$reset_color%}$%b "
setopt autocd		# Automatically cd into typed directory.
stty stop undef		# Disable ctrl-s to freeze terminal.
setopt interactive_comments

# History in cache directory:
HISTSIZE=10000000
SAVEHIST=10000000
HISTFILE="${XDG_CACHE_HOME:-$HOME/.cache}/zsh/history"
setopt inc_append_history

# Load aliases and shortcuts if existent.
[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/shell/shortcutrc" ] && source "${XDG_CONFIG_HOME:-$HOME/.config}/shell/shortcutrc"
[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/shell/shortcutenvrc" ] && source "${XDG_CONFIG_HOME:-$HOME/.config}/shell/shortcutenvrc"
[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/shell/aliasrc" ] && source "${XDG_CONFIG_HOME:-$HOME/.config}/shell/aliasrc"
[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/shell/zshnameddirrc" ] && source "${XDG_CONFIG_HOME:-$HOME/.config}/shell/zshnameddirrc"

# Basic auto/tab complete:
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
_comp_options+=(globdots)		# Include hidden files.

# vi mode
bindkey -v
export KEYTIMEOUT=1

# --- Sudo-aware completion: solo si el usuario tiene (ALL : ALL) ALL ---
# No pide contraseña al iniciar: usa -n (non-interactive).
# Si no hay timestamp de sudo, no activa (se quedará normal).

_enable_priv_completion_if_all() {
  # Si sudo no existe, fuera
  command -v sudo >/dev/null 2>&1 || return 0

  # Si "sudo -n -l" funciona, leemos permisos sin pedir contraseña
  local out
  out="$(sudo -n -l 2>/dev/null)" || return 0

  # Detecta el caso típico de ALL en sudoers
  if echo "$out" | grep -Eq '^\s*\(ALL(:ALL)?\)\s+ALL'; then
    zstyle ':completion:*' gain-privileges 1
    # Opcional: también ayuda a completar comandos en /sbin, etc.
    zstyle ':completion:*:sudo:*' command-path /usr/sbin /usr/bin /sbin /bin
  fi
}

_enable_priv_completion_if_all
unset -f _enable_priv_completion_if_all

# ----------------------------
# Fix Alt+Backspace in vi-mode
# ----------------------------

# En modo INSERT (viins)
bindkey -M viins '^[^?' backward-kill-word
bindkey -M viins '^[\x7f' backward-kill-word

# Hacer separador de palabras
WORDCHARS=${WORDCHARS//[\/._-]}

# Ctrl+Backspace → borrar palabra
bindkey '^H' backward-kill-word
bindkey '^?' backward-kill-word

bindkey '^[[1;5D' backward-word   # Ctrl+Left
bindkey '^[[1;5C' forward-word    # Ctrl+Right

# Use vim keys in tab complete menu:
bindkey -M menuselect 'h' vi-backward-char
bindkey -M menuselect 'k' vi-up-line-or-history
bindkey -M menuselect 'l' vi-forward-char
bindkey -M menuselect 'j' vi-down-line-or-history
bindkey -v '^?' backward-delete-char

# Change cursor shape for different vi modes.
function zle-keymap-select () {
    case $KEYMAP in
        vicmd) echo -ne '\e[1 q';;      # block
        viins|main) echo -ne '\e[5 q';; # beam
    esac
}
zle -N zle-keymap-select
zle-line-init() {
    zle -K viins # initiate `vi insert` as keymap (can be removed if `bindkey -V` has been set elsewhere)
    echo -ne "\e[5 q"
}
zle -N zle-line-init
echo -ne '\e[5 q' # Use beam shape cursor on startup.
preexec() { echo -ne '\e[5 q' ;} # Use beam shape cursor for each new prompt.

# Use lf to switch directories and bind it to ctrl-o
lfcd () {
    tmp="$(mktemp -uq)"
    trap 'rm -f $tmp >/dev/null 2>&1 && trap - HUP INT QUIT TERM PWR EXIT' HUP INT QUIT TERM PWR EXIT
    lf -last-dir-path="$tmp" "$@"
    if [ -f "$tmp" ]; then
        dir="$(cat "$tmp")"
        [ -d "$dir" ] && [ "$dir" != "$(pwd)" ] && cd "$dir"
    fi
}
bindkey -s '^o' '^ulfcd\n'

bindkey -s '^a' '^ubc -lq\n'

bindkey -s '^f' '^ucd "$(dirname "$(fzf)")"\n'

bindkey '^[[P' delete-char

# Edit line in vim with ctrl-e:
autoload edit-command-line; zle -N edit-command-line
bindkey '^e' edit-command-line
bindkey -M vicmd '^[[P' vi-delete-char
bindkey -M vicmd '^e' edit-command-line
bindkey -M visual '^[[P' vi-delete

# Load syntax highlighting; should be last.
source /usr/share/zsh/plugins/fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh 2>/dev/null

# ----------------------------
# Oh My Posh (prompt)
# ----------------------------
export POSH_THEME="$HOME/.config/ohmyposh/EDM115-newline.omp.json"
eval "$(oh-my-posh init zsh --config $POSH_THEME)"

##### 1️⃣ WAL COLORS (primero de todo)
if [ -f "$HOME/.cache/wal/colors.sh" ]; then
  source "$HOME/.cache/wal/colors.sh"
fi

##### 2️⃣ PLUGINS (syntax + autosuggest)
# ---------- Autosuggestions (historial en gris) ----------
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh

# ---------- Syntax Highlighting ----------
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

##### 3️⃣ TUS COLORES (AQUÍ VA LO QUE PREGUNTAS)
# --------- Syntax highlighting (HIGH VISIBILITY) ---------

ZSH_HIGHLIGHT_STYLES[command]="fg=$color4"
ZSH_HIGHLIGHT_STYLES[builtin]="fg=$color4"
ZSH_HIGHLIGHT_STYLES[reserved-word]="fg=$color4"

ZSH_HIGHLIGHT_STYLES[option]="fg=$color2"
ZSH_HIGHLIGHT_STYLES[argument]="fg=$color7"

ZSH_HIGHLIGHT_STYLES[path]="fg=$color6,underline"
ZSH_HIGHLIGHT_STYLES[string]="fg=$color5"

ZSH_HIGHLIGHT_STYLES[variable]="fg=$color6"
ZSH_HIGHLIGHT_STYLES[comment]="fg=$color8"

ZSH_HIGHLIGHT_STYLES[unknown-token]="fg=$color1"


##### 4️⃣ AUTOSUGGEST COLOR
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=$color8"
